// supabase/functions/rapportino-export-pdf/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";

type ExportMode = "AUTO" | "DRAFT" | "OFFICIAL";

type ExportReq = {
  rapportino_id: string;
  mode?: ExportMode;
  force?: boolean;
};

type CallerProfile = {
  id: string;
  app_role?: string | null;
  role?: string | null;
  display_name?: string | null;
  full_name?: string | null;
};

type RapportinoHeader = {
  id: string;
  data: string; // date
  capo_id: string | null;
  capo_name: string;
  status: string;
  costr: string | null;
  commessa: string | null;
  crew_role: string | null;
  prodotto_totale: number | null;
  totale_prodotto: number | null;
  prodotto_tot: number | null;
};

type PublicRow = {
  id: string;
  rapportino_id: string;
  row_index: number;
  position: number | null;
  categoria: string | null;
  descrizione: string | null;
  operatori: string | null; // multi-line
  tempo: string | null; // multi-line
  previsto: number | null;
  prodotto: number | null;
  note: string | null;
  activity_id: string | null;
  updated_at: string;
};

type ArchiveRow = {
  id: string;
  rapportino_id: string;
  row_index: number;
  position: number | null;
  categoria: string | null;
  descrizione: string | null;
  operatori: string | null;
  tempo: string | null;
  previsto: number | null;
  prodotto: number | null;
  note: string | null;
  updated_at: string | null;
};

type ArchiveRigaLegacy = {
  id: number;
  rapportino_id: string;
  idx: number;
  categoria: string | null;
  descrizione: string | null;
  previsto: string | null;
  prodotto: string | null;
  note: string | null;
  operai: { text?: string } | null;
};

type NormalizedRow = {
  position: number;
  categoria: string;
  descrizione: string;
  operatorsText: string; // newline separated
  tempoText: string; // newline separated
  previstoText: string;
  prodottoText: string;
  note: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  const s = String(v ?? "").trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

function safeText(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeMultiLine(v: unknown): string {
  const s = safeText(v);
  if (!s) return "";
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((x) => x.trimEnd())
    .join("\n")
    .trim();
}

function normalizeNumberToText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const isInt = Math.abs(v - Math.round(v)) < 1e-9;
    return isInt ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
  }
  const s = safeText(v);
  if (!s) return "";
  return s;
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const b = new Uint8Array(hash);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256HexText(text: string): Promise<string> {
  const enc = new TextEncoder();
  return await sha256HexBytes(enc.encode(text));
}

function roleToOrigine(appRole: string | null | undefined): "CAPO" | "UFFICIO" | "DIREZIONE" | "ADMIN" | "SYSTEM" {
  const r = safeText(appRole).toUpperCase();
  if (r.includes("CAPO")) return "CAPO";
  if (r.includes("UFFICIO")) return "UFFICIO";
  if (r.includes("DIREZIONE")) return "DIREZIONE";
  if (r.includes("ADMIN")) return "ADMIN";
  return "SYSTEM";
}

function mmToPt(mm: number): number {
  return (72 / 25.4) * mm;
}

type PdfTheme = {
  fontSize: number;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
  borderColor: ReturnType<typeof rgb>;
  headerFill: ReturnType<typeof rgb>;
  textColor: ReturnType<typeof rgb>;
  mutedColor: ReturnType<typeof rgb>;
};

function buildTheme(): PdfTheme {
  return {
    fontSize: 9.5,
    lineHeight: 12,
    paddingX: 4,
    paddingY: 3,
    borderColor: rgb(0.78, 0.82, 0.88),
    headerFill: rgb(0.95, 0.96, 0.98),
    textColor: rgb(0.05, 0.07, 0.11),
    mutedColor: rgb(0.55, 0.58, 0.62),
  };
}

function wrapText(font: PDFFont, text: string, fontSize: number, maxWidth: number): string[] {
  const s = safeText(text);
  if (!s) return [""];
  const hardLines = s.split("\n");
  const out: string[] = [];

  for (const hl of hardLines) {
    const words = hl.split(/\s+/g).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width <= maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            const cand2 = chunk + ch;
            if (font.widthOfTextAtSize(cand2, fontSize) <= maxWidth) {
              chunk = cand2;
            } else {
              if (chunk) out.push(chunk);
              chunk = ch;
            }
          }
          line = chunk;
        } else {
          line = w;
        }
      }
    }
    out.push(line);
  }

  return out.length ? out : [""];
}

