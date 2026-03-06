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

    const { data: transcript, error: transcriptError } = await adminClient
      .from("voice_transcripts")
      .select(`
        *,
        user_templates:template_id (
          id,
          name,
          fields,
          template_structure
        ),
        profiles:user_id (
          id,
          full_name,
          phone_number,
          manager_id
        )
      `)
      .eq("id", body.transcriptId)
      .single();

    if (transcriptError || !transcript) {
      return new Response(
        JSON.stringify({
          error: "Transcript not found",
          details: transcriptError,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const owner = transcript.profiles;
    const isOwner = transcript.user_id === user.id;
    const isManager = owner?.manager_id === user.id;

    if (!isOwner && !isManager) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to this transcript" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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
      maxWidth?: number
    ): number => {
      let currentY = y;
      const cleanText = text || "";
      const inputLines = cleanText.split(/\r?\n/);

      for (const p of inputLines) {
        if (!p.trim()) {
          currentY -= lineHeight;
          if (currentY < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
          continue;
        }

        let proc = p.replace(/\t/g, " ");
        try {
          fontType.widthOfTextAtSize(proc, size);
        } catch {
          proc = proc.replace(/[^\x20-\x7E\x80-\xFF]/g, "");
        }

        if (maxWidth) {
          const words = proc.split(" ");
          let line = "";

          for (const word of words) {
            const testLine = line + (line ? " " : "") + word;
            let width = 0;
            try {
              width = fontType.widthOfTextAtSize(testLine, size);
            } catch {
              width = maxWidth + 1; // force wrap
            }

            if (width > maxWidth && line) {
              try { page.drawText(line, { x, y: currentY, size, font: fontType }); } catch {}
              line = word;
              currentY -= lineHeight;
              if (currentY < margin) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                currentY = pageHeight - margin;
              }
            } else {
              line = testLine;
            }
          }

          if (line) {
            try { page.drawText(line, { x, y: currentY, size, font: fontType }); } catch {}
            currentY -= lineHeight;
            if (currentY < margin) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              currentY = pageHeight - margin;
            }
          }
        } else {
          try { page.drawText(proc, { x, y: currentY, size, font: fontType }); } catch {
            page.drawText(proc.replace(/[^\x20-\x7E]/g, "?"), { x, y: currentY, size, font: fontType });
          }
          currentY -= lineHeight;
          if (currentY < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
        }
      }
      return currentY;
    };

    // Use modified transcript if available (report was updated via WhatsApp modify flow)
    const transcriptText = (transcript as any).modified_transcript || transcript.transcript || "";
    const filledDataRaw = transcript.filled_data || {};
    const placeVisited = typeof filledDataRaw === 'object' && filledDataRaw !== null ? String((filledDataRaw as any).place_visited || '') : '';
    const reportTitle = placeVisited ? `${placeVisited} - Report` : "Voice Transcript Report";

    yPosition = addText(
      reportTitle,
      margin,
      yPosition,
      20,
      boldFont
    );
    yPosition -= sectionSpacing;

    if (owner && typeof owner === 'object' && !Array.isArray(owner)) {
      const profile = owner as any;
      if (profile.full_name) {
        yPosition = addText(`Salesperson: ${profile.full_name}`, margin, yPosition, 12, font);
        yPosition -= 5;
      }
      // Use phone_number from profile; fall back to phone_number from transcript row itself
      const phoneDisplay = profile.phone_number || (transcript as any).phone_number || null;
      if (phoneDisplay) {
        yPosition = addText(`Phone: ${phoneDisplay}`, margin, yPosition, 12, font);
        yPosition -= sectionSpacing;
      }
    }

    const isUpdated = !!(transcript as any).modified_transcript;
    const dateStr = new Date(transcript.created_at).toLocaleString();
    yPosition = addText(`Generated: ${dateStr}${isUpdated ? "  [Updated Report]" : ""}`, margin, yPosition, 10, font);
    yPosition -= sectionSpacing;
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

    // Show updated vs original label
    const transcriptSectionLabel = isUpdated ? "Updated Transcript:" : "Transcript:";
    yPosition = addText(transcriptSectionLabel, margin, yPosition, 14, boldFont);
    yPosition -= 10;
    yPosition = addText(
      transcriptText,
      margin,
      yPosition,
      10,
      font,
      pageWidth - 2 * margin
    );
    yPosition -= sectionSpacing;

    if (filledDataRaw && typeof filledDataRaw === 'object') {
      yPosition = addText("Filled Template Data:", margin, yPosition, 14, boldFont);
      yPosition -= 10;

      const filledData = filledDataRaw as Record<string, any>;
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

    const pdfBytes = await pdfDoc.save();
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
