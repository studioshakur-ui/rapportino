// supabase/functions/_shared/readXlsx.ts
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

export type XlsxRow = Record<string, unknown>;

/**
 * Reads an XLSX ArrayBuffer and returns rows from the given sheet as objects keyed by header.
 * Assumes first row contains headers.
 */
export function readSheetRowsFromXlsx(buffer: ArrayBuffer, sheetName: string): XlsxRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    const names = wb.SheetNames.join(", ");
    throw new Error(`Sheet "${sheetName}" not found. Available: ${names}`);
  }
  const rows = XLSX.utils.sheet_to_json<XlsxRow>(ws, { defval: "" });
  return rows || [];
}
