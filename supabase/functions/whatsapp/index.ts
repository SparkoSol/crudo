import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import type { WhatsAppWebhookRequest, WhatsAppSendRequest } from "../../../src/types/whatsapp.types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";
const WHATSAPP_TRANSCRIPT_TEMPLATE_NAME = Deno.env.get("WHATSAPP_TRANSCRIPT_TEMPLATE_NAME") || "sales_report_transcript";

function getWhatsAppConfig() {
  return {
    accessToken: Deno.env.get("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: Deno.env.get("WHATSAPP_API_VERSION") || "v24.0",
    openaiApiKey: Deno.env.get("OPENAI_API_KEY"),
  };
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

    if (!isWebhookVerification && !authHeader) {
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
      const body: WhatsAppWebhookRequest = await req.json();
      console.log("-----------------------------------------");
      console.log("📦 NEW WEBHOOK RECEIVED");
      console.log("Event Type:", body.object);
      console.log("Payload:", JSON.stringify(body, null, 2));
      console.log("-----------------------------------------");

      if (body.object === "whatsapp_business_account") {
        const { accessToken, phoneNumberId, apiVersion, openaiApiKey } = getWhatsAppConfig();

        if (!accessToken || !phoneNumberId) {
          console.error("❌ ERROR: WhatsApp credentials not configured");
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders,
          });
        }

        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const value = change.value;

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

                if (messageType === "audio" || messageType === "voice") {
                  console.log("🎙️ Processing voice message...");
                  const audioId = message.audio?.id || message.voice?.id;
                  const mimeType = message.audio?.mime_type || message.voice?.mime_type || "audio/ogg";

                  if (audioId && openaiApiKey) {
                    try {
                      // ... (rest of audio processing logic)

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

                      if (!from || !from.match(/^\+[1-9]\d{1,14}$/)) {
                        console.error("Invalid phone number format:", from);
                        continue;
                      }

                      if (!accessToken || !phoneNumberId) {
                        console.error("Missing WhatsApp credentials when trying to send transcript");
                        continue;
                      }

                      const supabaseUrl = Deno.env.get("SUPABASE_URL");
                      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

                      if (supabaseUrl && serviceRoleKey) {
                        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                          auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                          },
                        });


                        const { data: transcriptRecord, error: insertError } = await adminClient
                          .from("voice_transcripts")
                          .insert({
                            phone_number: from,
                            transcript: transcript,
                            status: "pending",
                            user_id: null,
                          })
                          .select()
                          .single();

                        if (insertError) {
                          console.error("Failed to store transcript:", insertError);
                        }

                        const { data: phoneMapping } = await adminClient
                          .from("phone_number_mappings")
                          .select("user_id")
                          .eq("phone_number", from)
                          .single();

                        let userId = phoneMapping?.user_id || null;

                        if (userId && transcriptRecord) {
                          await adminClient
                            .from("voice_transcripts")
                            .update({ user_id: userId })
                            .eq("id", transcriptRecord.id);
                        }
                      }

                      const maxTranscriptLength = 1000;
                      const truncatedTranscript = transcript.length > maxTranscriptLength
                        ? transcript.substring(0, maxTranscriptLength) + "..."
                        : transcript;

                      const templatePayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: from,
                        type: "template",
                        template: {
                          name: WHATSAPP_TRANSCRIPT_TEMPLATE_NAME,
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

                      console.log("Sending template transcript message to:", from, "using template:", WHATSAPP_TRANSCRIPT_TEMPLATE_NAME);

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
                          to: from,
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
                  // Handle plain text messages
                  const textBody = message.text?.body || "";
                  console.log("Received text message:", textBody);

                  const { accessToken, phoneNumberId, apiVersion } = getWhatsAppConfig();

                  if (accessToken && phoneNumberId) {
                    try {
                      const responsePayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: from,
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

                if (messageType === "interactive" && message.interactive) {
                  const buttonText = message.interactive.button_reply?.title?.toLowerCase() || "";
                  const buttonId = message.interactive.button_reply?.id;

                  let action: "confirm" | "retake" | null = null;
                  if (buttonId === "confirm" || buttonText.includes("confirm")) {
                    action = "confirm";
                  } else if (buttonId === "retake" || buttonText.includes("retake")) {
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
                          to: from,
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

                      // Get user_id from phone mapping or transcript
                      let userId = transcriptRecord.user_id;
                      if (!userId) {
                        const { data: phoneMapping } = await adminClient
                          .from("phone_number_mappings")
                          .select("user_id")
                          .eq("phone_number", from)
                          .single();
                        userId = phoneMapping?.user_id || null;
                      }

                      if (!userId) {
                        console.error("No user mapping found for phone number:", from);
                        const errorPayload = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: from,
                          type: "text",
                          text: {
                            body: "Your phone number is not linked to an account. Please contact support.",
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

                      // Get user's default template
                      const { data: template, error: templateError } = await adminClient
                        .from("user_templates")
                        .select("*")
                        .eq("user_id", userId)
                        .eq("is_default", true)
                        .single();

                      if (templateError || !template) {
                        console.error("No default template found for user:", templateError);
                        // Update transcript status to confirmed even without template
                        await adminClient
                          .from("voice_transcripts")
                          .update({
                            status: "confirmed",
                            user_id: userId,
                          })
                          .eq("id", transcriptRecord.id);

                        const errorPayload = {
                          messaging_product: "whatsapp",
                          recipient_type: "individual",
                          to: from,
                          type: "text",
                          text: {
                            body: "Your transcript has been saved, but no template is configured. Please set up a template in your account.",
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

                      // Call GPT to fill template directly
                      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
                      let filledData = null;

                      if (openaiApiKey && template.fields && Array.isArray(template.fields)) {
                        try {
                          const fieldsDescription = template.fields
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

                      // Update transcript with filled data and confirmed status
                      await adminClient
                        .from("voice_transcripts")
                        .update({
                          status: "confirmed",
                          user_id: userId,
                          template_id: template.id,
                          filled_data: filledData,
                        })
                        .eq("id", transcriptRecord.id);

                      // Send confirmation message
                      const confirmPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: from,
                        type: "text",
                        text: {
                          body: "✅ Your transcript has been confirmed and processed! You can view and download it from your account.",
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
                          body: JSON.stringify(confirmPayload),
                        }
                      );

                      console.log("Transcript confirmed and processed:", {
                        transcriptId: transcriptRecord.id,
                        userId,
                        phoneNumber: from,
                      });
                    } catch (error) {
                      console.error("Error processing confirm button:", error);
                    }
                  } else if (action === "retake") {
                    try {
                      // Update transcript status to retaken
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

                      // Send retake message
                      const retakePayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: from,
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
      console.error("❌ ERROR: Missing 'to' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'to'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.messaging_product) {
      console.error("❌ ERROR: Missing 'messaging_product' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'messaging_product'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.type) {
      console.error("❌ ERROR: Missing 'type' field");
      return new Response(
        JSON.stringify({ error: "Missing required field: 'type'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.type === "text") {
      if (!body.text || !body.text.body) {
        console.error("❌ ERROR: Missing 'text.body'");
        return new Response(
          JSON.stringify({ error: "Missing required field: 'text.body' for text messages" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (body.type === "template") {
      if (!body.template || !body.template.name) {
        console.error("❌ ERROR: Missing 'template.name'");
        return new Response(
          JSON.stringify({ error: "Missing required field: 'template.name' for template messages" }),
          { status: 400, headers: corsHeaders }
        );
      }
      console.log("Template Name:", body.template.name);
    }

    if (!body.to.match(/^\+[1-9]\d{1,14}$/)) {
      console.error("❌ ERROR: Invalid phone number format:", body.to);
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

    console.log("🚀 Dispatching to WhatsApp API:", whatsappApiUrl);

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
      console.error("❌ WhatsApp API Error:", JSON.stringify(result, null, 2));
      return new Response(
        JSON.stringify({
          error: result?.error?.message || "WhatsApp API request failed",
          details: result?.error,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    console.warn("✅ Message sent successfully!");
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
