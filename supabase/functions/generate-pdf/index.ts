import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GeneratePDFRequest {
  transcriptId: string;
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

    const body: GeneratePDFRequest = await req.json();

    if (!body.transcriptId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: transcriptId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch transcript data
    const { data: transcript, error: transcriptError } = await adminClient
      .from("voice_transcripts")
      .select(`
        *,
        user_templates:template_id (
          id,
          name,
          fields,
          template_structure
        )
      `)
      .eq("id", body.transcriptId)
      .eq("user_id", user.id)
      .single();

    if (transcriptError || !transcript) {
      return new Response(
        JSON.stringify({
          error: "Transcript not found or access denied",
          details: transcriptError,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = 750;
    const margin = 50;
    const pageWidth = 612;
    const pageHeight = 792;
    const lineHeight = 20;
    const sectionSpacing = 30;

    // Helper function to add text with word wrapping
    const addText = (
      text: string,
      x: number,
      y: number,
      size: number,
      fontType: any,
      maxWidth?: number
    ): number => {
      if (maxWidth) {
        const words = text.split(" ");
        let line = "";
        let currentY = y;

        for (const word of words) {
          const testLine = line + (line ? " " : "") + word;
          const width = fontType.widthOfTextAtSize(testLine, size);

          if (width > maxWidth && line) {
            page.drawText(line, {
              x,
              y: currentY,
              size,
              font: fontType,
            });
            line = word;
            currentY -= lineHeight;
            if (currentY < margin) {
              const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
              currentY = pageHeight - margin;
            }
          } else {
            line = testLine;
          }
        }

        if (line) {
          page.drawText(line, {
            x,
            y: currentY,
            size,
            font: fontType,
          });
          currentY -= lineHeight;
        }

        return currentY;
      } else {
        page.drawText(text, {
          x,
          y,
          size,
          font: fontType,
        });
        return y - lineHeight;
      }
    };

    // Title
    yPosition = addText(
      "Voice Transcript Report",
      margin,
      yPosition,
      20,
      boldFont
    );
    yPosition -= sectionSpacing;

    // Date
    const dateStr = new Date(transcript.created_at).toLocaleString();
    yPosition = addText(`Generated: ${dateStr}`, margin, yPosition, 10, font);
    yPosition -= sectionSpacing;

    // Template name if available
    if (transcript.user_templates && typeof transcript.user_templates === 'object' && 'name' in transcript.user_templates) {
      const templateName = (transcript.user_templates as any).name;
      yPosition = addText(
        `Template: ${templateName}`,
        margin,
        yPosition,
        12,
        boldFont
      );
      yPosition -= sectionSpacing;
    }

    // Transcript section
    yPosition = addText("Transcript:", margin, yPosition, 14, boldFont);
    yPosition -= 10;
    yPosition = addText(
      transcript.transcript,
      margin,
      yPosition,
      10,
      font,
      pageWidth - 2 * margin
    );
    yPosition -= sectionSpacing;

    // Filled template data section
    if (transcript.filled_data && typeof transcript.filled_data === 'object') {
      yPosition = addText("Filled Template Data:", margin, yPosition, 14, boldFont);
      yPosition -= 10;

      const filledData = transcript.filled_data as Record<string, any>;
      for (const [key, value] of Object.entries(filledData)) {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        const valueStr = value !== null && value !== undefined ? String(value) : "N/A";
        yPosition = addText(`${label}:`, margin, yPosition, 11, boldFont);
        yPosition = addText(
          valueStr,
          margin + 20,
          yPosition,
          10,
          font,
          pageWidth - 2 * margin - 20
        );
        yPosition -= 5;
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF as base64
    const base64Pdf = btoa(
      String.fromCharCode(...new Uint8Array(pdfBytes))
    );

    return new Response(
      JSON.stringify({
        success: true,
        pdf: base64Pdf,
        filename: `transcript-${transcript.id.substring(0, 8)}.pdf`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("Generate PDF function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
