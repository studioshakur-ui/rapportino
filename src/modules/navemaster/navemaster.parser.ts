import * as XLSX from "xlsx";
import type {
  NavemasterImportMeta,
  NavemasterParseOptions,
  NavemasterParsedRow,
  NavemasterWorkbookParseResult,
} from "./navemaster.types";
import { normalizeNavemasterCode } from "./navemaster.mapping";

const SHEET_NAME = "INCA";
const HEADER_ROW_INDEX = 5;
const DATA_START_ROW_INDEX = 6;
const CORE_COMMAND_SHIP_ID = "cc000000-0000-0000-0000-000000000001";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeCell(value: unknown): unknown {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value === undefined) return null;
  if (typeof value === "string") {
    const text = value.replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
    return text.length > 0 ? text : null;
  }
  return value ?? null;
}

function parseTitleMeta(title: string | null): { costr: string | null; commessa: string | null } {
  if (!title) return { costr: null, commessa: null };
  const match = title.match(/C\.?\s*(\d+)\s*-\s*([A-Z0-9_-]+)/i);
  return {
    commessa: match?.[1] ?? null,
    costr: match?.[2]?.toUpperCase() ?? null,
  };
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function parseNavemasterWorkbook(file: File, options: NavemasterParseOptions = {}): Promise<NavemasterWorkbookParseResult> {
  options.onProgress?.({ phase: "reading", processedRows: 0, totalRows: 0, percent: 0 });
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    sheetRows: options.maxRows && options.maxRows > 0 ? HEADER_ROW_INDEX + options.maxRows : undefined,
  });
  const worksheet = workbook.Sheets[SHEET_NAME];
  if (!worksheet) throw new Error(`Onglet ${SHEET_NAME} introuvable`);

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const headerRow = matrix[HEADER_ROW_INDEX - 1] ?? [];
  const headers = headerRow.map(normalizeHeader);
  if (!headers[0] || headers[0] !== "MARCACAVO") {
    throw new Error("Header INCA invalide : ligne 5 attendue avec MARCACAVO");
  }

  const title = normalizeHeader(matrix[0]?.[0] ?? null) || null;
  const metaBits = parseTitleMeta(title);
  const rows: NavemasterParsedRow[] = [];
  const maxRows = options.maxRows ?? 0;
  const rowLimit = maxRows > 0 ? Math.min(matrix.length, (DATA_START_ROW_INDEX - 1) + maxRows) : matrix.length;
  const totalScanRows = Math.max(rowLimit - (DATA_START_ROW_INDEX - 1), 0);
  const progressStep = Math.max(1, Math.ceil(totalScanRows / 100));

  for (let index = DATA_START_ROW_INDEX - 1; index < rowLimit; index += 1) {
    const source = matrix[index] ?? [];
    const values: Record<string, unknown> = {};
    let hasAnyValue = false;

    headers.forEach((header, columnIndex) => {
      if (!header) return;
      const cellValue = sanitizeCell(source[columnIndex]);
      values[header] = cellValue;
      if (cellValue !== null) hasAnyValue = true;
    });

    if (!hasAnyValue) continue;
    const code = normalizeNavemasterCode(values.MARCACAVO);
    if (!code || ["TOT. CAVI", "~", "MARCACAVO"].includes(code)) continue;

    rows.push({ rowIndex: index + 1, values });

    const processedRows = index - (DATA_START_ROW_INDEX - 1) + 1;
    if (processedRows % progressStep === 0 || processedRows === totalScanRows) {
      options.onProgress?.({
        phase: "scanning",
        processedRows,
        totalRows: totalScanRows,
        percent: totalScanRows > 0 ? Math.round((processedRows / totalScanRows) * 100) : 100,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const meta: NavemasterImportMeta = {
    shipId: CORE_COMMAND_SHIP_ID,
    fileName: file.name,
    importedAt: new Date().toISOString(),
    sourceSha256: await sha256Hex(buffer),
    sheetName: SHEET_NAME,
    headerRowIndex: HEADER_ROW_INDEX,
    dataStartRowIndex: DATA_START_ROW_INDEX,
    totalRows: rows.length,
    costr: metaBits.costr,
    commessa: metaBits.commessa,
    title,
  };

  options.onProgress?.({
    phase: "done",
    processedRows: totalScanRows,
    totalRows: totalScanRows,
    percent: 100,
  });

  return { meta, headers, rows, isPreview: maxRows > 0 && rows.length >= maxRows };
}
