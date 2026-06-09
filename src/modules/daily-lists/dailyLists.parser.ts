// src/modules/daily-lists/dailyLists.parser.ts
// Parse PDF or Excel daily-list files into ParsedListRow[].
// NO LLM. NO INCA writes. Pure deterministic extraction.
//
// PDF table structure (from INCA export):
//   LISTA | RISOLUZIONE LISTA | MARCA PEZZO | STATO COLLEGAMENTO |
//   APP-PARTENZA | APP-ARRIVO | PERIMETRO | DATA PERIMETRO |
//   SITUAZIONE INCA | NOTE

import type { ParsedListRow, ParseResult } from "./dailyLists.types";
import { normalizeCableLoose } from "../../core/cable/cableIdentity";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Vite ?url import for pdfjs worker
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = String(pdfWorkerUrl);

// ── Constants ──────────────────────────────────────────────────────────────
const EXPECTED_HEADERS = [
  "LISTA",
  "RISOLUZIONE",
  "MARCA PEZZO",
  "STATO COLLEGAMENTO",
  "APP-PARTENZA",
  "APP-ARRIVO",
  "PERIMETRO",
  "DATA PERIMETRO",
  "SITUAZIONE",
  "NOTE",
] as const;

// Section prefix regex: "1-7 " or "A-3 " at start
const SECTION_PREFIX_RE = /^\d+[-/]\d+\s+/;

// ── Cable code normalisation ───────────────────────────────────────────────
// Delegates to the canonical LOOSE key (single source of truth). Behaviour is
// identical to the previous inline implementation (prefix-stripped):
//   "N NR 003" -> "NNR 003", "I RS 002" -> "IRS 002".
// The prefix-preserving STRICT key lives in core/cable/cableIdentity.ts.
export function normalizePdfCableCode(raw: string): string {
  return normalizeCableLoose(raw);
}

// ── Raw code for INCA matching (inca_cavi.marca_cavo uses spaced format) ───
// "N NR 003" stays as-is, just strip section prefix
export function rawCodeForInca(raw: string): string {
  return raw.replace(SECTION_PREFIX_RE, "").trim().toUpperCase();
}

// ── Date parsing ───────────────────────────────────────────────────────────
function parseItalianDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  // DD/MM/YYYY
  const m = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

function detectListDate(rows: ParsedListRow[]): string | null {
  // Use the first non-null risoluzione date as list_date
  for (const r of rows) {
    const d = parseItalianDate(r.risoluzione);
    if (d) return d;
  }
  return null;
}

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "null" || s === "undefined" ? null : s;
}

// ── PDF parsing ────────────────────────────────────────────────────────────
// Strategy: extract text items with positions, group by Y-row, map columns.
interface TextItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

async function extractPdfTextItems(buffer: ArrayBuffer): Promise<TextItem[]> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const items: TextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      if (!("str" in raw)) continue;
      const item = raw as { str: string; transform: number[] };
      if (!item.str.trim()) continue;
      items.push({
        str: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        page: pageNum,
      });
    }
  }
  return items;
}

