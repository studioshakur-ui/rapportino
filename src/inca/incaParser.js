
// src/inca/incaParser.js
// Parsing des fichiers INCA (XLSX / CSV pour cette première version).
//
// NOTE IMPORTANTE:
// - PDF et photo/scan ne sont pas parsés automatiquement ici.
//   Pour ces formats, il est conseillé d'exporter d'INCA vers Excel/CSV
//   puis d'utiliser cet importateur.
//
// On utilise la librairie "xlsx" déjà présente dans ton projet.

import * as XLSX from "xlsx";

export function detectIncaFileKind(file) {
  const name = (file?.name || "").toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".pdf")) return "pdf";
  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  )
    return "image";

  // fallback grossier
  if (file?.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return "xlsx";
  if (file?.type === "text/csv") return "csv";
  if (file?.type === "application/pdf") return "pdf";

  return "unknown";
}

/**
 * Parse un fichier INCA et renvoie { cavi, percorsiByCodice }
 *
 * cavi: [{ codice, descrizione, impianto, tipo, sezione, zona_da, zona_a,
 *          metri_teo, metri_dis, metri_sit_cavo, ... }]
 * percorsiByCodice: { [codice]: [support1, support2, ...] }
 */
export async function parseIncaFile(file) {
  const kind = detectIncaFileKind(file);

  if (kind === "xlsx") {
    return parseXlsxFile(file);
  } else if (kind === "csv") {
    return parseCsvFile(file);
  } else if (kind === "pdf" || kind === "image") {
    throw new Error(
      "Import PDF/immagine non ancora automatico in questa versione. " +
        "Esporta prima da INCA in Excel/CSV e poi importa qui."
    );
  } else {
    throw new Error(
      "Tipo di file non riconosciuto. Usa un file Excel (.xlsx) o CSV esportato da INCA."
    );
  }
}

async function parseXlsxFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  if (!rows || rows.length < 2) {
    throw new Error("Il file Excel non contiene dati sufficienti.");
  }

  const headerRow = rows[0] || [];
  const dataRows = rows.slice(1);

  const headerMap = buildHeaderMap(headerRow);

  const cavi = [];
  for (const row of dataRows) {
    const cavo = buildCavoFromRow(row, headerMap);
    if (!cavo.codice) continue;
    cavi.push(cavo);
  }

  return {
    cavi,
    percorsiByCodice: {}, // supporti non gérés dans cette première version
  };
}

async function parseCsvFile(file) {
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(";"))
    .filter((r) => r.some((cell) => cell && cell.trim() !== ""));

  if (!rows || rows.length < 2) {
    throw new Error("Il file CSV non contiene dati sufficienti.");
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  const headerMap = buildHeaderMap(headerRow);

  const cavi = [];
  for (const row of dataRows) {
    const cavo = buildCavoFromRow(row, headerMap);
    if (!cavo.codice) continue;
    cavi.push(cavo);
  }

  return {
    cavi,
    percorsiByCodice: {},
  };
}

/**
 * Construit une map: index colonne -> champ standard
 */
function buildHeaderMap(headerRow) {
  const map = {};

  headerRow.forEach((raw, index) => {
    if (!raw) return;
    const h = String(raw).trim().toUpperCase();

    if (["CODICE", "CAVO", "CAVO COD.", "N° CAVO"].includes(h)) {
      map[index] = "codice";
    } else if (h.includes("DESCR") && !h.includes("DA") && !h.includes("A ")) {
      map[index] = "descrizione";
    } else if (h.includes("IMPIANTO")) {
      map[index] = "impianto";
    } else if (h.includes("TIPO")) {
      map[index] = "tipo";
    } else if (h.includes("SEZION")) {
      map[index] = "sezione";
    } else if (h.includes("ZONA DA")) {
      map[index] = "zona_da";
    } else if (h.includes("ZONA A")) {
      map[index] = "zona_a";
    } else if (h.includes("APPARATO DA")) {
      map[index] = "apparato_da";
    } else if (h.includes("APPARATO A")) {
      map[index] = "apparato_a";
    } else if (h.includes("DESCR") && h.includes("DA")) {
      map[index] = "descrizione_da";
    } else if (h.includes("DESCR") && (h.endsWith(" A") || h.includes(" A "))) {
      map[index] = "descrizione_a";
    } else if (h.includes("MT TEO") || h.includes("METRI TEO")) {
      map[index] = "metri_teo";
    } else if (h.includes("MT DIS") || h.includes("METRI DIS")) {
      map[index] = "metri_dis";
    } else if (h.includes("SIT CAVO")) {
      map[index] = "metri_sit_cavo";
    } else if (h.includes("SIT TEC")) {
      map[index] = "metri_sit_tec";
    } else if (h.includes("PAGINA")) {
      map[index] = "pagina_pdf";
    } else if (h.includes("REV")) {
      map[index] = "rev_inca";
    } else if (h.includes("STATO")) {
      map[index] = "stato_inca";
    }
  });

  return map;
}

function buildCavoFromRow(row, headerMap) {
  const cavo = {
    codice: null,
    descrizione: null,
    impianto: null,
    tipo: null,
    sezione: null,
    zona_da: null,
    zona_a: null,
    apparato_da: null,
    apparato_a: null,
    descrizione_da: null,
    descrizione_a: null,
    metri_teo: null,
    metri_dis: null,
    metri_sit_cavo: null,
    metri_sit_tec: null,
    pagina_pdf: null,
    rev_inca: null,
    stato_inca: null,
  };

  row.forEach((cell, index) => {
    const key = headerMap[index];
    if (!key) return;
    const value = cell == null ? null : String(cell).trim();
    if (value === "") return;

    if (
      key === "metri_teo" ||
      key === "metri_dis" ||
      key === "metri_sit_cavo" ||
      key === "metri_sit_tec"
    ) {
      cavo[key] = value.replace(",", ".");
    } else if (key === "pagina_pdf") {
      const num = parseInt(value, 10);
      if (!Number.isNaN(num)) cavo[key] = num;
    } else {
      cavo[key] = value;
    }
  });

  return cavo;
}
