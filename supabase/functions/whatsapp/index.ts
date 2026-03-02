import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import type {
  WhatsAppWebhookRequest,
  WhatsAppSendRequest,
} from "../../../src/types/whatsapp.types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_WHISPER_API_URL = "https://api.openai.com/v1/audio/translations";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface TemplateField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface UserTemplate {
  id: string;
  user_id: string;
  name: string;
  fields: TemplateField[];
}

function getWhatsAppConfig() {
  return {
    accessToken: Deno.env.get("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: Deno.env.get("WHATSAPP_API_VERSION") || "v24.0",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY"),
    templateName:
      Deno.env.get("WHATSAPP_TRANSCRIPT_TEMPLATE_NAME") ||
      "sales_report_transcript",
  };
}

async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) {
    console.warn("⚠️ No X-Hub-Signature-256 header found");
    return false;
  }

  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) {
    console.warn(
      "WHATSAPP_APP_SECRET not configured - skipping signature verification",
    );
    return true;
  }

  try {
    const signatureHash = signature.split("=")[1];

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );

    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const isValid = signatureHash === expectedHash;
    if (!isValid) {
      console.error("Invalid webhook signature");
    }
    return isValid;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  return phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
}

// Helper function to extract fields from transcript using GPT
async function extractFieldsWithGPT(
  transcript: string,
  templateFields: TemplateField[],
  openaiApiKey: string,
): Promise<Record<string, any> | null> {
  try {
    const fieldsDescription = templateFields
      .map(
        (field) =>
          `- ${field.name || (field as any).key || (field as any).id || "field"} (${field.type}${field.required ? ", required" : ", optional"})`,
      )
      .join("\n");

    const systemPrompt = `You are a helpful assistant that extracts structured data from voice transcripts. 
Given a transcript and a list of template fields, extract the relevant information and fill in the template fields.
Return ONLY a valid JSON object with field names as keys and extracted values as values.

IMPORTANT: For fields marked as "required":
- If the information is clearly present in the transcript, extract it accurately
- If the information is NOT in the transcript or unclear, return null for that field

For fields marked as "optional":
- Extract the value if present
- Return null if not present or unclear

Be accurate and only extract information that is clearly stated in the transcript.`;

    const userPrompt = `Transcript:
${transcript}

Template Fields:
${fieldsDescription}

Extract and fill all template fields from the transcript. Return a JSON object with field names as keys.`;

    const gptResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_GPT_MODEL") || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("GPT API error:", errorText);
      return null;
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in GPT response");
      return null;
    }

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response:", content);
      return null;
    }
  } catch (error) {
    console.error("Error calling GPT API:", error);
    return null;
  }
}

// Helper function to identify missing required fields
function identifyMissingRequiredFields(
  filledData: Record<string, any>,
  templateFields: TemplateField[],
): TemplateField[] {
  const missingFields: TemplateField[] = [];

  for (const field of templateFields) {
    if (field.required) {
      const value = filledData[field.name];
      // Check if value is null, undefined, empty string, or empty array
      if (
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        missingFields.push(field);
      }
    }
  }

  return missingFields;
}

// Helper function to build field collection message
function buildFieldPromptMessage(field: TemplateField): string {
  const label = field.label || (field as any).title || field.name || (field as any).key || "this field";
  return `I need some more information. Please provide: ${label}`;
}

// Helper function to check if response is valid (not empty/unclear)
function isValidFieldResponse(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const unclearResponses = [
    "i don't know",
    "not sure",
    "unclear",
    "skip",
    "pass",
    "...",
    "???",
    "n/a",
    "na",
    "none",
  ];

  const lowerText = text.toLowerCase().trim();
  return !unclearResponses.some((response) => lowerText.includes(response));
}

// Helper function to merge GPT extracted data with collected data
function mergeFieldData(
  gptData: Record<string, any>,
  collectedData: Record<string, any>,
): Record<string, any> {
  return { ...gptData, ...collectedData };
}