function drawRect(
  page: any,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { borderColor?: any; fillColor?: any; borderWidth?: number } = {},
) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: opts.borderColor,
    borderWidth: opts.borderWidth ?? 1,
    color: opts.fillColor,
  });
}

function drawTextLines(
  page: any,
  font: PDFFont,
  lines: string[],
  x: number,
  yTop: number,
  fontSize: number,
  lineHeight: number,
  color: any,
) {
  let y = yTop;
  for (const line of lines) {
    page.drawText(line ?? "", { x, y, size: fontSize, font, color });
    y -= lineHeight;
  }
}

function buildCanonicalPayload(header: RapportinoHeader, rows: NormalizedRow[]) {
  return {
    schema: "RAPPORTINO_PDF_V1",
    header: {
      id: header.id,
      data: header.data,
      costr: header.costr ?? null,
      commessa: header.commessa ?? null,
      capo_id: header.capo_id ?? null,
      capo_name: header.capo_name ?? null,
      crew_role: header.crew_role ?? null,
      status: header.status,
      prodotto_totale: header.prodotto_totale ?? header.prodotto_tot ?? header.totale_prodotto ?? null,
    },
    rows: rows.map((r) => ({
      position: r.position,
      categoria: r.categoria,
      descrizione: r.descrizione,
      operatorsText: r.operatorsText,
      tempoText: r.tempoText,
      previstoText: r.previstoText,
      prodottoText: r.prodottoText,
      note: r.note,
    })),
  };
}

function normalizeRowsFromPublic(raw: PublicRow[]): NormalizedRow[] {
  const map = new Map<string, PublicRow>();

  for (const r of raw) {
    const pos = (r.position ?? r.row_index ?? 0) as number;
    const sigObj = {
      position: pos,
      row_index: r.row_index,
      activity_id: r.activity_id ?? "",
      categoria: safeText(r.categoria),
      descrizione: safeText(r.descrizione),
      operatori: normalizeMultiLine(r.operatori),
      tempo: normalizeMultiLine(r.tempo),
      previsto: r.previsto ?? "",
      prodotto: r.prodotto ?? "",
      note: normalizeMultiLine(r.note),
    };
    const sig = JSON.stringify(sigObj);
    const prev = map.get(sig);
    if (!prev) {
      map.set(sig, r);
      continue;
    }
    if (String(r.updated_at) > String(prev.updated_at)) map.set(sig, r);
  }

  const deduped = Array.from(map.values());

  deduped.sort((a, b) => {
    const pa = a.position ?? a.row_index ?? 0;
    const pb = b.position ?? b.row_index ?? 0;
    if (pa !== pb) return pa - pb;
    if (a.row_index !== b.row_index) return a.row_index - b.row_index;
    return String(a.updated_at).localeCompare(String(b.updated_at));
  });

  return deduped.map((r) => {
    const position = r.position ?? r.row_index ?? 0;
    return {
      position,
      categoria: safeText(r.categoria) || "",
      descrizione: safeText(r.descrizione) || "",
      operatorsText: normalizeMultiLine(r.operatori),
      tempoText: normalizeMultiLine(r.tempo),
      previstoText: normalizeNumberToText(r.previsto),
      prodottoText: normalizeNumberToText(r.prodotto),
      note: normalizeMultiLine(r.note),
    };
  });
}

function normalizeRowsFromArchiveRows(raw: ArchiveRow[]): NormalizedRow[] {
  return raw
    .slice()
    .sort((a, b) => {
      const pa = a.position ?? a.row_index ?? 0;
      const pb = b.position ?? b.row_index ?? 0;
      if (pa !== pb) return pa - pb;
      return a.row_index - b.row_index;
    })
    .map((r) => {
      const position = r.position ?? r.row_index ?? 0;
      return {
        position,
        categoria: safeText(r.categoria),
        descrizione: safeText(r.descrizione),
        operatorsText: normalizeMultiLine(r.operatori),
        tempoText: normalizeMultiLine(r.tempo),
        previstoText: normalizeNumberToText(r.previsto),
        prodottoText: normalizeNumberToText(r.prodotto),
        note: normalizeMultiLine(r.note),
      };
    });
}

