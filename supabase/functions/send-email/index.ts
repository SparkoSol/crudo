import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrevoEmailRequest {
  templateId: number;
  to: string;
  toName?: string;
  params: {
    company_name?: string;
    user_name?: string;
    password?: string;
    [key: string]: any;
  };
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
    const brevoApiKey = Deno.env.get("BREVO_KEY");

    if (!brevoApiKey) {
      throw new Error("BREVO_KEY is not set in Supabase secrets");
    }

    const requestData: BrevoEmailRequest = await req.json();
    const { templateId, to, toName, params, attachment } = requestData;

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: "templateId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!to) {
      return new Response(JSON.stringify({ error: "to email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brevoPayload: any = {
      templateId: templateId,
      to: [{ email: to, name: toName || to }],
      params: params || {},
    };

    if (attachment && attachment.length > 0) {
      brevoPayload.attachment = attachment;
    }

    const brevoApiUrl = "https://api.brevo.com/v3/smtp/email";

    const response = await fetch(brevoApiUrl, {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", responseData);
      return new Response(JSON.stringify({ error: responseData }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
