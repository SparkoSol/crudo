import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrevoEmailRequest {
  templateId: number;
  to: string;
  toName?: string;
  params?: Record<string, any>;
  attachment?: Array<{
    name: string;
    content: string; 
    contentType?: string;
  }>;
}

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseKey = serviceRoleKey || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );
    
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ 
          error: userError?.message || "Unauthorized",
          code: userError?.status || 401,
          details: userError 
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_KEY");
    if (!brevoApiKey) {
      throw new Error("BREVO_KEY is not set");
    }

    const body: BrevoEmailRequest = await req.json();

    const { templateId, to, toName, params = {}, attachment } = body;

    if (!templateId || !to) {
      return new Response(
        JSON.stringify({ error: "templateId and to are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const brevoPayload: any = {
      templateId,
      to: [{ email: to, name: toName || to }],
      params,
    };

    if (attachment?.length) {
      brevoPayload.attachment = attachment.map((a) => ({
        name: a.name,
        content: a.content,
        contentType: a.contentType,
      }));
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: result?.message || "Brevo email failed",
          details: result,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }
    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
