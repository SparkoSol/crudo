import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface FillTemplateRequest {
  transcript: string;
  templateFields: Array<{
    name: string;
    type: string;
    required: boolean;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error: "Supabase configuration missing",
          code: 500,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { user }, error: tokenError } = await adminClient.auth.getUser(token);

    if (tokenError || !user) {
      return new Response(
        JSON.stringify({
          error: tokenError?.message || "Invalid or expired token",
          code: tokenError?.status || 401,
          details: tokenError,
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body: FillTemplateRequest = await req.json();

    if (!body.transcript || !body.templateFields) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: transcript and templateFields",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const fieldsDescription = body.templateFields
      .map(
        (field) =>
          `- ${field.name} (${field.type}${field.required ? ", required" : ", optional"})`
      )
      .join("\n");

    const systemPrompt = `You are a helpful assistant that extracts structured data from voice transcripts. 
Given a transcript and a list of template fields, extract the relevant information and fill in the template fields.
Return ONLY a valid JSON object with field names as keys and extracted values as values.
If a field cannot be found in the transcript, use null for optional fields or make your best inference for required fields.
Be accurate and only extract information that is clearly stated in the transcript.`;

    const userPrompt = `Transcript:
${body.transcript}

Template Fields:
${fieldsDescription}

Extract and fill all template fields from the transcript. Return a JSON object with field names as keys.`;

    const gptResponse = await fetch(OPENAI_API_URL, {
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

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to process template with GPT",
          details: errorText,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const gptResult = await gptResponse.json();
    const content = gptResult.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from GPT" }),
        { status: 500, headers: corsHeaders }
      );
    }

    let filledData;
    try {
      filledData = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response:", content);
      return new Response(
        JSON.stringify({
          error: "Invalid JSON response from GPT",
          details: content,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        filledData,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Fill template function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
