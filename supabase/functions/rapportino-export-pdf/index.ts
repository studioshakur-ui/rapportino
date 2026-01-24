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

type CapoProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
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

function isUnknownCapoName(v: unknown): boolean {
  const s = safeText(v).toUpperCase();
  if (!s) return true;
  if (s === "—") return true;
  if (s.includes("SCONOSCIUTO")) return true;
  if (s.includes("UNKNOWN")) return true;
  return false;
}

function formatItalianDateForPdf(dateIso: unknown): string {
  const s = safeText(dateIso);
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (!m) return s || "—";

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return s;
  if (month < 1 || month > 12) return s;
  if (day < 1 || day > 31) return s;

  const months = ["gen.", "feb.", "mar.", "apr.", "mag.", "giu.", "lug.", "ago.", "set.", "ott.", "nov.", "dic."];

  return `${day} ${months[month - 1]} ${year}`;
}

async function resolveCapoLabel(admin: any, header: RapportinoHeader): Promise<string> {
  const current = safeText(header.capo_name);
  if (!isUnknownCapoName(current)) return titleCaseHumanName(current);

  const capoId = safeText(header.capo_id);
  if (!isUuid(capoId)) return "CAPO NON RISOLTO";

  const { data } = await admin.from("profiles").select("id,display_name,full_name,email").eq("id", capoId).maybeSingle();

  const p = (data ?? null) as CapoProfile | null;
  const raw = safeText(p?.display_name) || safeText(p?.full_name) || safeText(p?.email);
  const label = titleCaseHumanName(raw);
  return label || "CAPO NON RISOLTO";
}

function isEmailLike(v: string): boolean {
  const s = safeText(v);
  return !!s && s.includes("@");
}