function normalizeRowsFromArchiveLegacy(raw: ArchiveRigaLegacy[]): NormalizedRow[] {
  return raw
    .slice()
    .sort((a, b) => a.idx - b.idx)
    .map((r) => {
      const ops = normalizeMultiLine(r.operai?.text ?? "");
      return {
        position: r.idx ?? 0,
        categoria: safeText(r.categoria),
        descrizione: safeText(r.descrizione),
        operatorsText: ops,
        tempoText: "",
        previstoText: normalizeNumberToText(r.previsto),
        prodottoText: normalizeNumberToText(r.prodotto),
        note: normalizeMultiLine(r.note),
      };
    });
}

async function renderRapportinoPdf(params: {
  header: RapportinoHeader;
  rows: NormalizedRow[];
  isOfficial: boolean;
  runId: string;
}): Promise<Uint8Array> {
  const { header, rows, isOfficial, runId } = params;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const theme = buildTheme();

  const pageWidth = 841.89;
  const pageHeight = 595.28;

  const marginX = mmToPt(10);
  const marginTop = mmToPt(10);
  const marginBottom = mmToPt(10);

  const tableTopY = pageHeight - marginTop - 76;
  const tableBottomY = marginBottom + 22;

  const col = {
    categoria: 82,
    descrizione: 180,
    operai: 238,
    tempo: 78,
    previsto: 70,
    prodotto: 70,
    note: 0,
  };

  const contentW = pageWidth - marginX * 2;
  const fixedW = col.categoria + col.descrizione + col.operai + col.tempo + col.previsto + col.prodotto;
  col.note = Math.max(120, contentW - fixedW);

  const columns = [
    { label: "CATEGORIA", w: col.categoria, align: "left" as const },
    { label: "DESCRIZIONE", w: col.descrizione, align: "left" as const },
    { label: "OPERAI", w: col.operai, align: "left" as const },
    { label: "TEMPO", w: col.tempo, align: "left" as const },
    { label: "PREVISTO", w: col.previsto, align: "right" as const },
    { label: "PRODOTTO", w: col.prodotto, align: "right" as const },
    { label: "NOTE", w: col.note, align: "left" as const },
  ];

  function drawHeader(page: any) {
    const x0 = marginX;
    const yTop = pageHeight - marginTop;

    const title = "RAPPORTINO GIORNALIERO";
    const titleSize = 15;
    const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: x0 + contentW / 2 - titleWidth / 2,
      y: yTop - 22,
      size: titleSize,
      font: fontBold,
      color: theme.textColor,
    });

    const boxY = yTop - 52;
    const boxH = 22;
    const gap = 8;
    const boxW = (contentW - gap * 3) / 4;

    const meta = [
      { label: "COSTR", value: safeText(header.costr) || "—" },
      { label: "COMMESSA", value: safeText(header.commessa) || "—" },
      { label: "CAPO SQUADRA", value: safeText(header.capo_name) || "—" },
      { label: "DATA", value: safeText(header.data) || "—" },
    ];

    for (let i = 0; i < meta.length; i++) {
      const bx = x0 + i * (boxW + gap);
      drawRect(page, bx, boxY, boxW, boxH, { borderColor: theme.borderColor, borderWidth: 1 });
      page.drawText(meta[i].label, { x: bx + 6, y: boxY + 13.5, size: 8, font: fontBold, color: theme.mutedColor });
      page.drawText(meta[i].value, { x: bx + 6, y: boxY + 4.5, size: 10, font, color: theme.textColor });
    }

    const total = header.prodotto_totale ?? header.prodotto_tot ?? header.totale_prodotto ?? null;
    const totalText = total === null ? "—" : normalizeNumberToText(total);
    const statusText = safeText(header.status);
    const rightLine = `Totale prodotto: ${totalText}   •   Stato: ${statusText}${isOfficial ? "   •   OFFICIAL" : ""}`;
    const rlSize = 9;
    const rlWidth = font.widthOfTextAtSize(rightLine, rlSize);
    page.drawText(rightLine, {
      x: x0 + contentW - rlWidth,
      y: boxY - 12,
      size: rlSize,
      font,
      color: theme.mutedColor,
    });
  }

  function drawTableHeader(page: any, y: number): number {
    const h = 18;
    let x = marginX;

    for (const c of columns) {
      drawRect(page, x, y - h, c.w, h, { borderColor: theme.borderColor, fillColor: theme.headerFill, borderWidth: 1 });
      const labelLines = wrapText(fontBold, c.label, 8.5, c.w - theme.paddingX * 2);
      drawTextLines(page, fontBold, labelLines, x + theme.paddingX, y - 13, 8.5, 10, theme.textColor);
      x += c.w;
    }
    return h;
  }

  function measureRowHeight(r: NormalizedRow): number {
    const maxLines = (text: string, w: number) => wrapText(font, text, theme.fontSize, w - theme.paddingX * 2).length;

    const linesCategoria = maxLines(r.categoria, col.categoria);
    const linesDesc = maxLines(r.descrizione, col.descrizione);
    const linesOps = maxLines(r.operatorsText, col.operai);
    const linesTempo = maxLines(r.tempoText, col.tempo);
    const linesNote = maxLines(r.note, col.note);

    const max = Math.max(linesCategoria, linesDesc, linesOps, linesTempo, linesNote, 1);
    const h = max * theme.lineHeight + theme.paddingY * 2;
    return Math.max(20, h);
  }

  function drawRow(page: any, yTop: number, r: NormalizedRow): number {
    const h = measureRowHeight(r);

    const cells = [
      { w: col.categoria, text: r.categoria, align: "left" as const },
      { w: col.descrizione, text: r.descrizione, align: "left" as const },
      { w: col.operai, text: r.operatorsText, align: "left" as const },
      { w: col.tempo, text: r.tempoText, align: "left" as const },
      { w: col.previsto, text: r.previstoText, align: "right" as const },
      { w: col.prodotto, text: r.prodottoText, align: "right" as const },
      { w: col.note, text: r.note, align: "left" as const },
    ];

    let x = marginX;
    for (const c of cells) {
      drawRect(page, x, yTop - h, c.w, h, { borderColor: theme.borderColor, borderWidth: 1 });

      const lines = wrapText(font, c.text, theme.fontSize, c.w - theme.paddingX * 2);
      const textY = yTop - theme.paddingY - theme.fontSize;

      if (c.align === "right") {
        let ty = textY;
        for (const ln of lines) {
          const w = font.widthOfTextAtSize(ln, theme.fontSize);
          page.drawText(ln, { x: x + c.w - theme.paddingX - w, y: ty, size: theme.fontSize, font, color: theme.textColor });
          ty -= theme.lineHeight;
        }
      } else {
        drawTextLines(page, font, lines, x + theme.paddingX, textY, theme.fontSize, theme.lineHeight, theme.textColor);
      }

      x += c.w;
    }

    return h;
  }

  function drawFooter(page: any) {
    const x0 = marginX;
    const y0 = marginBottom;

    const sig = "CNCS — CORE";
    const sigSize = 8.5;
    const sigW = font.widthOfTextAtSize(sig, sigSize);
    page.drawText(sig, { x: x0 + contentW - sigW, y: y0, size: sigSize, font, color: theme.mutedColor });

    const rid = `run_id: ${runId}`;
    const ridSize = 7.5;
    const ridW = font.widthOfTextAtSize(rid, ridSize);
    page.drawText(rid, { x: x0 + contentW - ridW, y: y0 + 10, size: ridSize, font, color: rgb(0.7, 0.72, 0.75) });
  }

  let page = doc.addPage([pageWidth, pageHeight]);
  drawHeader(page);

  let cursorY = tableTopY;
  cursorY -= drawTableHeader(page, cursorY);

  for (const r of rows) {
    const rh = measureRowHeight(r);

    if (cursorY - rh < tableBottomY) {
      page = doc.addPage([pageWidth, pageHeight]);
      drawHeader(page);
      cursorY = tableTopY;
      cursorY -= drawTableHeader(page, cursorY);
    }

    cursorY -= drawRow(page, cursorY, r);
  }

  drawFooter(page);

  const bytes = await doc.save();
  return bytes;
}

