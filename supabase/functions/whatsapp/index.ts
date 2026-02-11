import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import type { WhatsAppWebhookRequest, WhatsAppSendRequest } from "../../../src/types/whatsapp.types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

function getWhatsAppConfig() {
  return {
    accessToken: Deno.env.get("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: Deno.env.get("WHATSAPP_API_VERSION") || "v24.0",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY"),
    templateName: Deno.env.get("WHATSAPP_TRANSCRIPT_TEMPLATE_NAME") || "sales_report_transcript",
  };
}

async function verifyWebhookSignature(payload: string, signature: string | null): Promise<boolean> {
  if (!signature) {
    console.warn("⚠️ No X-Hub-Signature-256 header found");
    return false;
  }

  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) {
    console.warn("⚠️ WHATSAPP_APP_SECRET not configured - skipping signature verification");
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
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const isValid = signatureHash === expectedHash;
    if (!isValid) {
      console.error("❌ Invalid webhook signature");
    }
    return isValid;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}


function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}


serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    const url = new URL(req.url);

    const isWebhookVerification = url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token");
    const isWhatsAppWebhook = req.method === "POST";

    if (!isWebhookVerification && !isWhatsAppWebhook && !authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (req.method === "GET" && isWebhookVerification) {
      const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "whatsapp_verify_token";
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === verifyToken) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      } else {
        return new Response(
          JSON.stringify({ error: "Verification failed" }),
          { status: 403, headers: corsHeaders }
        );
      }
    }

    if (req.method === "POST" && !authHeader) {
      const rawBody = await req.text();
      const signature = req.headers.get("X-Hub-Signature-256");
      const isValidSignature = await verifyWebhookSignature(rawBody, signature);

      if (!isValidSignature && Deno.env.get("WHATSAPP_APP_SECRET")) {
        console.error("❌ Webhook signature verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: corsHeaders }
        );
      }

      const body: WhatsAppWebhookRequest = JSON.parse(rawBody);
      console.log("-----------------------------------------");
      console.log("📦 NEW WEBHOOK RECEIVED");
      console.log("Event Type:", body.object);
      console.log("Payload:", JSON.stringify(body, null, 2));
      console.log("-----------------------------------------");

      if (body.object === "whatsapp_business_account") {
        const { accessToken, phoneNumberId, apiVersion, openaiApiKey, templateName } = getWhatsAppConfig();

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
              console.log("ℹ️ Ignoring status update");
              continue;
            }

            if (value.messages) {
              for (const message of value.messages) {
                const from = message.from;
                const messageId = message.id;
                const timestamp = message.timestamp;
                const messageType = message.type;

                console.log(`📩 MESSAGE RECEIVED from ${from}`);
                console.log(`Type: ${messageType}`);
                console.log(`Message ID: ${messageId}`);
                if (message.text?.body) console.log(`Content: "${message.text.body}"`);

                const supabaseUrl = Deno.env.get("SUPABASE_URL");
                const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

                  const cleanPhone = from.replace(/\D/g, '');
                  const { data: phoneMapping } = await adminClient
                    .from("phone_number_mappings")
                    .select("user_id")
                    .or(`phone_number.eq."${cleanPhone}",phone_number.eq."+${cleanPhone}"`)
                    .maybeSingle();

                  userId = phoneMapping?.user_id || null;

                  if (!userId) {
                    const { data: profileByPhone } = await adminClient
                      .from("profiles")
                      .select("id, full_name")
                      .or(`phone_number.eq."${cleanPhone}",phone_number.eq."+${cleanPhone}"`)
                      .maybeSingle();

                    if (profileByPhone) {
                      console.log(`✅ Found user in profiles table: ${profileByPhone.id}`);
                      userId = profileByPhone.id;
                      userName = profileByPhone.full_name;
                    }
                  }

                  if (!userId) {
                    console.error("❌ No user mapping found for phone number:", from);
                    if (messageType !== "reaction" && accessToken && phoneNumberId) {
                      const notRegisteredPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizePhoneNumber(from),
                        type: "text",
                        text: {
                          body: "🚫 This phone number is not registered in our system. Please ask your manager to invite you or add your number in the portal.",
                        },
                      };
                      try {
                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(notRegisteredPayload),
                          }
                        );
                      } catch (err) { console.error("Failed to send Not Registered reply:", err); }
                    }
                    continue;
                  }

                  const { data: profile } = await adminClient
                    .from("profiles")
                    .select("id, manager_id, role, full_name")
                    .eq("id", userId)
                    .single();

                  if (profile) {
                    userName = profile.full_name;
                  }

                  effectiveManagerId = userId;
                  if (profile && profile.role !== 'manager' && profile.manager_id) {
                    effectiveManagerId = profile.manager_id;
                  }

                  const { data: subscription } = await adminClient
                    .from("subscriptions")
                    .select("status")
                    .eq("user_id", effectiveManagerId)
                    .in("status", ["active", "trialing"])
                    .maybeSingle();

                  if (!subscription) {
                    console.error(`❌ Manager (${effectiveManagerId}) has no active subscription.`);
                    if (messageType !== "reaction" && accessToken && phoneNumberId) {
                      const subErrorPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizePhoneNumber(from),
                        type: "text",
                        text: {
                          body: "⚠️ The subscription for your account (or your manager's account) is inactive or expired. Please renew the subscription to continue identifying transcripts.",
                        },
                      };
                      try {
                        await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(subErrorPayload),
                          }
                        );
                      } catch (err) { console.error("Failed to send Subscription Error reply:", err); }
                    }
                    continue;
                  }
                }

                if (messageType === "audio" || messageType === "voice") {
                  console.log("🎙️ Processing voice message...");
                  const audioId = message.audio?.id || message.voice?.id;
                  const mimeType = message.audio?.mime_type || message.voice?.mime_type || "audio/ogg";

                  if (audioId && openaiApiKey) {
                    try {
                      const mediaUrl = `https://graph.facebook.com/${apiVersion}/${audioId}`;
                      const mediaResponse = await fetch(mediaUrl, {
                        headers: {
                          "Authorization": `Bearer ${accessToken}`,
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
                        console.error("No download URL in media response:", mediaData);
                        continue;
                      }

                      const audioResponse = await fetch(downloadUrl, {
                        headers: {
                          "Authorization": `Bearer ${accessToken}`,
                        },
                      });

                      if (!audioResponse.ok) {
                        const errorText = await audioResponse.text();
                        console.error("Failed to download audio file:", errorText);
                        continue;
                      }

                      const audioBlob = await audioResponse.blob();
                      const audioBuffer = await audioBlob.arrayBuffer();

                      const formData = new FormData();
                      let fileExtension = "ogg";
                      if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
                        fileExtension = "mp3";
                      } else if (mimeType.includes("wav")) {
                        fileExtension = "wav";
                      } else if (mimeType.includes("webm")) {
                        fileExtension = "webm";
                      }

                      const audioFile = new Blob([audioBuffer], { type: mimeType });
                      formData.append("file", audioFile, `audio.${fileExtension}`);
                      formData.append("model", "whisper-1");

                      const whisperResponse = await fetch(OPENAI_WHISPER_API_URL, {
                        method: "POST",
                        headers: {
                          "Authorization": `Bearer ${openaiApiKey}`,
                        },
                        body: formData,
                      });

                      if (!whisperResponse.ok) {
                        const errorText = await whisperResponse.text();
                        console.error("Whisper API error:", errorText);
                        continue;
                      }

                      const transcriptionResult = await whisperResponse.json();
                      let transcript = transcriptionResult.text;

                      if (!transcript || transcript.trim().length === 0) {
                        console.warn("Empty transcript received from Whisper API");
                        transcript = "Sorry, I couldn't transcribe the audio. Please try again.";
                      }

                      console.log("Transcription result:", transcript);

                      const maxLength = 4000;
                      if (transcript.length > maxLength) {
                        transcript = transcript.substring(0, maxLength) + "...\n\n[Transcript truncated due to length]";
                      }

                      if (!from || !from.match(/^\+?[1-9]\d{1,14}$/)) {
                        console.error("Invalid phone number format:", from);
                        continue;
                      }

                      if (!accessToken || !phoneNumberId) {
                        console.error("Missing WhatsApp credentials when trying to send transcript");
                        continue;
                      }

                      console.log(`✅ User verified: ${userId}, Manager: ${effectiveManagerId}`);

                      const { data: transcriptRecord, error: insertError } = await adminClient
                        .from("voice_transcripts")
                        .insert({
                          phone_number: from,
                          transcript: transcript,
                          status: "pending",
                          user_id: userId, // The sales person ID
                        })
                        .select()
                        .single();

                      if (insertError) {
                        console.error("Failed to store transcript:", insertError);
                      } else {
                        console.log("✅ Transcript stored successfully with user_id:", userId);
                      }

                      const maxTranscriptLength = 1000;
                      const truncatedTranscript = transcript.length > maxTranscriptLength
                        ? transcript.substring(0, maxTranscriptLength) + "..."
                        : transcript;

                      const templatePayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: normalizePhoneNumber(from),
                        type: "template",
                        template: {
                          name: templateName,
                          language: {
                            code: "en_US",
                          },
                          components: [
                            {
                              type: "body",
                              parameters: [
                                {
                                  type: "text",
                                  text: truncatedTranscript,
                                },
                              ],
                            },
                          ],
                        },
                      };

                      console.log("Sending template transcript message to:", from, "using template:", templateName);

                      const sendResponse = await fetch(
                        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                        {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(templatePayload),
                        }
                      );

                      const sendResult = await sendResponse.json();

                      if (!sendResponse.ok) {
                        console.error("Failed to send template transcript message:", {
                          status: sendResponse.status,
                          statusText: sendResponse.statusText,
                          error: sendResult,
                          phoneNumber: from,
                        });

                        const textPayload = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: normalizePhoneNumber(from),
                          type: "text",
                          text: {
                            body: `📝 Transcript:\n\n${transcript}`,
                          },
                        };

                        const fallbackResponse = await fetch(
                          `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                          {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(textPayload),
                          }
                        );

                        if (!fallbackResponse.ok) {
                          const errorDetails = sendResult?.error || sendResult;
                          console.error("WhatsApp API Error Details:", JSON.stringify(errorDetails, null, 2));
                        }
                      } else {
                        console.log("Template transcript sent successfully:", {
                          messageId: sendResult.messages?.[0]?.id,
                          phoneNumber: from,
                        });
                      }
                    } catch (error) {
                      console.error("Error processing audio message:", error);
                    }
                  } else {
                    console.warn("Audio message received but OpenAI API key not configured or audio ID missing");
                  }
                } else if (messageType === "text") {
                  const textBody = message.text?.body || "";
                  console.log("Received text message:", textBody);

                  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();

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
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(responsePayload),
                        }
                      );
                    } catch (error) {
                      console.error("Error sending text reply:", error);
                    }
                  }
                }

                if (messageType === "interactive" || messageType === "button") {
                  const buttonText = (message.interactive?.button_reply?.title || (message as any).button?.text || "").toLowerCase();
                  const buttonId = message.interactive?.button_reply?.id || (message as any).button?.payload || "";

                  console.log(`🔘 Button clicked: ${buttonText} (ID: ${buttonId})`);

                  let action: "confirm" | "retake" | null = null;
                  if (buttonId === "Confirm" || buttonText.includes("confirm")) {
                    action = "confirm";
                  } else if (buttonId === "Retake" || buttonText.includes("retake")) {
                    action = "retake";
                  }

                  if (!action) {
                    console.log("Unknown button clicked:", buttonText, buttonId);
                    continue;
                  }
                  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();
                  const supabaseUrl = Deno.env.get("SUPABASE_URL");
                  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

                  if (!supabaseUrl || !serviceRoleKey) {
                    console.error("Supabase configuration missing for interactive handler");
                    continue;
                  }

                  if (!accessToken || !phoneNumberId) {
                    console.error("WhatsApp credentials missing for interactive handler");
                    continue;
                  }

                  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                    auth: {
                      autoRefreshToken: false,
                      persistSession: false,
                    },
                  });

                  if (action === "confirm") {
                    try {
                      const { data: transcriptRecord, error: transcriptError } = await adminClient
                        .from("voice_transcripts")
                        .select("*")
                        .eq("phone_number", from)
                        .eq("status", "pending")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                      if (transcriptError || !transcriptRecord) {
                        console.error("No pending transcript found for confirmation:", transcriptError);
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
                              "Authorization": `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(errorPayload),
                          }
                        );
                        continue;
                      }

                      let userId = transcriptRecord.user_id;

                      let effectiveManagerId = userId;
                      const { data: profile } = await adminClient
                        .from("profiles")
                        .select("id, manager_id, role, full_name, phone_number")
                        .eq("id", userId)
                        .single();

                      if (profile) {
                        userName = profile.full_name;
                      }

                      if (profile && profile.role !== 'manager' && profile.manager_id) {
                        effectiveManagerId = profile.manager_id;
                      }

                      const { data: template } = await adminClient
                        .from("user_templates")
                        .select("*")
                        .eq("user_id", effectiveManagerId)
                        .eq("is_default", true)
                        .maybeSingle();

                      const activeTemplate = template || {
                        id: null,
                        name: "Standard Sales Report",
                        fields: [
                          { name: "Summary", type: "textarea", required: true }
                        ]
                      };

                      if (!template) {
                        console.log("⚠️ No default template found for manager. Using Fallback Template.");
                      } else {
                        console.log(`✅ Using template: ${template.name} (${template.id})`);
                      }


                      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
                      let filledData = null;

                      if (openaiApiKey && activeTemplate.fields && Array.isArray(activeTemplate.fields)) {
                        try {
                          const fieldsDescription = activeTemplate.fields
                            .map(
                              (field: any) =>
                                `- ${field.name} (${field.type}${field.required ? ", required" : ", optional"})`
                            )
                            .join("\n");

                          const systemPrompt = `You are a helpful assistant that extracts structured data from voice transcripts. 
Given a transcript and a list of template fields, extract the relevant information and fill in the template fields.
Return ONLY a valid JSON object with field names as keys and extracted values as values.
If a field cannot be found in the transcript, use null for optional fields or make your best inference for required fields.
Be accurate and only extract information that is clearly stated in the transcript.`;

                          const userPrompt = `Transcript:
${transcriptRecord.transcript}

Template Fields:
${fieldsDescription}

Extract and fill all template fields from the transcript. Return a JSON object with field names as keys.`;

                          const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                            method: "POST",
                            headers: {
                              "Authorization": `Bearer ${openaiApiKey}`,
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

                          if (gptResponse.ok) {
                            const gptResult = await gptResponse.json();
                            const content = gptResult.choices?.[0]?.message?.content;
                            if (content) {
                              try {
                                filledData = JSON.parse(content);
                              } catch (parseError) {
                                console.error("Failed to parse GPT response:", content);
                              }
                            }
                          } else {
                            const errorText = await gptResponse.text();
                            console.error("Failed to fill template with GPT:", errorText);
                          }
                        } catch (gptError) {
                          console.error("Error calling GPT API:", gptError);
                        }
                      }

                      await adminClient
                        .from("voice_transcripts")
                        .update({
                          status: "confirmed",
                          user_id: userId,
                          template_id: template?.id || null,
                          filled_data: filledData,
                        })
                        .eq("id", transcriptRecord.id);

                      console.log("Generating PDF...");
                      const pdfDoc = await PDFDocument.create();
                      const page = pdfDoc.addPage([612, 792]);
                      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

                      let yPosition = 750;
                      const margin = 50;
                      const pageWidth = 612;
                      const pageHeight = 792;
                      const lineHeight = 20;
                      const sectionSpacing = 30;

                      const addText = (text: string, x: number, y: number, size: number, fontType: any, maxWidth?: number, color?: any) => {
                        const drawOptions: any = { x, size, font: fontType };
                        if (color) drawOptions.color = color;

                        if (maxWidth) {
                          const words = text.split(" ");
                          let line = "";
                          let currentY = y;
                          for (const word of words) {
                            const testLine = line + (line ? " " : "") + word;
                            const width = fontType.widthOfTextAtSize(testLine, size);
                            if (width > maxWidth && line) {
                              page.drawText(line, { ...drawOptions, y: currentY });
                              line = word;
                              currentY -= lineHeight;
                            } else {
                              line = testLine;
                            }
                          }
                          if (line) {
                            page.drawText(line, { ...drawOptions, y: currentY });
                            currentY -= lineHeight;
                          }
                          return currentY;
                        } else {
                          page.drawText(text, { ...drawOptions, y });
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
                      addText("Sales Visit Report", margin, yPosition, 24, boldFont, undefined, rgb(1, 1, 1));
                      yPosition -= 35;
                      const dateStr = new Date().toLocaleString();
                      addText(`Generated: ${dateStr}`, margin, yPosition, 10, font, undefined, rgb(0.8, 0.8, 0.8));

                      yPosition = pageHeight - 130;

                      yPosition = addText("Sales Representative Details", margin, yPosition, 14, boldFont, undefined, rgb(0, 0, 0));
                      yPosition -= 15;

                      const repName = userName || "(Name not available)";
                      const repPhone = profile?.phone_number || "(Phone not available)";

                      addText("Name:", margin, yPosition, 11, boldFont);
                      addText(repName, margin + 50, yPosition, 11, font);
                      yPosition -= 20;
                      addText("Phone:", margin, yPosition, 11, boldFont);
                      addText(repPhone, margin + 50, yPosition, 11, font);
                      yPosition -= sectionSpacing;

                      yPosition = addText(`Template Used: ${activeTemplate.name}`, margin, yPosition, 12, boldFont);
                      yPosition -= sectionSpacing;

                      yPosition = addText("Transcript", margin, yPosition, 14, boldFont);
                      page.drawLine({
                        start: { x: margin, y: yPosition + 5 },
                        end: { x: pageWidth - margin, y: yPosition + 5 },
                        thickness: 1,
                        color: rgb(0.8, 0.8, 0.8),
                      });
                      yPosition -= 15;

                      yPosition = addText(transcriptRecord.transcript, margin, yPosition, 10, font, pageWidth - 2 * margin);
                      yPosition -= sectionSpacing;

                      if (filledData) {
                        yPosition = addText("Extracted Data", margin, yPosition, 14, boldFont);
                        page.drawLine({
                          start: { x: margin, y: yPosition + 5 },
                          end: { x: pageWidth - margin, y: yPosition + 5 },
                          thickness: 1,
                          color: rgb(0.8, 0.8, 0.8),
                        });
                        yPosition -= 15;

                        for (const [key, value] of Object.entries(filledData)) {
                          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
                          const valStr = value ? String(value) : "N/A";

                          yPosition = addText(`${label}:`, margin, yPosition, 11, boldFont);
                          yPosition = addText(valStr, margin + 20, yPosition, 10, font, pageWidth - 2 * margin - 20);
                          yPosition -= 10;
                        }
                      }

                      const pdfBytes = await pdfDoc.save();
                      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                      const pdfFormData = new FormData();
                      pdfFormData.append('file', pdfBlob, 'transcript.pdf');
                      pdfFormData.append('messaging_product', 'whatsapp');

                      console.log("Uploading PDF to WhatsApp...");
                      const uploadResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${accessToken}`,
                        },
                        body: pdfFormData
                      });

                      const uploadResult = await uploadResponse.json();
                      if (!uploadResponse.ok) {
                        throw new Error(`Media Upload Failed: ${JSON.stringify(uploadResult)}`);
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
                          caption: "Here is your processed transcript report. 📄",
                          filename: "transcript_report.pdf"
                        }
                      };

                      await fetch(
                        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
                        {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(docPayload),
                        }
                      );

                      console.log("Transcript confirmed, PDF generated and sent:", {
                        transcriptId: transcriptRecord.id,
                        userId,
                        phoneNumber: from,
                      });
                    } catch (error) {
                      console.error("Error processing confirm button:", error);
                    }
                  } else if (action === "retake") {
                    try {
                      const { data: transcriptRecord } = await adminClient
                        .from("voice_transcripts")
                        .select("id")
                        .eq("phone_number", from)
                        .eq("status", "pending")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                      if (transcriptRecord) {
                        await adminClient
                          .from("voice_transcripts")
                          .update({ status: "retaken" })
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
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(retakePayload),
                        }
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

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error: "Supabase configuration missing. SUPABASE_URL and SUPABASE_ANON_KEY must be set.",
          code: 500
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const token = authHeader!.replace("Bearer ", "");

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: { user }, error: tokenError } = await adminClient.auth.getUser(token);

    if (tokenError || !user) {
      return new Response(
        JSON.stringify({
          error: tokenError?.message || "Invalid or expired token",
          code: tokenError?.status || 401,
          details: tokenError
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: "WhatsApp credentials not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body: WhatsAppSendRequest = await req.json();

    console.log("-----------------------------------------");
    console.log("📤 SENDING MESSAGE REQUEST");
    console.log("To:", body.to);
    console.log("Type:", body.type);
    if (body.type === 'text') {
      console.log("📝 TEXT MSG DETECTED");
      console.log("Content:", body.text?.body);
      console.log("Object Dump:", JSON.stringify(body.text, null, 2));
    }
    console.log("-----------------------------------------");

    if (!body.to) {
      console.error("ERROR: Missing 'to' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'to'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.messaging_product) {
      console.error("ERROR: Missing 'messaging_product' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'messaging_product'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.type) {
      console.error("ERROR: Missing 'type' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'type'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.type === "text") {
      if (!body.text || !body.text.body) {
        console.error("ERROR: Missing 'text.body'");
        return new Response(
          JSON.stringify({ error: "Missing required field: 'text.body' for text messages" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (body.type === "template") {
      if (!body.template || !body.template.name) {
        console.error("ERROR: Missing 'template.name'");
        return new Response(
          JSON.stringify({ error: "Missing required field: 'template.name' for template messages" }),
          { status: 400, headers: corsHeaders }
        );
      }
      console.log("Template Name:", body.template.name);
    }

    if (!body.to.match(/^\+?[1-9]\d{1,14}$/)) {
      console.error("ERROR: Invalid phone number format:", body.to);
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use format (e.g., +1234567890)" }),
        { status: 400, headers: corsHeaders }
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
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whatsappPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", JSON.stringify(result, null, 2));
      return new Response(
        JSON.stringify({
          error: result?.error?.message || "WhatsApp API request failed",
          details: result?.error,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    console.warn("Message sent successfully!");
    console.warn("Message ID:", result.messages?.[0]?.id);
    console.log("-----------------------------------------");

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messages?.[0]?.id,
        result,
        _debug_timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("=== WhatsApp function error ===");
    console.error("Error message:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