function groupByRow(items: TextItem[], yTolerance = 4): TextItem[][] {
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y); // PDF y is bottom-up
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let lastY: number | null = null;
  let lastPage: number | null = null;

  for (const item of sorted) {
    if (lastY === null || lastPage === item.page && Math.abs(item.y - lastY) <= yTolerance) {
      currentRow.push(item);
      lastY = item.y;
      lastPage = item.page;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
      lastY = item.y;
      lastPage = item.page;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  // Sort items within each row by x
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

function detectColumnBoundaries(headerRow: TextItem[]): number[] {
  // Return x-boundaries for each column based on header positions
  return headerRow.map((item) => item.x);
}

function assignItemsToColumns(
  rowItems: TextItem[],
  colBoundaries: number[]
): string[] {
  const cols: string[][] = Array.from({ length: colBoundaries.length }, () => []);

  for (const item of rowItems) {
    // Find the nearest column boundary to the left
    let colIdx = 0;
    for (let i = 0; i < colBoundaries.length; i++) {
      if (item.x >= colBoundaries[i] - 5) colIdx = i;
    }
    cols[colIdx]!.push(item.str);
  }

  return cols.map((c) => c.join(" ").trim());
}

// Detect "3 05/06/2026" → lista="3", risoluzione="05/06/2026"
function splitListaRisol(s: string): { lista: string | null; risoluzione: string | null } {
  const m = s.match(/^(\d+)\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (m) return { lista: m[1], risoluzione: m[2] };
  if (/^\d+$/.test(s.trim())) return { lista: s.trim(), risoluzione: null };
  return { lista: null, risoluzione: null };
}

// Detect "R IF 008 1" → marca="R IF 008", stato="1"
function splitMarcaStato(s: string): { marca: string; stato: string | null } {
  const m = s.match(/^(.*\d{3})\s+([012])$/);
  if (m && /[A-Za-z]/.test(m[1])) return { marca: m[1].trim(), stato: m[2] };
  return { marca: s, stato: null };
}

// Is this string a cable code? (letter + letters + digits pattern)
function looksLikeCableCode(s: string): boolean {
  if (!s || s.length < 4) return false;
  // Matches: "R IF 008", "C CS 503", "I RS 001", "1-7 N HP005"
  return /^(\d+-\d+\s+)?[A-Z]\s*[A-Z]{1,3}\s*\d{3}/i.test(s.trim());
}

function rowsToParsedList(dataRows: string[][]): ParsedListRow[] {
  const result: ParsedListRow[] = [];

  for (const rawCols of dataRows) {
    // ── Detect column merging and fix ────────────────────────────────────
    let cols = [...rawCols];

    // Case: col[0] = "3 05/06/2026" (lista+risoluzione merged)
    const col0Split = splitListaRisol(cols[0] ?? "");
    if (col0Split.risoluzione) {
      // Insert the split values at positions 0 and 1, shifting rest
      cols = [col0Split.lista ?? "", col0Split.risoluzione, ...cols.slice(1)];
    }

    // Case: col[2] looks like "R IF 008 1" (marca+stato merged) OR
    //       col[2] doesn't look like a cable code but col[1] does
    let marcaRaw = cols[2] ?? "";
    let statoRaw = cols[3] ?? null;

    if (marcaRaw && !looksLikeCableCode(marcaRaw)) {
      // Try col[1] as cable code (one column shift)
      if (looksLikeCableCode(cols[1] ?? "")) {
        const { marca, stato } = splitMarcaStato(cols[1] ?? "");
        cols = [cols[0], cols[1], ...cols.slice(2)]; // keep as-is
        marcaRaw = marca;
        if (stato && !statoRaw) statoRaw = stato;
      }
    }

    // Case: col[2] = "R IF 008 1" (cable code with stato appended)
    if (looksLikeCableCode(marcaRaw)) {
      const { marca, stato } = splitMarcaStato(marcaRaw);
      marcaRaw = marca;
      if (stato && !statoRaw) statoRaw = stato;
    }

    const marcaPezzo = clean(marcaRaw);
    if (!marcaPezzo || marcaPezzo.length < 3) continue;
    // Skip footer/label rows
    if (/^[A-Z\s]+$/.test(marcaPezzo) && !looksLikeCableCode(marcaPezzo)) continue;
    if (!looksLikeCableCode(marcaPezzo)) continue;

    result.push({
      lista:              clean(cols[0]),
      risoluzione:        clean(cols[1]),
      marca_pezzo:        marcaPezzo,
      stato_collegamento: clean(statoRaw ?? cols[3]),
      app_partenza:       clean(cols[4]),
      app_arrivo:         clean(cols[5]),
      perimetro:          clean(cols[6]),
      data_perimetro:     parseItalianDate(clean(cols[7])),
      situazione_inca:    clean(cols[8]),
      note:               clean(cols[9]),
    });
  }
  return result;
}

function parseL4TextLine(line: string): ParsedListRow | null {
  const normalizedLine = line.replace(/\s+/g, " ").trim();
  const head = normalizedLine.match(/^(\d+)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/);
  if (!head) return null;

  const lista = head[1];
  const risoluzione = head[2];
  const tokens = head[3].split(" ").filter(Boolean);
  const firstAppIndex = tokens.findIndex((token) => /^\d{12}$/.test(token));
  if (firstAppIndex <= 0 || firstAppIndex + 1 >= tokens.length || !/^\d{12}$/.test(tokens[firstAppIndex + 1])) return null;

  const beforeApp = tokens.slice(0, firstAppIndex).join(" ");
  const appPartenza = tokens[firstAppIndex];
  const appArrivo = tokens[firstAppIndex + 1];
  const afterApps = tokens.slice(firstAppIndex + 2);
  let dateIndex = afterApps.findIndex((token) => parseItalianDate(token) !== null);
  const tbcIndex = afterApps.findIndex((token) => token.toUpperCase() === "TBC");
  const hasTbcDate = dateIndex < 0 && tbcIndex >= 0;
  if (hasTbcDate) dateIndex = tbcIndex;
  if (dateIndex < 0) return null;

  const marcaMatch = beforeApp.match(/^((?:\d+[-/]\d+\s+)?[A-Z]\s*[A-Z]{1,4}\s*\d{2,5}[A-Z]?)(?:\s+([A-Z0-9]))?$/i);
  if (!marcaMatch) return null;

  const marcaPezzo = clean(marcaMatch[1]);
  if (!marcaPezzo || !looksLikeCableCode(marcaPezzo)) return null;

  const dataPerimetro = hasTbcDate ? null : parseItalianDate(afterApps[dateIndex]);
  const perimetro = afterApps.slice(0, dateIndex).join(" ");
  const situazioneInca = hasTbcDate ? null : afterApps[dateIndex + 1] ?? null;
  const note = afterApps.slice(hasTbcDate ? dateIndex + 1 : dateIndex + 2).join(" ");

  return {
    lista,
    risoluzione,
    marca_pezzo: marcaPezzo,
    stato_collegamento: clean(marcaMatch[2]),
    app_partenza: clean(appPartenza),
    app_arrivo: clean(appArrivo),
    perimetro: clean(perimetro),
    data_perimetro: dataPerimetro,
    situazione_inca: clean(situazioneInca),
    note: clean(note),
  };
}

export function parseL4TextRows(lines: string[]): ParsedListRow[] {
  const rows: ParsedListRow[] = [];
  for (const line of lines) {
    const parsed = parseL4TextLine(line);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

export async function parsePdf(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const items  = await extractPdfTextItems(buffer);
  const rows   = groupByRow(items);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].map((t) => t.str).join(" ").toUpperCase();
    if (joined.includes("MARCA PEZZO") || joined.includes("MARCA")) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    warnings.push("En-tête de tableau non trouvé dans le PDF. Vérifiez le format.");
    return { rows: [], detected_date: null, source_kind: "pdf", warnings };
  }

  const colBoundaries = detectColumnBoundaries(rows[headerIdx]);

  const dataRows: string[][] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = assignItemsToColumns(rows[i], colBoundaries);
    if (cells.some((c) => c.length > 0)) {
      dataRows.push(cells);
    }
  }

  let parsedRows = rowsToParsedList(dataRows);
  if (parsedRows.length === 0) {
    parsedRows = parseL4TextRows(rows.slice(headerIdx + 1).map((row) => row.map((item) => item.str).join(" ")));
  }

  if (parsedRows.length === 0) {
    warnings.push("Nessuna riga estratta dal PDF. Usa Excel oppure un PDF con testo tabellare selezionabile.");
  }

  return {
    rows: parsedRows,
    detected_date: detectListDate(parsedRows),
    source_kind: "pdf",
    warnings,
  };
}

// ── Excel parsing ──────────────────────────────────────────────────────────
// Expected columns (case-insensitive, flexible matching):
// LISTA | RISOLUZIONE LISTA | MARCA PEZZO | STATO COLLEGAMENTO |
// APP-PARTENZA | APP-ARRIVO | PERIMETRO | DATA PERIMETRO | SITUAZIONE INCA | NOTE
const EXCEL_COL_MAP: Record<string, keyof ParsedListRow> = {
  "lista":                 "lista",
  "risoluzione lista":     "risoluzione",
  "risoluzione":           "risoluzione",
  "marca pezzo":           "marca_pezzo",
  "marca cavo":            "marca_pezzo",   // SDC Excel variant
  "stato collegamento":    "stato_collegamento",
  "app-partenza":          "app_partenza",
  "app partenza":          "app_partenza",
  "app-arrivo":            "app_arrivo",
  "app arrivo":            "app_arrivo",
  "perimetro":             "perimetro",
  "data perimetro":        "data_perimetro",
  "data di posa":          "data_perimetro", // SDC fallback
  "situazione inca":       "situazione_inca",
  "situazione":            "situazione_inca",
  "note":                  "note",
  "nota":                  "note",
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase();
}

export async function parseExcel(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], detected_date: null, source_kind: "excel", warnings: ["Excel vide."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  if (raw.length === 0) {
    return { rows: [], detected_date: null, source_kind: "excel", warnings: ["Feuille vide."] };
  }

  // Try to find the header row (Excel might have extra rows before headers)
  let startIdx = 0;
  let colMapping: Record<string, keyof ParsedListRow> = {};

  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const keys = Object.keys(raw[i]);
    const mapped: Record<string, keyof ParsedListRow> = {};
    let hits = 0;
    for (const k of keys) {
      const norm = normalizeHeader(raw[i][k] ?? k);
      if (EXCEL_COL_MAP[norm]) {
        mapped[k] = EXCEL_COL_MAP[norm];
        hits++;
      }
    }
    if (hits >= 2) {
      // Found a header row
      colMapping = mapped;
      startIdx = i + 1;
      break;
    }
  }

  // If no header found, try column names directly
  if (Object.keys(colMapping).length === 0) {
    for (const k of Object.keys(raw[0] ?? {})) {
      const norm = normalizeHeader(k);
      if (EXCEL_COL_MAP[norm]) {
        colMapping[k] = EXCEL_COL_MAP[norm];
      }
    }
    startIdx = 0;
  }

  if (!Object.values(colMapping).includes("marca_pezzo")) {
    warnings.push(
      `Colonne MARCA PEZZO non trouvée. Colonnes disponibles: ${Object.keys(raw[0] ?? {}).join(", ")}`
    );
  }

  const parsedRows: ParsedListRow[] = [];

  for (let i = startIdx; i < raw.length; i++) {
    const rowRaw = raw[i];
    const row: Partial<ParsedListRow> = {};

    for (const [excelKey, fieldKey] of Object.entries(colMapping)) {
      const v = rowRaw[excelKey];
      if (fieldKey === "data_perimetro") {
        (row as Record<string, string | null>)[fieldKey] = parseItalianDate(v != null ? String(v) : null);
      } else {
        (row as Record<string, string | null>)[fieldKey] = clean(v);
      }
    }

    if (!row.marca_pezzo) continue;
    parsedRows.push({
      lista:              row.lista ?? null,
      risoluzione:        row.risoluzione ?? null,
      marca_pezzo:        row.marca_pezzo,
      stato_collegamento: row.stato_collegamento ?? null,
      app_partenza:       row.app_partenza ?? null,
      app_arrivo:         row.app_arrivo ?? null,
      perimetro:          row.perimetro ?? null,
      data_perimetro:     row.data_perimetro ?? null,
      situazione_inca:    row.situazione_inca ?? null,
      note:               row.note ?? null,
    });
  }

  if (parsedRows.length === 0) {
    warnings.push("Aucune ligne de données extraite.");
  }

  return {
    rows: parsedRows,
    detected_date: detectListDate(parsedRows),
    source_kind: "excel",
    warnings,
  };
}

// ── Main entry ─────────────────────────────────────────────────────────────
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.toLowerCase();
  if (ext.endsWith(".pdf")) return parsePdf(file);
  if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) return parseExcel(file);
  return {
    rows: [],
    detected_date: null,
    source_kind: "excel",
    warnings: [`Format non supporté: ${file.name}. Utilisez PDF ou Excel.`],
  };
}

// ── Re-exports ─────────────────────────────────────────────────────────────
export { EXPECTED_HEADERS };
