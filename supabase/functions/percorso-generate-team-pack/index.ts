// supabase/functions/percorso-generate-team-pack/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.4";
import { corsHeaders, withCors } from "../_shared/cors.ts";

/**
 * Canon inputs
 */
type PdfMode = "AUTO" | "ONE_CABLE_PER_PAGE" | "COMPACT_MULTI_CABLE" | "SUMMARY_ONLY";
type SortOrder = "DESTINATION" | "PONTE_ZONA" | "CABLE_CODE";

type TeamPackRequest = {
  team_id: string;

  /**
   * Cable codes (MARCA PEZZO) as stored in CORE:
   * public.percorso_cables.cable_label
   */
  cable_codes: string[];

  // Optional context shown on PDF cover. If omitted, we will infer from percorso_documents (document_id).
  costr?: string | null; // not in tables; kept for display only
  commessa?: string | null;
  project_code?: string | null; // not in tables; kept for display only
  ship_code?: string | null;

  // If provided, will be used to infer ship_code/commessa/file_path from public.percorso_documents
  document_id?: string | null;

  // PDF behavior
  pdf_mode?: PdfMode;
  include_appendix?: boolean;

  // Sorting/grouping
  sort_order?: SortOrder;

  // Optional free text
  notes?: string | null;

  // Optional label for team shown on cover
  team_label?: string | null;
};

type TrattaRow = {
  progressivo: number; // seq
  marca_tratta: string; // inca_code (8 chars)

  ponte_code: string;
  zona_code: string;
  livello: string;
  sequenza: string; // 3 chars alphanum
  tipo_strada: string; // last char, Z means device
};

type CablePack = {
  codice: string; // cable_label
  cable_id: string;
  from_device_tratta: string; // computed from Z
  to_device_tratta: string; // computed from Z
  tratte: TrattaRow[];
  meta: {
    tratte_count: number;
    ponte_zona_key: string;
    total_length_m: number | null; // not available in schema → null
  };
};

