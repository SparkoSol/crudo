import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
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
      console.log("body", JSON.stringify(body, null, 2));

      if (body.object === "whatsapp_business_account") {
        const { accessToken, phoneNumberId, apiVersion, openaiApiKey } = getWhatsAppConfig();

        if (!accessToken || !phoneNumberId) {
          console.error("WhatsApp credentials not configured");
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

                console.log("Received message:", {
                  from,
                  messageId,
                  timestamp,
                  type: messageType,
                  text: message.text?.body,
                });

                if (messageType === "audio" || messageType === "voice") {
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

                      if (!from || !from.match(/^\+[1-9]\d{1,14}$/)) {
                        console.error("Invalid phone number format:", from);
                        continue;
                      }

                      if (!accessToken || !phoneNumberId) {
                        console.error("Missing WhatsApp credentials when trying to send transcript");
                        continue;
                      }

                      const textPayload = {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: from,
                        type: "text",
                        text: {
                          body: `📝 Transcript:\n\n${transcript}`,
                        },
                      };

                      console.log("Sending transcript to:", from, "using phoneNumberId:", phoneNumberId);

                      const sendResponse = await fetch(
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

                      const sendResult = await sendResponse.json();

                      if (!sendResponse.ok) {
                        console.error("Failed to send transcript message:", {
                          status: sendResponse.status,
                          statusText: sendResponse.statusText,
                          error: sendResult,
                          phoneNumber: from,
                        });

                        const errorDetails = sendResult?.error || sendResult;
                        console.error("WhatsApp API Error Details:", JSON.stringify(errorDetails, null, 2));
                      } else {
                        console.log("Transcript sent successfully:", {
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

    if (!body.to) {
      return new Response(
        JSON.stringify({ error: "Missing required field: 'to'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.messaging_product) {
      return new Response(
        JSON.stringify({ error: "Missing required field: 'messaging_product'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.type) {
      return new Response(
        JSON.stringify({ error: "Missing required field: 'type'" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.type === "text") {
      if (!body.text || !body.text.body) {
        return new Response(
          JSON.stringify({ error: "Missing required field: 'text.body' for text messages" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (body.type === "template") {
      if (!body.template || !body.template.name) {
        return new Response(
          JSON.stringify({ error: "Missing required field: 'template.name' for template messages" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (!body.to.match(/^\+[1-9]\d{1,14}$/)) {
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
      return new Response(
        JSON.stringify({
          error: result?.error?.message || "WhatsApp API request failed",
          details: result?.error,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messages?.[0]?.id,
        result
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