serve(
  withCors(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { ok: false, error: "Missing server env" });

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json(401, { ok: false, error: "Missing bearer token" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller?.user?.id) return json(401, { ok: false, error: "Unauthorized" });

    const callerId = caller.user.id;

    const { data: callerProfile, error: profErr } = await admin
      .from("profiles")
      .select("id,app_role,role,display_name,full_name")
      .eq("id", callerId)
      .single();

    if (profErr) return json(403, { ok: false, error: "Profile read denied" });

    const profile = callerProfile as CallerProfile;
    const origine = roleToOrigine(profile.app_role ?? profile.role ?? null);

    const body = (await req.json().catch(() => null)) as ExportReq | null;
    if (!body) return json(400, { ok: false, error: "Invalid JSON body" });

    const rapportinoId = String(body.rapportino_id ?? "").trim();
    if (!isUuid(rapportinoId)) return json(400, { ok: false, error: "Invalid rapportino_id" });

    const mode: ExportMode = (String(body.mode ?? "AUTO").toUpperCase() as ExportMode) || "AUTO";
    const force = Boolean(body.force);

    let isOfficial = false;
    let header: RapportinoHeader | null = null;

    if (mode !== "DRAFT") {
      const { data: hA } = await admin.from("archive.rapportini").select("*").eq("id", rapportinoId).maybeSingle();
      if (hA) {
        header = hA as RapportinoHeader;
        isOfficial = true;
      }
    }

    if (!header) {
      const { data: hP, error: hErr } = await admin.from("rapportini").select("*").eq("id", rapportinoId).maybeSingle();
      if (hErr) return json(500, { ok: false, error: `rapportini read error: ${String(hErr.message ?? hErr)}` });
      if (!hP) return json(404, { ok: false, error: "Rapportino not found" });
      header = hP as RapportinoHeader;
      isOfficial = false;
    }

    let rows: NormalizedRow[] = [];

    if (isOfficial && mode !== "DRAFT") {
      const { data: rA, error: rAErr } = await admin
        .from("archive.rapportino_rows")
        .select("id,rapportino_id,row_index,position,categoria,descrizione,operatori,tempo,previsto,prodotto,note,updated_at")
        .eq("rapportino_id", rapportinoId);

      if (rAErr) return json(500, { ok: false, error: `archive rows read error: ${String(rAErr.message ?? rAErr)}` });

      const archiveRows = (rA ?? []) as ArchiveRow[];

      if (archiveRows.length > 0) {
        rows = normalizeRowsFromArchiveRows(archiveRows);
      } else {
        const { data: rLegacy, error: rLErr } = await admin
          .from("archive.rapportino_righe")
          .select("id,rapportino_id,idx,categoria,descrizione,previsto,prodotto,note,operai")
          .eq("rapportino_id", rapportinoId);

        if (rLErr) return json(500, { ok: false, error: `archive legacy rows read error: ${String(rLErr.message ?? rLErr)}` });

        rows = normalizeRowsFromArchiveLegacy(((rLegacy ?? []) as ArchiveRigaLegacy[]) ?? []);
      }
    } else {
      const { data: rP, error: rErr } = await admin
        .from("rapportino_rows")
        .select("id,rapportino_id,row_index,position,categoria,descrizione,operatori,tempo,previsto,prodotto,note,activity_id,updated_at")
        .eq("rapportino_id", rapportinoId);

      if (rErr) return json(500, { ok: false, error: `rapportino_rows read error: ${String(rErr.message ?? rErr)}` });

      rows = normalizeRowsFromPublic(((rP ?? []) as PublicRow[]) ?? []);
    }

    const payload = buildCanonicalPayload(header, rows);
    const payloadJson = JSON.stringify(payload);
    const payloadHash = await sha256HexText(payloadJson);

    const categoria = "RAPPORTINO_PDF";

    if (!force) {
      const { data: existing } = await admin
        .from("core_files")
        .select("id,storage_bucket,storage_path,filename,sha256,version_num,created_at")
        .eq("rapportino_id", rapportinoId)
        .eq("categoria", categoria)
        .eq("claim_id", payloadHash)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing?.storage_bucket && existing?.storage_path) {
        const { data: signed } = await admin.storage.from(String(existing.storage_bucket)).createSignedUrl(String(existing.storage_path), 120);

        return json(200, {
          ok: true,
          reused: true,
          core_file_id: existing.id,
          version_num: existing.version_num ?? null,
          sha256: existing.sha256 ?? null,
          claim_id: payloadHash,
          download_url: signed?.signedUrl ?? null,
          storage_bucket: existing.storage_bucket,
          storage_path: existing.storage_path,
        });
      }
    }

    const { data: prevFiles } = await admin
      .from("core_files")
      .select("id,version_num,version_of,created_at")
      .eq("rapportino_id", rapportinoId)
      .eq("categoria", categoria)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    const prev = (prevFiles ?? []) as Array<{ id: string; version_num: number | null; version_of: string | null; created_at: string }>;
    const maxV = prev.reduce((acc, x) => Math.max(acc, Number(x.version_num ?? 0)), 0);
    const versionNum = maxV + 1;

    let versionOf: string | null = null;
    if (prev.length > 0) {
      const root = prev.find((x) => x.version_of === null) ?? prev[0];
      versionOf = root.version_of ?? root.id ?? null;
    }

    const runId = crypto.randomUUID();

    const pdfBytes = await renderRapportinoPdf({ header, rows, isOfficial, runId });
    const sha256 = await sha256HexBytes(pdfBytes);
    const sizeBytes = pdfBytes.byteLength;

    let cantiere = "UNKNOWN";
    try {
      const costr = safeText(header.costr);
      const commessa = safeText(header.commessa);
      if (costr && commessa) {
        const { data: ship } = await admin
          .from("ships")
          .select("yard,created_at")
          .eq("costr", costr)
          .eq("commessa", commessa)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const yard = safeText((ship as any)?.yard);
        if (yard) cantiere = yard;
      }
    } catch {
      // ignore
    }

    const statoDoc = isOfficial ? "VALIDO_INTERNO" : "BOZZA";
    const frozenAt = isOfficial ? new Date().toISOString() : null;

    const costrSafe = safeText(header.costr) || "NA";
    const commessaSafe = safeText(header.commessa) || "NA";
    const dateSafe = safeText(header.data) || "NA";
    const filename = `RAPPORTINO_${costrSafe}_${commessaSafe}_${dateSafe}_v${versionNum}.pdf`;
    const bucket = "core-drive";
    const storagePath = `rapportini/${costrSafe}/${commessaSafe}/${rapportinoId}/${payloadHash}.pdf`;

    const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (upErr && !String((upErr as any)?.message ?? upErr).toLowerCase().includes("already exists")) {
      return json(500, { ok: false, error: `Storage upload failed: ${String((upErr as any)?.message ?? upErr)}` });
    }

    const insert = {
      storage_bucket: bucket,
      storage_path: storagePath,
      filename,
      mime_type: "application/pdf",
      size_bytes: sizeBytes,
      sha256,
      cantiere,
      commessa: header.commessa,
      categoria: categoria, // doc_categoria
      origine: origine, // doc_origine
      stato_doc: statoDoc, // doc_stato
      rapportino_id: rapportinoId,
      created_by: callerId,
      version_num: versionNum,
      version_of: versionOf,
      frozen_at: frozenAt,
      claim_id: payloadHash,
      note: `run_id=${runId};mode=${isOfficial ? "OFFICIAL" : "DRAFT"}`,
    };

    const { data: created, error: insErr } = await admin.from("core_files").insert(insert).select("id").single();

    if (insErr) {
      const { data: existing2 } = await admin
        .from("core_files")
        .select("id,storage_bucket,storage_path,sha256,version_num")
        .eq("storage_bucket", bucket)
        .eq("storage_path", storagePath)
        .maybeSingle();

      if (!existing2) return json(500, { ok: false, error: `core_files insert failed: ${String((insErr as any)?.message ?? insErr)}` });

      const { data: signed2 } = await admin.storage.from(bucket).createSignedUrl(storagePath, 120);

      return json(200, {
        ok: true,
        reused: true,
        core_file_id: existing2.id,
        version_num: existing2.version_num ?? null,
        sha256: existing2.sha256 ?? null,
        claim_id: payloadHash,
        run_id: runId,
        download_url: signed2?.signedUrl ?? null,
        storage_bucket: bucket,
        storage_path: storagePath,
      });
    }

    const coreFileId = (created as any)?.id;

    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(storagePath, 120);

    return json(200, {
      ok: true,
      reused: false,
      core_file_id: coreFileId,
      version_num: versionNum,
      sha256,
      claim_id: payloadHash,
      run_id: runId,
      download_url: signed?.signedUrl ?? null,
      storage_bucket: bucket,
      storage_path: storagePath,
      is_official: isOfficial,
    });
  }),
);