type DocInfo = {
  id: string;
  ship_code: string | null;
  commessa: string | null;
  file_path: string | null;
  inca_file_id: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function choosePdfMode(mode: PdfMode | undefined, cablesCount: number): PdfMode {
  if (!mode || mode === "AUTO") {
    if (cablesCount <= 15) return "ONE_CABLE_PER_PAGE";
    if (cablesCount <= 60) return "COMPACT_MULTI_CABLE";
    return "SUMMARY_ONLY";
  }
  return mode;
}

/**
 * Canon rule: MARCA TRATTA is always 8 chars: 2 + 1 + 1 + 3 + 1
 * s = PP Z L SSS T
 */
function parseMarcaTratta(marca: string) {
  if (!marca || marca.length !== 8) {
    throw new Error(`Invalid MARCA TRATTA length (expected 8): "${marca}"`);
  }
  const ponte_code = marca.slice(0, 2);
  const zona_code = marca.slice(2, 3);
  const livello = marca.slice(3, 4);
  const sequenza = marca.slice(4, 7);
  const tipo_strada = marca.slice(7, 8);
  const is_device = tipo_strada === "Z";
  return { ponte_code, zona_code, livello, sequenza, tipo_strada, is_device };
}

function derivePonteZonaKey(tratte: TrattaRow[]): string {
  const freq = new Map<string, number>();
  for (const t of tratte) {
    const k = `${t.ponte_code}-${t.zona_code}`;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  let best = "";
  let bestN = -1;
  for (const [k, n] of freq.entries()) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best || (tratte[0] ? `${tratte[0].ponte_code}-${tratte[0].zona_code}` : "NA");
}

function extractDevices(tratte: TrattaRow[]) {
  const z = tratte.filter((t) => t.tipo_strada === "Z");
  if (z.length !== 2) {
    throw new Error(`Expected exactly 2 Z tratte (partenza+arrivo), got ${z.length}`);
  }
  const sorted = [...z].sort((a, b) => a.progressivo - b.progressivo);
  return {
    from_device_tratta: sorted[0].marca_tratta,
    to_device_tratta: sorted[1].marca_tratta,
  };
}

function sortCables(packs: CablePack[], sortOrder: SortOrder): CablePack[] {
  const arr = [...packs];
  switch (sortOrder) {
    case "DESTINATION":
      arr.sort(
        (a, b) =>
          a.to_device_tratta.localeCompare(b.to_device_tratta) ||
          a.codice.localeCompare(b.codice),
      );
      return arr;
    case "PONTE_ZONA":
      arr.sort(
        (a, b) =>
          a.meta.ponte_zona_key.localeCompare(b.meta.ponte_zona_key) ||
          a.codice.localeCompare(b.codice),
      );
      return arr;
    case "CABLE_CODE":
    default:
      arr.sort((a, b) => a.codice.localeCompare(b.codice));
      return arr;
  }
}

/**
 * PDF builder
 */
async function buildPdf(params: {
  request: TeamPackRequest;
  pack_id: string;
  pack_version: number;
  generated_at_iso: string;
  pdf_mode: PdfMode;
  share_url: string;
  cables: CablePack[];
  include_appendix: boolean;
  doc_info: DocInfo | null;
}) {
  const {
    request,
    pack_id,
    pack_version,
    generated_at_iso,
    pdf_mode,
    share_url,
    cables,
    include_appendix,
    doc_info,
  } = params;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595.28; // A4 portrait
  const pageH = 841.89;
  const margin = 36;
  const lineH = 14;

  function addFooter(page: any, pageIndex: number, pageCount: number) {
    const footerY = 18;
    const left = `Pack ${pack_id} v${pack_version} — ${generated_at_iso}`;
    const right = `Page ${pageIndex + 1}/${pageCount}`;
    page.drawText(left, { x: margin, y: footerY, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
    const rightWidth = font.widthOfTextAtSize(right, 8);
    page.drawText(right, {
      x: pageW - margin - rightWidth,
      y: footerY,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  async function addCover() {
    const page = doc.addPage([pageW, pageH]);
    let y = pageH - margin;

    page.drawText("PERCORSO — Team Pack", { x: margin, y: y - 8, size: 20, font: fontBold });
    y -= 36;

    const ship_code = request.ship_code ?? doc_info?.ship_code ?? null;
    const commessa = request.commessa ?? doc_info?.commessa ?? null;

    const metaLines: string[] = [];
    if (ship_code) metaLines.push(`Nave: ${ship_code}`);
    if (commessa) metaLines.push(`Commessa: ${commessa}`);
    if (request.project_code) metaLines.push(`Project: ${request.project_code}`);
    if (request.costr) metaLines.push(`COSTR: ${request.costr}`);
    if (request.document_id) metaLines.push(`Document: ${request.document_id}`);
    if (doc_info?.file_path) metaLines.push(`File: ${doc_info.file_path}`);

    metaLines.push(`Team: ${request.team_label ?? request.team_id}`);
    metaLines.push(`Generated: ${generated_at_iso}`);
    metaLines.push(`Mode: ${pdf_mode}`);
    metaLines.push(`Cables: ${cables.length}`);
    metaLines.push(`Source: CORE Percorso (documents/cables/segments)`);

    for (const line of metaLines) {
      page.drawText(line, { x: margin, y, size: 12, font });
      y -= lineH;
    }

    if (request.notes) {
      y -= 8;
      page.drawText("Notes:", { x: margin, y, size: 12, font: fontBold });
      y -= lineH;
      const note = request.notes.length > 500 ? request.notes.slice(0, 500) + "…" : request.notes;
      page.drawText(note, { x: margin, y, size: 11, font });
      y -= lineH;
    }

    // QR code
    const qrDataUrl = await QRCode.toDataURL(share_url, { margin: 1, scale: 6 });
    const qrBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
    const qrPng = await doc.embedPng(qrBytes);

    const qrSize = 160;
    page.drawImage(qrPng, { x: pageW - margin - qrSize, y: pageH - margin - qrSize, width: qrSize, height: qrSize });

    // Share URL under QR
    const urlLabel = "Open pack:";
    const urlY = pageH - margin - qrSize - 18;
    page.drawText(urlLabel, { x: pageW - margin - qrSize, y: urlY, size: 10, font: fontBold });
    const urlText = share_url.length > 52 ? share_url.slice(0, 52) + "…" : share_url;
    page.drawText(urlText, { x: pageW - margin - qrSize, y: urlY - 12, size: 9, font });

    return page;
  }

  function drawCableHeader(page: any, y: number, cable: CablePack) {
    const header = `${cable.codice} — ${cable.from_device_tratta} → ${cable.to_device_tratta}`;
    page.drawText(header, { x: margin, y, size: 12, font: fontBold });

    const meta = [
      `Tratte: ${cable.meta.tratte_count}`,
      `Ponte/Zona: ${cable.meta.ponte_zona_key}`,
      `L(m): N/A`,
    ].join(" | ");

    page.drawText(meta, { x: margin, y: y - 14, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
    return y - 30;
  }

  function drawTratteTable(page: any, yStart: number, tratte: TrattaRow[], compact: boolean) {
    const cols = compact
      ? ["PROG", "TRATTA", "P", "Z", "L", "SEQ", "T"]
      : ["PROG", "MARCA TRATTA", "PONTE", "ZONA", "LIV", "SEQ", "TIPO"];

    const colWidths = compact
      ? [44, 140, 26, 26, 26, 44, 26]
      : [44, 210, 44, 44, 34, 54, 34];

    const tableX = margin;
    const rowH = 12;
    const headerH = 14;

    // header row
    let x = tableX;
    for (let i = 0; i < cols.length; i++) {
      page.drawText(cols[i], { x, y: yStart, size: 9, font: fontBold });
      x += colWidths[i];
    }

    let y = yStart - headerH;

    for (const t of tratte) {
      const cells = [
        String(t.progressivo),
        t.marca_tratta,
        t.ponte_code,
        t.zona_code,
        t.livello,
        t.sequenza,
        t.tipo_strada,
      ];

      x = tableX;
      for (let i = 0; i < cells.length; i++) {
        page.drawText(cells[i] ?? "", { x, y, size: 9, font });
        x += colWidths[i];
      }

      y -= rowH;
      if (y < 60) break;
    }

    return y;
  }

  // Cover
  await addCover();

  // Body
  if (pdf_mode === "SUMMARY_ONLY") {
    const perPage = 35;
    let i = 0;
    while (i < cables.length) {
      const page = doc.addPage([pageW, pageH]);
      let y = pageH - margin;

      page.drawText("Summary", { x: margin, y, size: 16, font: fontBold });
      y -= 24;

      page.drawText("CAVO | FROM → TO | TRATTE | P/Z", { x: margin, y, size: 10, font: fontBold });
      y -= 16;

      for (let k = 0; k < perPage && i < cables.length; k++, i++) {
        const c = cables[i];
        const line = [
          c.codice,
          `${c.from_device_tratta}→${c.to_device_tratta}`,
          String(c.meta.tratte_count),
          c.meta.ponte_zona_key,
        ].join(" | ");
        page.drawText(line, { x: margin, y, size: 9, font });
        y -= 12;
        if (y < 60) break;
      }
    }

    if (include_appendix) {
      for (const c of cables) {
        const page = doc.addPage([pageW, pageH]);
        let y = pageH - margin;
        page.drawText("Appendix — Detail", { x: margin, y, size: 14, font: fontBold });
        y -= 22;
        y = drawCableHeader(page, y, c);
        y = drawTratteTable(page, y, c.tratte, true);
      }
    }
  } else if (pdf_mode === "ONE_CABLE_PER_PAGE") {
    for (const c of cables) {
      const page = doc.addPage([pageW, pageH]);
      let y = pageH - margin;
      y = drawCableHeader(page, y, c);
      drawTratteTable(page, y, c.tratte, false);
    }
  } else {
    // COMPACT_MULTI_CABLE
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - margin;

    page.drawText("Compact", { x: margin, y, size: 14, font: fontBold });
    y -= 22;

    for (const c of cables) {
      if (y < 160) {
        page = doc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      y = drawCableHeader(page, y, c);
      y = drawTratteTable(page, y, c.tratte, true);
      y -= 14;
    }
  }

  // Footers
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((p, idx) => addFooter(p, idx, total));

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}

/**
 * DB fetch adapted to CORE schema (Percorso tables already exist):
 * - public.percorso_cables (cable_label)
 * - public.percorso_cable_segments (seq, inca_code)
 */
async function fetchCablePacksFromCore(supabase: any, cableCodes: string[], documentId?: string | null): Promise<CablePack[]> {
  const cleanCodes = [...new Set(cableCodes.map((s) => s.trim()).filter(Boolean))];
  if (cleanCodes.length === 0) return [];

  // 1) Fetch cables by cable_label (optionally scoped to document_id)
  let cableQuery = supabase
    .from("percorso_cables")
    .select("id, document_id, cable_label, source_from, source_to, created_at")
    .in("cable_label", cleanCodes);

  if (documentId) {
    cableQuery = cableQuery.eq("document_id", documentId);
  }

  const { data: cables, error: e1 } = await cableQuery;

  if (e1) throw new Error(`DB percorso_cables error: ${e1.message}`);
  if (!cables || cables.length === 0) return [];

  // Map by label
  const byLabel = new Map<string, any>();
  for (const c of cables) byLabel.set(String(c.cable_label), c);

  // 2) Fetch segments for these cable ids
  const cableIds = cables.map((c: any) => c.id);
  const { data: segs, error: e2 } = await supabase
    .from("percorso_cable_segments")
    .select("cable_id, seq, inca_code")
    .in("cable_id", cableIds)
    .order("seq", { ascending: true });

  if (e2) throw new Error(`DB percorso_cable_segments error: ${e2.message}`);

  const segsByCable = new Map<string, TrattaRow[]>();
  for (const row of (segs ?? [])) {
    const marca = String(row.inca_code);
    const parsed = parseMarcaTratta(marca);

    const t: TrattaRow = {
      progressivo: Number(row.seq),
      marca_tratta: marca,
      ponte_code: parsed.ponte_code,
      zona_code: parsed.zona_code,
      livello: parsed.livello,
      sequenza: parsed.sequenza,
      tipo_strada: parsed.tipo_strada,
    };

    const list = segsByCable.get(row.cable_id) ?? [];
    list.push(t);
    segsByCable.set(row.cable_id, list);
  }

  // Assemble in input order
  const packs: CablePack[] = [];
  for (const code of cleanCodes) {
    const c = byLabel.get(code);
    if (!c) continue;

    const tratte = segsByCable.get(c.id) ?? [];
    if (tratte.length === 0) continue;

    // Compute devices from Z; strict canon.
    const devices = extractDevices(tratte);

    packs.push({
      codice: String(c.cable_label),
      cable_id: String(c.id),
      from_device_tratta: devices.from_device_tratta,
      to_device_tratta: devices.to_device_tratta,
      tratte,
      meta: {
        tratte_count: tratte.length,
        ponte_zona_key: derivePonteZonaKey(tratte),
        total_length_m: null,
      },
    });
  }

  return packs;
}

async function fetchDocInfo(supabase: any, documentId?: string | null): Promise<DocInfo | null> {
  if (!documentId) return null;
  const { data, error } = await supabase
    .from("percorso_documents")
    .select("id, ship_code, commessa, file_path, inca_file_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw new Error(`DB percorso_documents error: ${error.message}`);
  if (!data) return null;

  return {
    id: String(data.id),
    ship_code: data.ship_code ?? null,
    commessa: data.commessa ?? null,
    file_path: data.file_path ?? null,
    inca_file_id: data.inca_file_id ?? null,
  };
}

serve(withCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: TeamPackRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.team_id || typeof body.team_id !== "string") {
    return new Response(JSON.stringify({ error: "team_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cable_codes = Array.isArray(body.cable_codes) ? body.cable_codes : [];
  if (cable_codes.length === 0) {
    return new Response(JSON.stringify({ error: "cable_codes[] is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const generated_at_iso = nowIso();
  const sort_order: SortOrder = body.sort_order ?? "DESTINATION";
  const pdf_mode: PdfMode = choosePdfMode(body.pdf_mode ?? "AUTO", cable_codes.length);
  const include_appendix = Boolean(body.include_appendix);

  // Doc info (optional)
  let doc_info: DocInfo | null = null;
  try {
    doc_info = await fetchDocInfo(supabase, body.document_id ?? null);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch packs from CORE schema
  let cablePacks: CablePack[] = [];
  try {
    cablePacks = await fetchCablePacksFromCore(supabase, cable_codes, body.document_id ?? null);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (cablePacks.length === 0) {
    return new Response(JSON.stringify({
      error:
        "No cables/segments found for given cable_codes (check percorso_cables.cable_label and percorso_cable_segments rows).",
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  cablePacks = sortCables(cablePacks, sort_order);

  // Pack id + version (V1)
  const pack_id = crypto.randomUUID();
  const pack_version = 1;

  // Share URL
  const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://app.example.com";
  const share_url = `${APP_BASE_URL}/manager/percorso/packs/${pack_id}?team=${encodeURIComponent(body.team_id)}`;

  // Build PDF bytes
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildPdf({
      request: body,
      pack_id,
      pack_version,
      generated_at_iso,
      pdf_mode,
      share_url,
      cables: cablePacks,
      include_appendix,
      doc_info,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: `PDF generation failed: ${String(err?.message ?? err)}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Upload to Storage
  const bucket = Deno.env.get("PERCORSO_PACKS_BUCKET") ?? "percorso-packs";
  const filePath = `packs/${pack_id}/team-${body.team_id}/v${pack_version}.pdf`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (upErr) {
    return new Response(JSON.stringify({ error: `Storage upload failed: ${upErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(filePath, 60 * 60 * 24);
  if (signErr) {
    return new Response(JSON.stringify({ error: `Signed URL failed: ${signErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    pack_id,
    pack_version,
    pdf_mode,
    team_id: body.team_id,
    document_id: body.document_id ?? null,
    doc_info,
    cables_requested: cable_codes.length,
    cables_resolved: cablePacks.length,
    share_url,
    pdf: {
      bucket,
      path: filePath,
      signed_url: signed?.signedUrl ?? null,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
