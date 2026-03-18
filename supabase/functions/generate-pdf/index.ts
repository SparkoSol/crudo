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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing", code: 500 }),
        { status: 500, headers: corsHeaders },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
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

    const body: GeneratePDFRequest = await req.json();

    if (!body.transcriptId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: transcriptId" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: transcript, error: transcriptError } = await adminClient
      .from("voice_transcripts")
      .select(
        `
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
      `,
      )
      .eq("id", body.transcriptId)
      .single();

    if (transcriptError || !transcript) {
      return new Response(
        JSON.stringify({
          error: "Transcript not found",
          details: transcriptError,
        }),
        { status: 404, headers: corsHeaders },
      );
    }

    const owner = transcript.profiles;
    const isOwner = transcript.user_id === user.id;
    const isManager = owner?.manager_id === user.id;

    if (!isOwner && !isManager) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access to this transcript" }),
        { status: 403, headers: corsHeaders },
      );
    }

    // ─── PDF constants ───────────────────────────────────────────────────────
    const PAGE_W = 612;
    const PAGE_H = 792;
    const MARGIN = 50;
    const BODY_W = PAGE_W - MARGIN * 2;

    // ─── Initialise document ─────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ─── Word-wrap helper ────────────────────────────────────────────────────
    // Returns an array of display lines for `text` that each fit within `maxW`.
    const wrapText = (
      text: string,
      fnt: typeof font,
      size: number,
      maxW: number,
    ): string[] => {
      const out: string[] = [];
      for (const para of (text || "").split(/\r?\n/)) {
        if (!para.trim()) {
          out.push("");
          continue;
        }
        // Strip chars that Helvetica can't encode
        const clean = para.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
        const words = clean.split(" ");
        let cur = "";
        for (const w of words) {
          const test = cur ? cur + " " + w : w;
          let tw = 0;
          try {
            tw = fnt.widthOfTextAtSize(test, size);
          } catch {
            tw = maxW + 1;
          }
          if (tw > maxW && cur) {
            out.push(cur);
            cur = w;
          } else {
            cur = test;
          }
        }
        if (cur) out.push(cur);
      }
      return out;
    };

    // ─── Content model ───────────────────────────────────────────────────────
    // We collect every logical item first, then render in a single pass.
    // This guarantees page breaks are handled in one clean place.
    type ContentItem =
      | {
          type: "text";
          text: string;
          size: number;
          bold: boolean;
          indent: number;
          before: number;
          after: number;
        }
      | { type: "gap"; pts: number }
      | { type: "rule" };

    const content: ContentItem[] = [];

    const addLine = (
      text: string,
      size: number,
      bold: boolean,
      indent = 0,
      before = 0,
      after = 0,
    ) =>
      content.push({ type: "text", text, size, bold, indent, before, after });
    const addGap = (pts: number) => content.push({ type: "gap", pts });
    const addRule = () => content.push({ type: "rule" });

    // ─── Build content ───────────────────────────────────────────────────────
    const transcriptText =
      (transcript as any).modified_transcript || transcript.transcript || "";
    const filledDataRaw = transcript.filled_data || {};
    const placeVisited =
      typeof filledDataRaw === "object" && filledDataRaw !== null
        ? String((filledDataRaw as any).place_visited || "")
        : "";
    const isUpdated = !!(transcript as any).modified_transcript;
    const reportTitle = placeVisited
      ? `${placeVisited} - Informe`
      : "Informe de Transcripción";
    const dateStr = new Date(transcript.created_at).toLocaleString();

    // Header
    addLine(reportTitle, 20, true, 0, 0, 6);
    addRule();
    addGap(8);

    // Sales rep info
    if (owner && typeof owner === "object" && !Array.isArray(owner)) {
      const p = owner as any;
      if (p.full_name) addLine(`Vendedor: ${p.full_name}`, 11, false, 0, 0, 3);
      const ph = p.phone_number || (transcript as any).phone_number;
      if (ph) addLine(`Teléfono: ${ph}`, 11, false, 0, 0, 3);
    }
    addLine(
      `Generado: ${dateStr}${isUpdated ? "  [Actualizado]" : ""}`,
      9,
      false,
      0,
      0,
      3,
    );

    if (
      transcript.user_templates &&
      typeof transcript.user_templates === "object" &&
      "name" in transcript.user_templates
    ) {
      addLine(
        `Plantilla: ${(transcript.user_templates as any).name}`,
        11,
        true,
        0,
        2,
        4,
      );
    }

    // Report fields section
    addGap(10);
    addLine("Detalles del Informe", 13, true, 0, 0, 4);
    addRule();
    addGap(6);

    if (typeof filledDataRaw === "object" && filledDataRaw !== null) {
      for (const [key, value] of Object.entries(
        filledDataRaw as Record<string, any>,
      )) {
        if (value === null || value === undefined) continue;
        const vs = String(value).trim();
        if (vs === "" || vs.toLowerCase() === "n/a") continue;
        const label =
          key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        addLine(`${label}:`, 11, true, 0, 6, 2);
        addLine(vs, 10, false, 16, 0, 2);
      }
    }

    // Transcript section
    addGap(14);
    addLine(
      isUpdated ? "Transcripción Actualizada" : "Transcripción",
      13,
      true,
      0,
      0,
      4,
    );
    addRule();
    addGap(6);
    addLine(
      transcriptText || "Sin transcripción disponible.",
      10,
      false,
      0,
      0,
      0,
    );

    // ─── Render: expand to display lines, then paginate ──────────────────────
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const ensureSpace = (needed: number) => {
      if (y - needed < MARGIN) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    };

    for (const item of content) {
      if (item.type === "gap") {
        y -= item.pts;
        if (y < MARGIN) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          y = PAGE_H - MARGIN;
        }
        continue;
      }

      if (item.type === "rule") {
        ensureSpace(10);
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: PAGE_W - MARGIN, y },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75),
        });
        y -= 8;
        continue;
      }

      // type === "text"
      const fnt = item.bold ? boldFont : font;
      const x = MARGIN + item.indent;
      const maxW = BODY_W - item.indent;
      const lh = item.size * 1.5; // generous line height

      const lines = wrapText(item.text, fnt, item.size, maxW);

      for (let li = 0; li < lines.length; li++) {
        // spaceBefore only on the first logical line
        if (li === 0 && item.before > 0) {
          y -= item.before;
          if (y < MARGIN) {
            page = pdfDoc.addPage([PAGE_W, PAGE_H]);
            y = PAGE_H - MARGIN;
          }
        }

        ensureSpace(lh);

        const ln = lines[li];
        if (ln.trim()) {
          try {
            page.drawText(ln, { x, y, size: item.size, font: fnt });
          } catch {
            try {
              page.drawText(ln.replace(/[^\x20-\x7E]/g, "?"), {
                x,
                y,
                size: item.size,
                font: fnt,
              });
            } catch {
              /* skip unrenderable line */
            }
          }
        }
        y -= lh;
      }

      // spaceAfter only once per content item
      if (item.after > 0) {
        y -= item.after;
        if (y < MARGIN) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          y = PAGE_H - MARGIN;
        }
      }
    }

    // ─── Encode and return ───────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();

    // Chunked btoa — avoids call-stack overflow with large Uint8Arrays
    let base64Pdf = "";
    const CHUNK = 8192;
    for (let i = 0; i < pdfBytes.length; i += CHUNK) {
      base64Pdf += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
    }
    base64Pdf = btoa(base64Pdf);

    return new Response(
      JSON.stringify({
        success: true,
        pdf: base64Pdf,
        filename: `informe-${transcript.id.substring(0, 8)}.pdf`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("Generate PDF function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
