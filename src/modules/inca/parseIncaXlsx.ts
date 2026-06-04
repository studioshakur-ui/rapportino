// src/modules/inca/parseIncaXlsx.ts
// Parser XLSX INCA (recyclé en TypeScript depuis l'ancien parseIncaXlsx.js).
//
// - "MARCA CAVO" = identifiant réellement unique (ex: 1-1 N AH163)
// - "CODICE CAVO" peut être court et NON unique
// - "STATO CANTIERE" contient P/B/T/R... (situation chantier réelle)
// Aucun dé-doublonnage ici.
import * as XLSX from "xlsx";

export type ParsedCavo = {
  marca_cavo: string | null;
  codice_cavo: string | null;
  livello_disturbo: string | null;
  tipo_cavo: string | null;
  situazione_cavo: string | null;
  stato_tec: string | null;
  stato_cantiere: string | null;
  app_partenza: string | null;
  app_partenza_zona: string | null;
  app_partenza_descrizione: string | null;
  app_arrivo: string | null;
  app_arrivo_zona: string | null;
  app_arrivo_descrizione: string | null;
  lunghezza_disegno: number | null;
  lunghezza_posa: number | null;
  lunghezza_calcolo: number | null;
  sezione: string | null;
  wbs: string | null;
  rev_inca: string | null;
  zona: string | null;
  richiesta_taglio: string | null;
  data_richiesta_taglio: string | null;
};

const normHeader = (v: unknown): string =>
  String(v ?? "").replace(/\s+/g, " ").trim().toUpperCase();

const toStr = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function parseIncaXlsx(file: File): Promise<ParsedCavo[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames?.[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  if (!rows || rows.length === 0) return [];

  // 1) ligne d'en-tête (MARCA CAVO + CODICE CAVO)
  let headerRowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const upper = row.map(normHeader);
    if (upper.some((h) => h.includes("MARCA CAVO")) && upper.some((h) => h.includes("CODICE CAVO"))) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) return [];

  const header = (rows[headerRowIndex] || []).map(normHeader);
  const findCol = (...labels: string[]): number => {
    for (const lab of labels) {
      const idx = header.findIndex((h) => h === normHeader(lab));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const c = {
    marca: findCol("MARCA CAVO"),
    codice: findCol("CODICE CAVO"),
    livello: findCol("LIVELLO DISTURBO"),
    tipo: findCol("TIPO CAVO"),
    situazione: findCol("SITUAZIONE CAVO"),
    stato_tec: findCol("STATO TEC"),
    stato_cantiere: findCol("STATO CANTIERE"),
    app_da: findCol("APP PARTENZA"),
    app_da_locale: findCol("APP PARTENZA - LOCALE"),
    app_da_descr: findCol("APP PARTENZA - DESCRIZIONE"),
    app_a: findCol("APP ARRIVO"),
    app_a_locale: findCol("APP ARRIVO - LOCALE"),
    app_a_descr: findCol("APP ARRIVO- DESCRIZIONE", "APP ARRIVO - DESCRIZIONE"),
    lung_dis: findCol("LUNGHEZZA DI DISEGNO"),
    lung_posa: findCol("LUNGHEZZA DI POSA"),
    lung_calc: findCol("LUNGHEZZA DI CALCOLO"),
    sezione: findCol("SEZIONE"),
    wbs: findCol("WBS"),
    rev_inca: findCol("REVISIONE"),
    zona: findCol("ZONA"),
    richiesta_taglio: findCol("RICHIESTA TAGLIO"),
    data_richiesta_taglio: findCol("DATA RICHIESTA TAGLIO"),
  };

  const at = (row: unknown[], idx: number): unknown => (idx >= 0 ? row[idx] : null);
  const result: ParsedCavo[] = [];

  for (const row of rows.slice(headerRowIndex + 1)) {
    if (!Array.isArray(row)) continue;
    const marca = toStr(at(row, c.marca));
    const codice = toStr(at(row, c.codice));
    if (!marca && !codice) continue;

    result.push({
      marca_cavo: marca,
      codice_cavo: codice,
      livello_disturbo: toStr(at(row, c.livello)),
      tipo_cavo: toStr(at(row, c.tipo)),
      situazione_cavo: toStr(at(row, c.situazione)),
      stato_tec: toStr(at(row, c.stato_tec)),
      stato_cantiere: toStr(at(row, c.stato_cantiere)),
      app_partenza: toStr(at(row, c.app_da)),
      app_partenza_zona: toStr(at(row, c.app_da_locale)),
      app_partenza_descrizione: toStr(at(row, c.app_da_descr)),
      app_arrivo: toStr(at(row, c.app_a)),
      app_arrivo_zona: toStr(at(row, c.app_a_locale)),
      app_arrivo_descrizione: toStr(at(row, c.app_a_descr)),
      lunghezza_disegno: toNum(at(row, c.lung_dis)),
      lunghezza_posa: toNum(at(row, c.lung_posa)),
      lunghezza_calcolo: toNum(at(row, c.lung_calc)),
      sezione: toStr(at(row, c.sezione)),
      wbs: toStr(at(row, c.wbs)),
      rev_inca: toStr(at(row, c.rev_inca)),
      zona: toStr(at(row, c.zona)),
      richiesta_taglio: toStr(at(row, c.richiesta_taglio)),
      data_richiesta_taglio: toStr(at(row, c.data_richiesta_taglio)),
    });
  }

  return result;
}