// Helper function to build confirmation message
function buildConfirmationMessage(
  filledData: Record<string, any>,
  templateFields: TemplateField[],
): string {
  let message = "Perfect! I've collected all the information. Here's your report:\n\n";

  for (const field of templateFields) {
    const name = field.name || (field as any).key || (field as any).id || "";
    if (!name) continue;

    let value = filledData[name];
    if (value === undefined || value === null) {
      const capitalizedKey = name.charAt(0).toUpperCase() + name.slice(1);
      value = filledData[capitalizedKey];
    }

    const displayValue = value !== null && value !== undefined && value !== ""
      ? String(value)
      : "(not provided)";

    const label = field.label || (field as any).title || name || "Field";
    message += `${label}: ${displayValue}\n`;
  }

  message += "\nIs this correct?";
  return message;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    const url = new URL(req.url);

    const isWebhookVerification =
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token");
    const isWhatsAppWebhook = req.method === "POST";

    if (!isWebhookVerification && !isWhatsAppWebhook && !authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders },
      );
    }

    if (req.method === "GET" && isWebhookVerification) {
      const verifyToken =
        Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "whatsapp_verify_token";
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === verifyToken) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      } else {
        return new Response(JSON.stringify({ error: "Verification failed" }), {
          status: 403,
          headers: corsHeaders,
        });
      }
    }

    if (req.method === "POST" && !authHeader) {
      const rawBody = await req.text();
      const signature = req.headers.get("X-Hub-Signature-256");
      const isValidSignature = await verifyWebhookSignature(rawBody, signature);

      if (!isValidSignature && Deno.env.get("WHATSAPP_APP_SECRET")) {
        console.error("Webhook signature verification failed");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const body: WhatsAppWebhookRequest = JSON.parse(rawBody);
      console.log("-----------------------------------------");
      console.log("NEW WEBHOOK RECEIVED");
      console.log("Event Type:", body.object);
      console.log("Payload:", JSON.stringify(body, null, 2));
      console.log("-----------------------------------------");

      if (body.object === "whatsapp_business_account") {
        const {
          accessToken,
          phoneNumberId,
          apiVersion,
          openaiApiKey,
          templateName,
        } = getWhatsAppConfig();

        if (!accessToken || !phoneNumberId) {
          console.error("ERROR: WhatsApp credentials not configured");
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders,
          });
        }

        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const value = change.value;

            if (value.statuses) {
              console.log("Ignoring status update");
              continue;
            }

            if (value.messages) {
              for (const message of value.messages) {
                const from = message.from;
                const messageId = message.id;
                const timestamp = message.timestamp;
                const messageType = message.type;

                console.log(`MESSAGE RECEIVED from ${from}`);
                console.log(`Type: ${messageType}`);
                console.log(`Message ID: ${messageId}`);
                if (message.text?.body)
                  console.log(`Content: "${message.text.body}"`);

                const supabaseUrl = Deno.env.get("SUPABASE_URL");
                const serviceRoleKey = Deno.env.get(
                  "SUPABASE_SERVICE_ROLE_KEY",
                );
                let userId: string | null = null;
                let effectiveManagerId: string | null = null;
                let userName: string | null = null;

                if (!supabaseUrl || !serviceRoleKey) {
                  console.error("FATAL: Supabase credentials missing");
                  continue;
                }

                const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                  auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                  },
                });

                if (true) {
                  const cleanPhone = from.replace(/\D/g, "");
                  const { data: phoneMapping } = await adminClient
                    .from("phone_number_mappings")
                    .select("user_id")
                    .or(
                      `phone_number.eq."${cleanPhone}",phone_number.eq."+${cleanPhone}"`,
                    )
                    .maybeSingle();

                  userId = phoneMapping?.user_id || null;

                  if (!userId) {
                    const { data: profileByPhone } = await adminClient
                      .from("profiles")
                      .select("id, full_name")
                      .or(
                        `phone_number.eq."${cleanPhone}",phone_number.eq."+${cleanPhone}"`,
                      )
                      .maybeSingle();

                    if (profileByPhone) {
                      console.log(
                        `Found user in profiles table: ${profileByPhone.id}`,
                      );
                      userId = profileByPhone.id;
                      userName = profileByPhone.full_name;
                    }
                  }

                  if (!userId) {
                    console.error(
                      "No user mapping found for phone number:",
                      from,
                    );
                    if (
                      messageType !== "reaction" &&
                      accessToken &&
                      phoneNumberId
                    ) {
                      const notRegisteredPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizePhoneNumber(from),
                        type: "text",
                        text: {
                          body: "This phone number is not registered in our system. Please ask your manager to invite you or add your number in the portal.",
                        },
                      };
                      try {
                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(notRegisteredPayload),
                          },
                        );
                      } catch (err) {
                        console.error(
                          "Failed to send Not Registered reply:",
                          err,
                        );
                      }
                    }
                    continue;
                  }

                  const { data: profile } = await adminClient
                    .from("profiles")
                    .select("id, manager_id, role, full_name, template_id")
                    .eq("id", userId)
                    .single();

                  if (profile) {
                    userName = profile.full_name;
                  }

                  effectiveManagerId = userId;
                  if (
                    profile &&
                    profile.role !== "manager" &&
                    profile.manager_id
                  ) {
                    effectiveManagerId = profile.manager_id;
                  }

                  const { data: subscription } = await adminClient
                    .from("subscriptions")
                    .select("status")
                    .eq("user_id", effectiveManagerId)
                    .in("status", ["active", "trialing"])
                    .maybeSingle();

                  if (!subscription) {
                    console.error(
                      `Manager (${effectiveManagerId}) has no active subscription.`,
                    );
                    if (
                      messageType !== "reaction" &&
                      accessToken &&
                      phoneNumberId
                    ) {
                      const subErrorPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizePhoneNumber(from),
                        type: "text",
                        text: {
                          body: "The subscription for your manager's account is inactive or expired. Please renew the subscription to continue identifying transcripts.",
                        },
                      };
                      try {
                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(subErrorPayload),
                          },
                        );
                      } catch (err) {
                        console.error(
                          "Failed to send Subscription Error reply:",
                          err,
                        );
                      }
                    }
                    continue;
                  }

                  // Handle text messages for field collection
                  if (messageType === "text") {
                    const textBody = message.text?.body || "";
                    console.log("Received text message:", textBody);

                    // Check if user has an active conversation in collecting_fields state
                    const { data: activeTranscript } = await adminClient
                      .from("voice_transcripts")
                      .select("*")
                      .eq("phone_number", from)
                      .eq("conversation_state", "collecting_fields")
                      .order("created_at", { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    if (activeTranscript) {
                      console.log(
                        "Found active conversation in collecting_fields state:",
                        activeTranscript.id,
                      );

                      // Get the template
                      let { data: template } = await adminClient
                        .from("user_templates")
                        .select("*")
                        .eq("id", activeTranscript.template_id)
                        .single();

                      if (!template) {
                        if (!activeTranscript.template_id) {
                          template = {
                            id: null as any,
                            user_id: effectiveManagerId as any,
                            name: "Standard Sales Report",
                            fields: [
                              {
                                name: "Summary",
                                label: "Summary",
                                type: "textarea",
                                required: true,
                              },
                            ],
                          };
                        } else {
                          console.error(
                            `Template not found for transcript ${activeTranscript.id} (template_id: ${activeTranscript.template_id}). Resetting conversation.`,
                          );

                          await adminClient
                            .from("voice_transcripts")
                            .update({
                              conversation_state: "error",
                              status: "error",
                            })
                            .eq("id", activeTranscript.id);
                        }
                      }

                      const missingFields: TemplateField[] =
                        activeTranscript.missing_required_fields || [];
                      const currentIndex =
                        activeTranscript.current_field_index || 0;

                      if (currentIndex < missingFields.length) {
                        const currentField = missingFields[currentIndex];

                        // Check if response is valid
                        if (!isValidFieldResponse(textBody)) {
                          console.log("Invalid field response, re-asking");
                          const label = currentField.label || (currentField as any).title || currentField.name || (currentField as any).key || "this field";
                          const reaskPayload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: normalizePhoneNumber(from),
                            type: "text",
                            text: {
                              body: `I didn't catch that. Please provide ${label} again.`,
                            },
                          };
                          await fetch(
                            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                            {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(reaskPayload),
                            },
                          );
                          continue;
                        }

                        // Store the collected data
                        const collectedData =
                          activeTranscript.collected_data || {};
                        collectedData[currentField.name] = textBody.trim();

                        const nextIndex = currentIndex + 1;

                        if (nextIndex < missingFields.length) {
                          // Ask for next field
                          const nextField = missingFields[nextIndex];
                          const nextPrompt = buildFieldPromptMessage(nextField);

                          await adminClient
                            .from("voice_transcripts")
                            .update({
                              collected_data: collectedData,
                              current_field_index: nextIndex,
                            })
                            .eq("id", activeTranscript.id);

                          const promptPayload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: normalizePhoneNumber(from),
                            type: "text",
                            text: {
                              body: `Thank you! ${nextPrompt}`,
                            },
                          };
                          await fetch(
                            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                            {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(promptPayload),
                            },
                          );
                        } else {
                          // All fields collected, merge data and send confirmation
                          const gptData = activeTranscript.filled_data || {};
                          const mergedData = mergeFieldData(gptData, collectedData);

                          await adminClient
                            .from("voice_transcripts")
                            .update({
                              conversation_state: "awaiting_confirmation",
                              collected_data: collectedData,
                              filled_data: mergedData,
                              current_field_index: nextIndex,
                            })
                            .eq("id", activeTranscript.id);

                          // Build confirmation message
                          const confirmationMessage = buildConfirmationMessage(
                            mergedData,
                            template.fields,
                          );

                          const interactivePayload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: normalizePhoneNumber(from),
                            type: "interactive",
                            interactive: {
                              type: "button",
                              body: {
                                text: confirmationMessage,
                              },
                              action: {
                                buttons: [
                                  {
                                    type: "reply",
                                    reply: {
                                      id: "Confirm",
                                      title: "Confirm",
                                    },
                                  },
                                  {
                                    type: "reply",
                                    reply: {
                                      id: "Retake",
                                      title: "Retake",
                                    },
                                  },
                                ],
                              },
                            },
                          };

                          await fetch(
                            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                            {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(interactivePayload),
                            },
                          );

                          console.log(
                            "All fields collected, sent confirmation message",
                          );
                        }
                        continue;
                      }
                    }

                    // No active field collection, send default message
                    if (accessToken && phoneNumberId) {
                      try {
                        const responsePayload = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: normalizePhoneNumber(from),
                          type: "text",
                          text: {
                            body: `👋 Hi! I received your message: "${textBody}".\n\nI am currently configured to process voice messages. Please send me a voice note to test transcription! 🎤`,
                          },
                        };

                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(responsePayload),
                          },
                        );
                      } catch (error) {
                        console.error("Error sending text reply:", error);
                      }
                    }
                    continue;
                  }

                  // Handle voice messages
                  if (messageType === "audio" || messageType === "voice") {
                    console.log("🎙️ Processing voice message...");
                    const audioId = message.audio?.id || message.voice?.id;
                    const mimeType =
                      message.audio?.mime_type ||
                      message.voice?.mime_type ||
                      "audio/ogg";

                    if (audioId && openaiApiKey) {
                      try {
                        const mediaUrl = `https://graph.facebook.com/${apiVersion}/${audioId}`;
                        const mediaResponse = await fetch(mediaUrl, {
                          headers: {
                            Authorization: `Bearer ${accessToken}`,
                          },
                        });

                        if (!mediaResponse.ok) {
                          const errorText = await mediaResponse.text();
                          console.error("Failed to get media URL:", errorText);
                          continue;
                        }

                        const mediaData = await mediaResponse.json();
                        const downloadUrl = mediaData.url;

                        if (!downloadUrl) {
                          console.error(
                            "No download URL in media response:",
                            mediaData,
                          );
                          continue;
                        }

                        const audioResponse = await fetch(downloadUrl, {
                          headers: {
                            Authorization: `Bearer ${accessToken}`,
                          },
                        });

                        if (!audioResponse.ok) {
                          const errorText = await audioResponse.text();
                          console.error(
                            "Failed to download audio file:",
                            errorText,
                          );
                          continue;
                        }

                        const audioBlob = await audioResponse.blob();
                        const audioBuffer = await audioBlob.arrayBuffer();

                        const formData = new FormData();
                        let fileExtension = "ogg";
                        if (
                          mimeType.includes("mpeg") ||
                          mimeType.includes("mp3")
                        ) {
                          fileExtension = "mp3";
                        } else if (mimeType.includes("wav")) {
                          fileExtension = "wav";
                        } else if (mimeType.includes("webm")) {
                          fileExtension = "webm";
                        }

                        const audioFile = new Blob([audioBuffer], {
                          type: mimeType,
                        });
                        formData.append(
                          "file",
                          audioFile,
                          `audio.${fileExtension}`,
                        );
                        formData.append("model", "whisper-1");
                        formData.append("prompt", "Professional English transcription of a sales visit report. Maintain business terminology and professional tone.");
                        formData.append("response_format", "verbose_json");

                        const whisperResponse = await fetch(
                          OPENAI_WHISPER_API_URL,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${openaiApiKey}`,
                            },
                            body: formData,
                          },
                        );

                        if (!whisperResponse.ok) {
                          const errorText = await whisperResponse.text();
                          console.error("Whisper API error:", errorText);
                          continue;
                        }

                        const transcriptionResult =
                          await whisperResponse.json();
                        let transcript = transcriptionResult.text;

                        // Upload audio to Supabase Storage
                        let audioUrl: string | null = null;
                        try {
                          const fileName = `${userId || 'anonymous'}/${Date.now()}.${fileExtension}`;
                          console.log(`Uploading audio to storage: audio-transcripts/${fileName} (${mimeType}, ${audioBuffer.byteLength} bytes)`);

                          const { data: buckets } = await adminClient.storage.listBuckets();
                          const bucketExists = buckets?.some((b: any) => b.name === 'audio-transcripts');
                          
                          if (!bucketExists) {
                            console.log("Creating audio-transcripts bucket...");
                            const { error: createBucketError } = await adminClient.storage.createBucket('audio-transcripts', { 
                              public: true,
                              fileSizeLimit: 52428800
                            });
                            if (createBucketError) {
                              console.error("Failed to create bucket:", createBucketError);
                            } else {
                              console.log("Successfully created audio-transcripts bucket");
                            }
                          }

                          const { data: uploadData, error: uploadError } = await adminClient
                            .storage
                            .from('audio-transcripts')
                            .upload(fileName, audioBuffer, {
                              contentType: mimeType,
                              upsert: true
                            });

                          if (uploadError) {
                            console.error("Storage upload error:", JSON.stringify(uploadError));
                          } else {
                            const { data: urlData } = adminClient
                              .storage
                              .from('audio-transcripts')
                              .getPublicUrl(fileName);
                            audioUrl = urlData?.publicUrl || null;
                            console.log("Audio uploaded successfully. Public URL:", audioUrl);
                          }
                        } catch (storageErr) {
                          console.error("Error managing audio storage:", storageErr);
                        }

                        if (!audioUrl) {
                          console.warn("⚠️ Audio URL is null - audio will not be playable for this transcript");
                        }

                        if (!transcript || transcript.trim().length === 0) {
                          console.warn(
                            "Empty transcript received from Whisper API",
                          );
                          transcript =
                            "Sorry, I couldn't transcribe the audio. Please try again.";
                        }

                        console.log("Transcription result:", transcript);

                        const maxLength = 4000;
                        if (transcript.length > maxLength) {
                          transcript =
                            transcript.substring(0, maxLength) +
                            "...\n\n[Transcript truncated due to length]";
                        }

                        if (!from || !from.match(/^\+?[1-9]\d{1,14}$/)) {
                          console.error("Invalid phone number format:", from);
                          continue;
                        }

                        if (!accessToken || !phoneNumberId) {
                          console.error(
                            "Missing WhatsApp credentials when trying to send transcript",
                          );
                          continue;
                        }

                        console.log(
                          `User verified: ${userId}, Manager: ${effectiveManagerId}`,
                        );

                        // Check if there's an ongoing conversation in collecting_fields state
                        const { data: ongoingConversation } = await adminClient
                          .from("voice_transcripts")
                          .select("*")
                          .eq("phone_number", from)
                          .eq("conversation_state", "collecting_fields")
                          .order("created_at", { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        if (ongoingConversation) {
                          console.log(
                            "Found ongoing conversation, merging transcripts",
                            ongoingConversation.id,
                          );

                          // Get the template
                          let { data: template } = await adminClient
                            .from("user_templates")
                            .select("*")
                            .eq("id", ongoingConversation.template_id)
                            .single();

                          if (!template) {
                            if (!ongoingConversation.template_id) {
                              template = {
                                id: null as any,
                                user_id: effectiveManagerId as any,
                                name: "Standard Sales Report",
                                fields: [
                                  {
                                    name: "Summary",
                                    label: "Summary",
                                    type: "textarea",
                                    required: true,
                                  },
                                ],
                              };
                            } else {
                              console.error(
                                `Template not found for ongoing conversation ${ongoingConversation.id} (template_id: ${ongoingConversation.template_id}). Resetting conversation.`,
                              );

                              await adminClient
                                .from("voice_transcripts")
                                .update({
                                  conversation_state: "error",
                                  status: "error",
                                })
                                .eq("id", ongoingConversation.id);
                            }
                          }

                          if (template) {
                            // Merge transcripts
                            const mergedTranscript =
                              `${ongoingConversation.transcript}\n\n[Additional Voice Message]\n${transcript}`;

                            console.log("Merged transcript:", mergedTranscript);

                            // Re-extract fields from merged transcript
                            let filledData: Record<string, any> = {};
                            if (
                              openaiApiKey &&
                              template.fields &&
                              Array.isArray(template.fields)
                            ) {
                              filledData = await extractFieldsWithGPT(
                                mergedTranscript,
                                template.fields,
                                openaiApiKey,
                              ) || {};
                            }

                            console.log("Re-extracted fields after merge:", filledData);

                            // Merge with already collected data
                            const collectedData =
                              ongoingConversation.collected_data || {};
                            const mergedFilledData = {
                              ...filledData,
                              ...collectedData,
                            };

                            // Check if we still have missing required fields
                            const currentMissingFields =
                              identifyMissingRequiredFields(
                                mergedFilledData,
                                template.fields,
                              );

                            // Filter out fields already collected via text
                            const missingFields = currentMissingFields.filter(
                              (field) => !(field.name in collectedData),
                            );

                            console.log(
                              "Missing fields after merge:",
                              missingFields.map((f) => f.name),
                            );

                            // Update the existing record
                            if (missingFields.length === 0) {
                              // All fields collected, move to confirmation
                              await adminClient
                                .from("voice_transcripts")
                                .update({
                                  transcript: mergedTranscript,
                                  filled_data: mergedFilledData,
                                  conversation_state: "awaiting_confirmation",
                                  missing_required_fields: [],
                                  current_field_index: 0,
                                  audio_url: audioUrl,
                                })
                                .eq("id", ongoingConversation.id);

                              // Send confirmation message
                              const confirmationMessage = buildConfirmationMessage(
                                mergedFilledData,
                                template.fields,
                              );

                              const interactivePayload = {
                                messaging_product: "whatsapp",
                                recipient_type: "individual",
                                to: normalizePhoneNumber(from),
                                type: "interactive",
                                interactive: {
                                  type: "button",
                                  body: {
                                    text: confirmationMessage,
                                  },
                                  action: {
                                    buttons: [
                                      {
                                        type: "reply",
                                        reply: {
                                          id: "Confirm",
                                          title: "Confirm",
                                        },
                                      },
                                      {
                                        type: "reply",
                                        reply: {
                                          id: "Retake",
                                          title: "Retake",
                                        },
                                      },
                                    ],
                                  },
                                },
                              };

                              await fetch(
                                `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                                {
                                  method: "POST",
                                  headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify(interactivePayload),
                                },
                              );

                              console.log(
                                "All fields collected via voice merge, sent confirmation",
                              );
                            } else {
                              // Still missing fields, continue collection
                              const currentIndex =
                                ongoingConversation.current_field_index || 0;
                              const nextFieldIndex = Math.min(
                                currentIndex,
                                missingFields.length - 1,
                              );

                              await adminClient
                                .from("voice_transcripts")
                                .update({
                                  transcript: mergedTranscript,
                                  filled_data: mergedFilledData,
                                  missing_required_fields: missingFields,
                                  current_field_index: nextFieldIndex,
                                  audio_url: audioUrl, // Save latest audio URL
                                })
                                .eq("id", ongoingConversation.id);

                              // Ask for the current missing field
                              const currentField = missingFields[nextFieldIndex];
                              const promptMessage = buildFieldPromptMessage(
                                currentField,
                              );

                              const fieldPromptPayload = {
                                messaging_product: "whatsapp",
                                recipient_type: "individual",
                                to: normalizePhoneNumber(from),
                                type: "text",
                                text: {
                                  body: `✓ Additional voice message received!\n\n${promptMessage}`,
                                },
                              };

                              await fetch(
                                `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                                {
                                  method: "POST",
                                  headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify(fieldPromptPayload),
                                },
                              );

                              console.log(
                                "Still missing fields after voice merge, continuing collection",
                              );
                            }
                            continue;
                          }
                          // Template was not found — fall through to create a new transcript below
                        }

                        // No ongoing conversation - create new transcript record
                        // Get the user's assigned template or fall back to default
                        let activeTemplate: UserTemplate | null = null;

                        if (profile?.template_id) {
                          const { data: assignedTemplate } = await adminClient
                            .from("user_templates")
                            .select("*")
                            .eq("id", profile.template_id)
                            .single();
                          activeTemplate = assignedTemplate;
                        }

                        if (!activeTemplate) {
                          const { data: defaultTemplate } = await adminClient
                            .from("user_templates")
                            .select("*")
                            .eq("user_id", effectiveManagerId)
                            .eq("is_default", true)
                            .maybeSingle();
                          activeTemplate = defaultTemplate;
                        }

                        if (!activeTemplate) {
                          console.log(
                            "No template found for user. Using fallback template.",
                          );
                          activeTemplate = {
                            id: null as any,
                            user_id: effectiveManagerId as any,
                            name: "Standard Sales Report",
                            fields: [
                              {
                                name: "Summary",
                                label: "Summary",
                                type: "textarea",
                                required: true,
                              },
                            ],
                          };
                        } else {
                          console.log(
                            `Using template: ${activeTemplate.name} (${activeTemplate.id})`,
                          );
                        }

                        // Extract fields from transcript using GPT
                        let filledData: Record<string, any> = {};
                        if (
                          openaiApiKey &&
                          activeTemplate &&
                          activeTemplate.fields &&
                          Array.isArray(activeTemplate.fields)
                        ) {
                          filledData = await extractFieldsWithGPT(
                            transcript,
                            activeTemplate.fields,
                            openaiApiKey,
                          ) || {};
                        }

                        console.log("GPT extracted fields:", filledData);

                        // Identify missing required fields
                        const missingFields = identifyMissingRequiredFields(
                          filledData,
                          activeTemplate.fields,
                        );

                        console.log(
                          "Missing required fields:",
                          missingFields.map((f) => f.name),
                        );

                        // Store transcript with conversation state
                        let conversationState = "awaiting_confirmation";
                        let currentFieldIndex = 0;

                        if (missingFields.length > 0) {
                          conversationState = "collecting_fields";
                          currentFieldIndex = 0;
                        }

                        const { data: transcriptRecord, error: insertError } =
                          await adminClient
                            .from("voice_transcripts")
                            .insert({
                              phone_number: from,
                              transcript: transcript,
                              status: "pending",
                              user_id: userId,
                              template_id: activeTemplate.id,
                              filled_data: filledData,
                              conversation_state: conversationState,
                              missing_required_fields: missingFields,
                              collected_data: {},
                              current_field_index: currentFieldIndex,
                              audio_url: audioUrl,
                              audio_duration: transcriptionResult.duration
                                ? `${Math.floor(transcriptionResult.duration / 60)}:${String(Math.floor(transcriptionResult.duration % 60)).padStart(2, '0')}`
                                : null,
                            })
                            .select()
                            .single();

                        if (insertError) {
                          console.error(
                            "Failed to store transcript:",
                            insertError,
                          );
                        } else {
                          console.log(
                            "Transcript stored successfully with user_id:",
                            userId,
                          );
                        }

                        // Send appropriate response based on conversation state
                        if (conversationState === "collecting_fields") {
                          // Ask for first missing field
                          const firstField = missingFields[0];
                          const promptMessage = buildFieldPromptMessage(
                            firstField,
                          );

                          const fieldPromptPayload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: normalizePhoneNumber(from),
                            type: "text",
                            text: {
                              body: `✓ Transcript received!\n\n${promptMessage}`,
                            },
                          };

                          await fetch(
                            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                            {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(fieldPromptPayload),
                            },
                          );

                          console.log(
                            "Sent field collection prompt for:",
                            firstField.name,
                          );
                        } else {
                          // Send confirmation message directly
                          const confirmationMessage = buildConfirmationMessage(
                            filledData,
                            activeTemplate.fields,
                          );

                          const interactivePayload = {
                            messaging_product: "whatsapp",
                            recipient_type: "individual",
                            to: normalizePhoneNumber(from),
                            type: "interactive",
                            interactive: {
                              type: "button",
                              body: {
                                text: confirmationMessage,
                              },
                              action: {
                                buttons: [
                                  {
                                    type: "reply",
                                    reply: {
                                      id: "Confirm",
                                      title: "Confirm",
                                    },
                                  },
                                  {
                                    type: "reply",
                                    reply: {
                                      id: "Retake",
                                      title: "Retake",
                                    },
                                  },
                                ],
                              },
                            },
                          };

                          await fetch(
                            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                            {
                              method: "POST",
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(interactivePayload),
                            },
                          );

                          console.log(
                            "Sent confirmation message (no missing fields)",
                          );
                        }
                      } catch (error) {
                        console.error("Error processing audio message:", error);
                      }
                    } else {
                      console.warn(
                        "Audio message received but OpenAI API key not configured or audio ID missing",
                      );
                    }
                    continue;
                  }

                  // Handle interactive button responses
                  if (messageType === "interactive" || messageType === "button") {
                    const buttonText = (
                      message.interactive?.button_reply?.title ||
                      (message as any).button?.text ||
                      ""
                    ).toLowerCase();
                    const buttonId =
                      message.interactive?.button_reply?.id ||
                      (message as any).button?.payload ||
                      "";

                    console.log(
                      `Button clicked: ${buttonText} (ID: ${buttonId})`,
                    );

                    let action: "confirm" | "retake" | null = null;
                    if (
                      buttonId === "Confirm" ||
                      buttonText.includes("confirm")
                    ) {
                      action = "confirm";
                    } else if (
                      buttonId === "Retake" ||
                      buttonText.includes("retake")
                    ) {
                      action = "retake";
                    }

                    if (!action) {
                      console.log(
                        "Unknown button clicked:",
                        buttonText,
                        buttonId,
                      );
                      continue;
                    }

                    if (!accessToken || !phoneNumberId) {
                      console.error(
                        "WhatsApp credentials missing for interactive handler",
                      );
                      continue;
                    }

                    if (action === "confirm") {
                      try {
                        // Get the awaiting_confirmation transcript
                        const { data: transcriptRecord, error: transcriptError } =
                          await adminClient
                            .from("voice_transcripts")
                            .select("*")
                            .eq("phone_number", from)
                            .eq("conversation_state", "awaiting_confirmation")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (!transcriptRecord) {
                          // Fallback to pending status for backwards compatibility
                          const { data: pendingRecord } = await adminClient
                            .from("voice_transcripts")
                            .select("*")
                            .eq("phone_number", from)
                            .eq("status", "pending")
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                          if (!pendingRecord) {
                            console.error(
                              "No transcript found for confirmation",
                            );
                            const errorPayload = {
                              messaging_product: "whatsapp",
                              recipient_type: "individual",
                              to: normalizePhoneNumber(from),
                              type: "text",
                              text: {
                                body: "Sorry, I couldn't find your transcript. Please send a new voice message.",
                              },
                            };
                            await fetch(
                              `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                              {
                                method: "POST",
                                headers: {
                                  Authorization: `Bearer ${accessToken}`,
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(errorPayload),
                              },
                            );
                            continue;
                          }
                        }

                        const finalRecord = transcriptRecord;
                        let userId = finalRecord.user_id;

                        let effectiveManagerId = userId;
                        const { data: profile } = await adminClient
                          .from("profiles")
                          .select(
                            "id, manager_id, role, full_name, phone_number",
                          )
                          .eq("id", userId)
                          .single();

                        if (profile) {
                          userName = profile.full_name;
                        }

                        if (
                          profile &&
                          profile.role !== "manager" &&
                          profile.manager_id
                        ) {
                          effectiveManagerId = profile.manager_id;
                        }

                        // Get the template
                        const { data: template } = await adminClient
                          .from("user_templates")
                          .select("*")
                          .eq("id", finalRecord.template_id)
                          .maybeSingle();

                        const activeTemplate = template || {
                          id: null,
                          name: "Standard Sales Report",
                          fields: [
                            {
                              name: "Summary",
                              label: "Summary",
                              type: "textarea",
                              required: true,
                            },
                          ],
                        };

                        // Use the merged filled_data
                        const filledData = finalRecord.filled_data || {};

                        // Update transcript status
                        await adminClient
                          .from("voice_transcripts")
                          .update({
                            status: "confirmed",
                            conversation_state: "confirmed",
                          })
                          .eq("id", finalRecord.id);

                        console.log("Generating PDF...");
                        const pdfDoc = await PDFDocument.create();
                        const page = pdfDoc.addPage([612, 792]);
                        const font = await pdfDoc.embedFont(
                          StandardFonts.Helvetica,
                        );
                        const boldFont = await pdfDoc.embedFont(
                          StandardFonts.HelveticaBold,
                        );

                        let yPosition = 750;
                        const margin = 50;
                        const pageWidth = 612;
                        const pageHeight = 792;
                        const lineHeight = 20;
                        const sectionSpacing = 30;

                        const addText = (
                          text: string,
                          x: number,
                          y: number,
                          size: number,
                          fontType: any,
                          maxWidth?: number,
                          color?: any,
                        ) => {
                          const drawOptions: any = { x, size, font: fontType };
                          if (color) drawOptions.color = color;

                          let processedText = text.replace(/\n/g, " ").replace(/\r/g, "").replace(/\t/g, " ");

                          const ensureSafeText = (t: string) => {
                            try {
                              fontType.widthOfTextAtSize(t, size);
                              return t;
                            } catch (e) {
                              return t.replace(/[^\x20-\x7E\x80-\xFF]/g, "");
                            }
                          };

                          processedText = ensureSafeText(processedText);

                          if (maxWidth) {
                            const words = processedText.split(" ").filter(word => word.length > 0);
                            let line = "";
                            let currentY = y;
                            for (const word of words) {
                              const testLine = line + (line ? " " : "") + word;
                              try {
                                const width = fontType.widthOfTextAtSize(
                                  testLine,
                                  size,
                                );
                                if (width > maxWidth && line) {
                                  page.drawText(line, {
                                    ...drawOptions,
                                    y: currentY,
                                  });
                                  line = word;
                                  currentY -= lineHeight;
                                } else {
                                  line = testLine;
                                }
                              } catch (e) {
                                line = line + (line ? " " : "") + "[...]";
                              }
                            }
                            if (line) {
                              try {
                                page.drawText(line, {
                                  ...drawOptions,
                                  y: currentY,
                                });
                              } catch (e) {
                                console.error("Final line draw error:", e);
                              }
                              currentY -= lineHeight;
                            }
                            return currentY;
                          } else {
                            try {
                              page.drawText(processedText, { ...drawOptions, y });
                            } catch (e) {
                              const flatText = processedText.replace(/[^\x20-\x7E]/g, "?");
                              page.drawText(flatText, { ...drawOptions, y });
                            }
                            return y - lineHeight;
                          }
                        };

                        page.drawRectangle({
                          x: 0,
                          y: pageHeight - 100,
                          width: pageWidth,
                          height: 100,
                          color: rgb(0.1, 0.1, 0.1),
                        });

                        yPosition = pageHeight - 50;
                        addText(
                          "Sales Visit Report",
                          margin,
                          yPosition,
                          24,
                          boldFont,
                          undefined,
                          rgb(1, 1, 1),
                        );
                        yPosition -= 35;
                        const dateStr = new Date().toLocaleString();
                        addText(
                          `Generated: ${dateStr}`,
                          margin,
                          yPosition,
                          10,
                          font,
                          undefined,
                          rgb(0.8, 0.8, 0.8),
                        );

                        yPosition = pageHeight - 130;

                        yPosition = addText(
                          "Sales Representative Details",
                          margin,
                          yPosition,
                          14,
                          boldFont,
                          undefined,
                          rgb(0, 0, 0),
                        );
                        yPosition -= 15;

                        const repName = userName || "(Name not available)";
                        const repPhone =
                          profile?.phone_number || "(Phone not available)";

                        addText("Name:", margin, yPosition, 11, boldFont);
                        addText(repName, margin + 50, yPosition, 11, font);
                        yPosition -= 20;
                        addText("Phone:", margin, yPosition, 11, boldFont);
                        addText(repPhone, margin + 50, yPosition, 11, font);
                        yPosition -= sectionSpacing;

                        yPosition = addText(
                          `Template Used: ${activeTemplate.name}`,
                          margin,
                          yPosition,
                          12,
                          boldFont,
                        );
                        yPosition -= sectionSpacing;

                        // Add filled data section
                        if (filledData && Object.keys(filledData).length > 0) {
                          yPosition = addText(
                            "Report Details",
                            margin,
                            yPosition,
                            14,
                            boldFont,
                          );
                          page.drawLine({
                            start: { x: margin, y: yPosition + 5 },
                            end: { x: pageWidth - margin, y: yPosition + 5 },
                            thickness: 1,
                            color: rgb(0.8, 0.8, 0.8),
                          });
                          yPosition -= 15;

                          // Map field names to labels for display
                          const fieldLabelMap: Record<string, string> = {};
                          if (activeTemplate.fields) {
                            for (const field of activeTemplate.fields) {
                              const name = field.name || (field as any).key || (field as any).id || "";
                              const label = field.label || (field as any).title || name || "Field";
                              if (name) fieldLabelMap[name] = label;
                            }
                          }

                          for (const [key, value] of Object.entries(filledData)) {
                            const label = fieldLabelMap[key] ||
                              key.charAt(0).toUpperCase() +
                              key.slice(1).replace(/_/g, " ");
                            const valStr = value !== null &&
                              value !== undefined && String(value).trim() !== ""
                              ? String(value)
                              : "N/A";

                            yPosition = addText(
                              `${label}:`,
                              margin,
                              yPosition,
                              11,
                              boldFont,
                            );
                            yPosition = addText(
                              valStr,
                              margin + 20,
                              yPosition,
                              10,
                              font,
                              pageWidth - 2 * margin - 20,
                            );
                            yPosition -= 10;
                          }

                          yPosition -= sectionSpacing;
                        }

                        yPosition = addText(
                          "Transcript",
                          margin,
                          yPosition,
                          14,
                          boldFont,
                        );
                        page.drawLine({
                          start: { x: margin, y: yPosition + 5 },
                          end: { x: pageWidth - margin, y: yPosition + 5 },
                          thickness: 1,
                          color: rgb(0.8, 0.8, 0.8),
                        });
                        yPosition -= 15;

                        yPosition = addText(
                          finalRecord.transcript,
                          margin,
                          yPosition,
                          10,
                          font,
                          pageWidth - 2 * margin,
                        );

                        const pdfBytes = await pdfDoc.save();
                        const pdfBlob = new Blob([pdfBytes], {
                          type: "application/pdf",
                        });
                        const pdfFormData = new FormData();
                        pdfFormData.append("file", pdfBlob, "transcript.pdf");
                        pdfFormData.append("messaging_product", "whatsapp");

                        console.log("Uploading PDF to WhatsApp...");
                        const uploadResponse = await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                            },
                            body: pdfFormData,
                          },
                        );

                        const uploadResult = await uploadResponse.json();
                        if (!uploadResponse.ok) {
                          throw new Error(
                            `Media Upload Failed: ${JSON.stringify(uploadResult)}`,
                          );
                        }

                        const mediaId = uploadResult.id;
                        console.log(`PDF Uploaded. Media ID: ${mediaId}`);

                        const docPayload = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: normalizePhoneNumber(from),
                          type: "document",
                          document: {
                            id: mediaId,
                            caption:
                              "Here is your processed transcript report. 📄",
                            filename: "transcript_report.pdf",
                          },
                        };

                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(docPayload),
                          },
                        );

                        console.log(
                          "Transcript confirmed, PDF generated and sent:",
                          {
                            transcriptId: finalRecord.id,
                            userId,
                            phoneNumber: from,
                          },
                        );
                      } catch (error) {
                        console.error(
                          "Error processing confirm button:",
                          error,
                        );
                      }
                    } else if (action === "retake") {
                      try {
                        // Find transcript in awaiting_confirmation or collecting_fields state
                        const { data: transcriptRecord } = await adminClient
                          .from("voice_transcripts")
                          .select("id")
                          .eq("phone_number", from)
                          .in("conversation_state", [
                            "awaiting_confirmation",
                            "collecting_fields",
                          ])
                          .order("created_at", { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        if (transcriptRecord) {
                          await adminClient
                            .from("voice_transcripts")
                            .update({
                              status: "retaken",
                              conversation_state: "retaken",
                            })
                            .eq("id", transcriptRecord.id);
                        }

                        const retakePayload = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: normalizePhoneNumber(from),
                          type: "text",
                          text: {
                            body: "🔄 Please send a new voice message.",
                          },
                        };
                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(retakePayload),
                          },
                        );

                        console.log("User requested retake:", from);
                      } catch (error) {
                        console.error("Error processing retake button:", error);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Handle API requests with authorization header (existing code)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error:
            "Supabase configuration missing. SUPABASE_URL and SUPABASE_ANON_KEY must be set.",
          code: 500,
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const token = authHeader!.replace("Bearer ", "");

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: tokenError,
    } = await adminClient.auth.getUser(token);

    if (tokenError || !user) {
      return new Response(
        JSON.stringify({
          error: tokenError?.message || "Invalid or expired token",
          code: tokenError?.status || 401,
          details: tokenError,
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp credentials not configured" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const body: WhatsAppSendRequest = await req.json();

    console.log("-----------------------------------------");
    console.log("📤 SENDING MESSAGE REQUEST");
    console.log("To:", body.to);
    console.log("Type:", body.type);
    if (body.type === "text") {
      console.log("📝 TEXT MSG DETECTED");
      console.log("Content:", body.text?.body);
      console.log("Object Dump:", JSON.stringify(body.text, null, 2));
    }
    console.log("-----------------------------------------");

    if (!body.to) {
      console.error("ERROR: Missing 'to' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'to'" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (!body.messaging_product) {
      console.error("ERROR: Missing 'messaging_product' field");
      return new Response(
        JSON.stringify({
          error: "Missing required field: 'messaging_product'",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (!body.type) {
      console.error("ERROR: Missing 'type' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'type'" }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (body.type === "text") {
      if (!body.text || !body.text.body) {
        console.error("ERROR: Missing 'text.body'");
        return new Response(
          JSON.stringify({
            error: "Missing required field: 'text.body' for text messages",
          }),
          { status: 400, headers: corsHeaders },
        );
      }
    }

    if (body.type === "template") {
      if (!body.template || !body.template.name) {
        console.error("ERROR: Missing 'template.name'");
        return new Response(
          JSON.stringify({
            error:
              "Missing required field: 'template.name' for template messages",
          }),
          { status: 400, headers: corsHeaders },
        );
      }
      console.log("Template Name:", body.template.name);
    }

    if (!body.to.match(/^\+?[1-9]\d{1,14}$/)) {
      console.error("ERROR: Invalid phone number format:", body.to);
      return new Response(
        JSON.stringify({
          error: "Invalid phone number format. Use format (e.g., +1234567890)",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    const whatsappPayload: WhatsAppSendRequest = {
      ...body,
      recipient_type: body.recipient_type || "individual",
    };

    const whatsappApiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    console.log("Dispatching to WhatsApp API:", whatsappApiUrl);

    const response = await fetch(whatsappApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whatsappPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
      });
      return new Response(
        JSON.stringify({
          error: "WhatsApp API request failed",
          details: responseData,
          status: response.status,
        }),
        { status: response.status, headers: corsHeaders },
      );
    }

    console.log("✅ WhatsApp API Response:", JSON.stringify(responseData));

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error("🚨 Edge Function Error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal server error",
        stack: err.stack,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