function titleCaseHumanName(v: string): string {
  const s = safeText(v);
  if (!s) return "";
  if (isEmailLike(s)) return s;

  const tokens = s.split(/\s+/g).filter(Boolean);
  const out = tokens.map((t) => {
    if (/^[A-Z0-9]{2,}$/.test(t)) return t; // acronyms
    const lower = t.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return out.join(" ");
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
    schema: "RAPPORTINO_PDF_V2",
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
}): Promise<Uint8Array> {
  const { header, rows } = params;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const theme = buildTheme();

  // A4 landscape in PDF points.
  const pageWidth = 841.89;
  const pageHeight = 595.28;

  const marginX = mmToPt(12);
  const marginTop = mmToPt(12);
  const marginBottom = mmToPt(12);

  const contentW = pageWidth - marginX * 2;
  const xLeft = marginX;
  const xRight = marginX + contentW;

  const title = "RAPPORTINO GIORNALIERO";
  const titleSize = 14;

  const metaLabelSize = 10;
  const metaValueSize = 10;
  const underlineThickness = 1;

  const dateBoxW = 150;
  const dateBoxH = 20;
  const dateBoxR = 6;

  const tableCornerR = 10;
  const tableHeaderH = 46;

  const col = (() => {
    const base = {
      categoria: 105,
      descrizione: 175,
      operatore: 135,
      tempo: 70,
      previsto: 65,
      prodotto: 70,
      indice: 60,
      note: 0,
    };

    const fixed =
      base.categoria + base.descrizione + base.operatore + base.tempo + base.previsto + base.prodotto + base.indice;

    base.note = Math.max(160, Math.floor(contentW - fixed));

    const sum =
      base.categoria +
      base.descrizione +
      base.operatore +
      base.tempo +
      base.previsto +
      base.prodotto +
      base.note +
      base.indice;

    base.note += Math.round(contentW - sum);
    return base;
  })();

  const columns = [
    { key: "categoria", label: "CATEGORIA", w: col.categoria, align: "left" as const },
    { key: "descrizione", label: "DESCRIZIONE ATTIVITÀ", w: col.descrizione, align: "left" as const },
    {
      key: "operatore",
      label: "OPERATORE",
      subLabel: "(tap per scegliere /\ndrag&drop)",
      w: col.operatore,
      align: "left" as const,
    },
    { key: "tempo", label: "TEMPO", subLabel: "(ORE)", w: col.tempo, align: "center" as const },
    { key: "previsto", label: "PREVISTO", w: col.previsto, align: "center" as const },
    { key: "prodotto", label: "PRODOTTO", subLabel: "(MT)", w: col.prodotto, align: "center" as const },
    { key: "note", label: "NOTE", w: col.note, align: "left" as const },
    { key: "indice", label: "INDICE", w: col.indice, align: "center" as const },
  ];

  const colX: number[] = [xLeft];
  for (const c of columns) colX.push(colX[colX.length - 1] + c.w);

  function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
    const rr = Math.max(0, Math.min(r, Math.min(w / 2, h / 2)));
    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;
    return [
      `M ${x0 + rr} ${y0}`,
      `L ${x1 - rr} ${y0}`,
      `Q ${x1} ${y0} ${x1} ${y0 + rr}`,
      `L ${x1} ${y1 - rr}`,
      `Q ${x1} ${y1} ${x1 - rr} ${y1}`,
      `L ${x0 + rr} ${y1}`,
      `Q ${x0} ${y1} ${x0} ${y1 - rr}`,
      `L ${x0} ${y0 + rr}`,
      `Q ${x0} ${y0} ${x0 + rr} ${y0}`,
      "Z",
    ].join(" ");
  }

  function drawRoundedRect(
    page: any,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    opts: { fill?: any; border?: any; borderWidth?: number } = {},
  ) {
    const path = roundedRectPath(x, y, w, h, r);
    page.drawSvgPath(path, {
      color: opts.fill,
      borderColor: opts.border,
      borderWidth: opts.borderWidth ?? 1,
    });
  }

  function drawUnderline(page: any, x1: number, y: number, x2: number) {
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness: underlineThickness,
      color: theme.borderColor,
    });
  }

  function drawHeaderUi(page: any) {
    const yTop = pageHeight - marginTop;

    const titleW = fontBold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, {
      x: xLeft + contentW / 2 - titleW / 2,
      y: yTop - 20,
      size: titleSize,
      font: fontBold,
      color: theme.textColor,
    });

    const baseY = yTop - 64;

    const costrLabel = "COSTR.:";
    const costrValue = safeText(header.costr) || "—";
    const costrLabelW = fontBold.widthOfTextAtSize(costrLabel, metaLabelSize);

    page.drawText(costrLabel, { x: xLeft, y: baseY, size: metaLabelSize, font: fontBold, color: theme.textColor });
    page.drawText(costrValue, {
      x: xLeft + costrLabelW + 8,
      y: baseY,
      size: metaValueSize,
      font,
      color: theme.textColor,
    });
    drawUnderline(page, xLeft + costrLabelW + 8, baseY - 4, xLeft + 250);

    const commLabel = "Commessa:";
    const commValue = safeText(header.commessa) || "—";
    const commY = baseY - 26;
    const commLabelW = fontBold.widthOfTextAtSize(commLabel, metaLabelSize);

    page.drawText(commLabel, { x: xLeft, y: commY, size: metaLabelSize, font: fontBold, color: theme.textColor });
    page.drawText(commValue, {
      x: xLeft + commLabelW + 8,
      y: commY,
      size: metaValueSize,
      font,
      color: theme.textColor,
    });
    drawUnderline(page, xLeft + commLabelW + 8, commY - 4, xLeft + 250);

    const capoLabel = "Capo Squadra:";
    const capoValue = titleCaseHumanName(safeText(header.capo_name) || "—");
    const capoLineY = baseY;
    const capoLabelW = fontBold.widthOfTextAtSize(capoLabel, metaLabelSize);
    const capoValueW = font.widthOfTextAtSize(capoValue, metaValueSize);
    const capoTotalW = capoLabelW + 8 + capoValueW;
    const capoX = xLeft + contentW / 2 - capoTotalW / 2;

    page.drawText(capoLabel, { x: capoX, y: capoLineY, size: metaLabelSize, font: fontBold, color: theme.textColor });
    page.drawText(capoValue, { x: capoX + capoLabelW + 8, y: capoLineY, size: metaValueSize, font, color: theme.textColor });

    const dateLabel = "DATA:";
    const dateValue = formatItalianDateForPdf(header.data) || "—";
    const dateLabelW = fontBold.widthOfTextAtSize(dateLabel, metaLabelSize);
    const boxX = xRight - dateBoxW;
    const boxY = baseY - 6;

    page.drawText(dateLabel, {
      x: boxX - 10 - dateLabelW,
      y: baseY,
      size: metaLabelSize,
      font: fontBold,
      color: theme.textColor,
    });

    drawRoundedRect(page, boxX, boxY, dateBoxW, dateBoxH, dateBoxR, {
      fill: rgb(1, 1, 1),
      border: theme.borderColor,
      borderWidth: 1,
    });

    const dateTextW = font.widthOfTextAtSize(dateValue, metaValueSize);
    page.drawText(dateValue, {
      x: boxX + dateBoxW - 10 - dateTextW,
      y: boxY + 6,
      size: metaValueSize,
      font,
      color: theme.textColor,
    });
  }

  function drawFooter(page: any) {
    const sig = "© CNCS — CORE";
    const sigSize = 8.5;
    const sigW = font.widthOfTextAtSize(sig, sigSize);
    page.drawText(sig, { x: xRight - sigW, y: marginBottom - 2, size: sigSize, font, color: theme.mutedColor });
  }

  function drawTableFrame(page: any, tableTopY: number, tableBottomY: number) {
    const h = tableTopY - tableBottomY;

    // 1) Fill whole container with headerFill using rounded corners (so top corners stay rounded)
    drawRoundedRect(page, xLeft, tableBottomY, contentW, h, tableCornerR, {
      fill: theme.headerFill,
      border: theme.borderColor,
      borderWidth: 1,
    });

    // 2) Draw body white rectangle (keeps header area grey, body white)
    const bodyY = tableTopY - tableHeaderH;
    page.drawRectangle({
      x: xLeft + 1,
      y: tableBottomY + 1,
      width: contentW - 2,
      height: Math.max(0, bodyY - (tableBottomY + 1)),
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });

    // 3) Reinforce border on top (optional crisp)
    drawRoundedRect(page, xLeft, tableBottomY, contentW, h, tableCornerR, {
      fill: undefined,
      border: theme.borderColor,
      borderWidth: 1,
    });

    // Vertical grid lines only until tableBottomY (auto height)
    for (let i = 1; i < colX.length - 1; i++) {
      const x = colX[i];
      page.drawLine({
        start: { x, y: tableBottomY },
        end: { x, y: tableTopY },
        thickness: 1,
        color: theme.borderColor,
      });
    }

    // Header bottom line
    page.drawLine({
      start: { x: xLeft, y: tableTopY - tableHeaderH },
      end: { x: xRight, y: tableTopY - tableHeaderH },
      thickness: 1,
      color: theme.borderColor,
    });

    // Header text
    const headerLabelSize = 9;
    const headerSubSize = 8;
    const headerLabelY = tableTopY - 18;
    const headerSubY = tableTopY - 34;

    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      const cx = colX[i];

      const labelLines = wrapText(fontBold, c.label, headerLabelSize, c.w - theme.paddingX * 2);
      drawTextLines(page, fontBold, labelLines, cx + theme.paddingX, headerLabelY, headerLabelSize, 11, theme.textColor);

      const sub = safeText((c as any).subLabel);
      if (sub) {
        const subLines = wrapText(font, sub, headerSubSize, c.w - theme.paddingX * 2);
        drawTextLines(page, font, subLines, cx + theme.paddingX, headerSubY, headerSubSize, 10, theme.mutedColor);
      }
    }
  }

  function measureRowHeight(r: NormalizedRow): number {
    const maxLines = (text: string, w: number) => wrapText(font, text, theme.fontSize, w - theme.paddingX * 2).length;

    const linesCategoria = maxLines(r.categoria, col.categoria);
    const linesDesc = maxLines(r.descrizione, col.descrizione);
    const linesOps = maxLines(r.operatorsText, col.operatore);
    const linesTempo = maxLines(r.tempoText, col.tempo);
    const linesPrev = maxLines(r.previstoText, col.previsto);
    const linesProd = maxLines(r.prodottoText, col.prodotto);
    const linesNote = maxLines(r.note, col.note);
    const linesIndice = 1;

    const max = Math.max(linesCategoria, linesDesc, linesOps, linesTempo, linesPrev, linesProd, linesNote, linesIndice, 1);
    const h = max * theme.lineHeight + theme.paddingY * 2;
    return Math.max(22, h);
  }

  function drawRow(page: any, yTop: number, r: NormalizedRow, rowH: number) {
    const yTextTop = yTop - theme.paddingY - theme.fontSize;

    const cells = [
      { idx: 0, text: r.categoria, align: "left" as const },
      { idx: 1, text: r.descrizione, align: "left" as const },
      { idx: 2, text: r.operatorsText, align: "left" as const },
      { idx: 3, text: r.tempoText, align: "center" as const },
      { idx: 4, text: r.previstoText, align: "center" as const },
      { idx: 5, text: r.prodottoText, align: "center" as const },
      { idx: 6, text: r.note, align: "left" as const }, // keep empty if empty
      { idx: 7, text: "", align: "center" as const }, // INDICE empty if empty
    ];

    for (const c of cells) {
      const x = colX[c.idx];
      const w = columns[c.idx].w;
      const lines = wrapText(font, c.text, theme.fontSize, w - theme.paddingX * 2);

      if (c.align === "center") {
        let ty = yTextTop;
        for (const ln of lines) {
          const tw = font.widthOfTextAtSize(ln, theme.fontSize);
          page.drawText(ln, { x: x + w / 2 - tw / 2, y: ty, size: theme.fontSize, font, color: theme.textColor });
          ty -= theme.lineHeight;
        }
      } else {
        drawTextLines(page, font, lines, x + theme.paddingX, yTextTop, theme.fontSize, theme.lineHeight, theme.textColor);
      }
    }

    // Row bottom line (grid)
    page.drawLine({
      start: { x: xLeft, y: yTop - rowH },
      end: { x: xRight, y: yTop - rowH },
      thickness: 1,
      color: theme.borderColor,
    });
  }

  function renderPage(page: any, tableTopY: number, tableBottomY: number) {
    drawHeaderUi(page);
    drawTableFrame(page, tableTopY, tableBottomY);
  }

  const yTop = pageHeight - marginTop;
  const headerBottomY = yTop - 92;
  const tableTopY = headerBottomY - 22;

  // Available height for body rows (we paginate, but table bottom is auto per page)
  const maxBodyBottomY = marginBottom + 22;
  const maxBodyHeight = (tableTopY - tableHeaderH) - maxBodyBottomY;

  // Pre-measure heights
  const measured = rows.map((r) => ({ r, h: measureRowHeight(r) }));

  // Paginate rows based on maxBodyHeight
  const pages: Array<{ rows: Array<{ r: NormalizedRow; h: number }>; totalH: number }> = [];
  let cur: Array<{ r: NormalizedRow; h: number }> = [];
  let curH = 0;

  for (const item of measured) {
    if (cur.length === 0) {
      cur.push(item);
      curH = item.h;
      continue;
    }
    if (curH + item.h <= maxBodyHeight) {
      cur.push(item);
      curH += item.h;
    } else {
      pages.push({ rows: cur, totalH: curH });
      cur = [item];
      curH = item.h;
    }
  }
  if (cur.length > 0) pages.push({ rows: cur, totalH: curH });
  if (pages.length === 0) pages.push({ rows: [], totalH: 60 });

  // Render each page with auto tableBottomY
  for (let p = 0; p < pages.length; p++) {
    const page = doc.addPage([pageWidth, pageHeight]);

    const pageRows = pages[p].rows;
    const totalBodyH = pages[p].totalH;

    // Auto bottom: stop exactly after last row (small padding to make bottom look clean)
    const padBottom = 6; // pt
    const computedBottom = tableTopY - tableHeaderH - totalBodyH - padBottom;

    // Never go below the minimal bottom margin area (safety)
    const tableBottomY = Math.max(maxBodyBottomY, computedBottom);

    renderPage(page, tableTopY, tableBottomY);

    let cursorY = tableTopY - tableHeaderH;
    for (const item of pageRows) {
      drawRow(page, cursorY, item.r, item.h);
      cursorY -= item.h;
    }

    drawFooter(page);
  }

  return await doc.save();
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
      if (hErr) return json(500, { ok: false, error: `rapportini read error: ${String((hErr as any)?.message ?? hErr)}` });
      if (!hP) return json(404, { ok: false, error: "Rapportino not found" });
      header = hP as RapportinoHeader;
      isOfficial = false;
    }

    const capoLabel = await resolveCapoLabel(admin, header);
    const headerResolved: RapportinoHeader = { ...header, capo_name: capoLabel };

    let rows: NormalizedRow[] = [];

    if (isOfficial && mode !== "DRAFT") {
      const { data: rA, error: rAErr } = await admin
        .from("archive.rapportino_rows")
        .select("id,rapportino_id,row_index,position,categoria,descrizione,operatori,tempo,previsto,prodotto,note,updated_at")
        .eq("rapportino_id", rapportinoId);

      if (rAErr) return json(500, { ok: false, error: `archive rows read error: ${String((rAErr as any)?.message ?? rAErr)}` });

      const archiveRows = (rA ?? []) as ArchiveRow[];

      if (archiveRows.length > 0) {
        rows = normalizeRowsFromArchiveRows(archiveRows);
      } else {
        const { data: rLegacy, error: rLErr } = await admin
          .from("archive.rapportino_righe")
          .select("id,rapportino_id,idx,categoria,descrizione,previsto,prodotto,note,operai")
          .eq("rapportino_id", rapportinoId);

        if (rLErr) return json(500, { ok: false, error: `archive legacy rows read error: ${String((rLErr as any)?.message ?? rLErr)}` });

        rows = normalizeRowsFromArchiveLegacy(((rLegacy ?? []) as ArchiveRigaLegacy[]) ?? []);
      }
    } else {
      const { data: rP, error: rErr } = await admin
        .from("rapportino_rows")
        .select("id,rapportino_id,row_index,position,categoria,descrizione,operatori,tempo,previsto,prodotto,note,activity_id,updated_at")
        .eq("rapportino_id", rapportinoId);

      if (rErr) return json(500, { ok: false, error: `rapportino_rows read error: ${String((rErr as any)?.message ?? rErr)}` });

      rows = normalizeRowsFromPublic(((rP ?? []) as PublicRow[]) ?? []);
    }

    const payload = buildCanonicalPayload(headerResolved, rows);
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

    const pdfBytes = await renderRapportinoPdf({ header: headerResolved, rows, isOfficial });
    const sha256 = await sha256HexBytes(pdfBytes);
    const sizeBytes = pdfBytes.byteLength;

    let cantiere = "UNKNOWN";
    try {
      const costr = safeText(headerResolved.costr);
      const commessa = safeText(headerResolved.commessa);
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

    const costrSafe = safeText(headerResolved.costr) || "NA";
    const commessaSafe = safeText(headerResolved.commessa) || "NA";
    const dateSafe = safeText(headerResolved.data) || "NA";
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
      commessa: headerResolved.commessa,
      categoria: categoria,
      origine: origine,
      stato_doc: statoDoc,
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
