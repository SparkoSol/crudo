import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import type { WhatsAppWebhookRequest, WhatsAppSendRequest } from "../../../src/types/whatsapp.types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

      if (body.object === "whatsapp_business_account") {
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

    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") || "v24.0";

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
