// src/inca/parseIncaXlsx.js
import * as XLSX from "xlsx";

/**
 * Parse un fichier XLSX exporté depuis INCA.
 *
 * Retourne un tableau d'objets "cavo" avec les champs utilisés par IncaUploadPanel :
 *  - marca_cavo
 *  - codice_cavo
 *  - livello_disturbo
 *  - tipo_cavo
 *  - situazione_cavo
 *  - stato_tec
 *  - stato_cantiere
 *  - app_partenza, app_partenza_zona, app_partenza_descrizione
 *  - app_arrivo, app_arrivo_zona, app_arrivo_descrizione
 *  - lunghezza_disegno, lunghezza_posa, lunghezza_calcolo
 *  - sezione, wbs
 *  - rev_inca
 *  - zona
 *  - richiesta_taglio, data_richiesta_taglio
 *
 * ⚠️ IMPORTANT : aucun dé-doublonnage ici.
 */
export async function parseIncaXlsx(file) {
  // 1) Lire le fichier en ArrayBuffer
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // On récupère toutes les lignes brutes : tableau de tableaux
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (!rows || rows.length === 0) {
    console.warn("[INCA XLSX] Fichier vide ou non lisible.");
    return [];
  }

  // 2) Trouver la ligne d'entête (celle qui contient "MARCA CAVO" + "CODICE CAVO")
  let headerRowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const hasMarca = row.some(
      (cell) =>
        typeof cell === "string" &&
        cell.toUpperCase().includes("MARCA CAVO")
    );
    const hasCodice = row.some(
      (cell) =>
        typeof cell === "string" &&
        cell.toUpperCase().includes("CODICE CAVO")
    );

    if (hasMarca && hasCodice) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.warn(
      "[INCA XLSX] Impossible de trouver la ligne d'entête (MARCA CAVO / CODICE CAVO)."
    );
    return [];
  }

  const header = rows[headerRowIndex].map((c) =>
    typeof c === "string" ? c.trim() : c
  );
  console.log("[INCA XLSX] Header row index:", headerRowIndex, "→", header);

  // 3) Mapping des colonnes importantes
  const indexOf = (label) =>
    header.findIndex(
      (h) => typeof h === "string" && h.toUpperCase() === label.toUpperCase()
    );

  const colMap = {
    marca: indexOf("MARCA CAVO"),
    codice: indexOf("CODICE CAVO"),
    livello: indexOf("LIVELLO DISTURBO"),
    tipo: indexOf("TIPO CAVO"),
    situazione: indexOf("SITUAZIONE CAVO"),
    stato_tec: indexOf("STATO TEC"),
    stato_cantiere: indexOf("STATO CANTIERE"),

    app_da: indexOf("APP PARTENZA"),
    app_da_locale: indexOf("APP PARTENZA - LOCALE"),
    app_da_descr: indexOf("APP PARTENZA - DESCRIZIONE"),

    app_a: indexOf("APP ARRIVO"),
    app_a_locale: indexOf("APP ARRIVO - LOCALE"),
    app_a_descr: indexOf("APP ARRIVO- DESCRIZIONE"),

    lung_dis: indexOf("LUNGHEZZA DI DISEGNO"),
    lung_posa: indexOf("LUNGHEZZA DI POSA"),
    sezione: indexOf("SEZIONE"),
    wbs: indexOf("WBS"),
    lung_calc: indexOf("LUNGHEZZA DI CALCOLO"),

    rev_inca: indexOf("REVISIONE"),
    zona: indexOf("ZONA"),

    richiesta_taglio: indexOf("Richiesta Taglio"),
    data_richiesta_taglio: indexOf("Data Richiesta Taglio"),
  };

  console.log("[INCA XLSX] Column mapping:", colMap);

  const num = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // 4) Construire les objets cavo (une ligne XLSX = un cavo)
  const rawDataRows = rows.slice(headerRowIndex + 1);
  const result = [];

  for (const row of rawDataRows) {
    if (!Array.isArray(row)) continue;

    const marca = colMap.marca >= 0 ? row[colMap.marca] : null;
    const codice = colMap.codice >= 0 ? row[colMap.codice] : null;

    // Si ni MARCA ni CODICE → ligne vide, on saute
    if (
      (marca == null || String(marca).trim() === "") &&
      (codice == null || String(codice).trim() === "")
    ) {
      continue;
    }

    const cavo = {
      marca_cavo: marca != null ? String(marca).trim() : null,
      codice_cavo: codice != null ? String(codice).trim() : null,

      livello_disturbo:
        colMap.livello >= 0 ? row[colMap.livello] ?? null : null,
      tipo_cavo: colMap.tipo >= 0 ? row[colMap.tipo] ?? null : null,
      situazione_cavo:
        colMap.situazione >= 0 ? row[colMap.situazione] ?? null : null,
      stato_tec:
        colMap.stato_tec >= 0 ? row[colMap.stato_tec] ?? null : null,
      stato_cantiere:
        colMap.stato_cantiere >= 0 ? row[colMap.stato_cantiere] ?? null : null,

      app_partenza: colMap.app_da >= 0 ? row[colMap.app_da] ?? null : null,
      app_partenza_zona:
        colMap.app_da_locale >= 0 ? row[colMap.app_da_locale] ?? null : null,
      app_partenza_descrizione:
        colMap.app_da_descr >= 0 ? row[colMap.app_da_descr] ?? null : null,

      app_arrivo: colMap.app_a >= 0 ? row[colMap.app_a] ?? null : null,
      app_arrivo_zona:
        colMap.app_a_locale >= 0 ? row[colMap.app_a_locale] ?? null : null,
      app_arrivo_descrizione:
        colMap.app_a_descr >= 0 ? row[colMap.app_a_descr] ?? null : null,

      lunghezza_disegno:
        colMap.lung_dis >= 0 ? num(row[colMap.lung_dis]) : null,
      lunghezza_posa:
        colMap.lung_posa >= 0 ? num(row[colMap.lung_posa]) : null,
      lunghezza_calcolo:
        colMap.lung_calc >= 0 ? num(row[colMap.lung_calc]) : null,

      sezione: colMap.sezione >= 0 ? row[colMap.sezione] ?? null : null,
      wbs: colMap.wbs >= 0 ? row[colMap.wbs] ?? null : null,

      rev_inca:
        colMap.rev_inca >= 0 ? String(row[colMap.rev_inca] ?? "").trim() : null,

      zona: colMap.zona >= 0 ? row[colMap.zona] ?? null : null,

      richiesta_taglio:
        colMap.richiesta_taglio >= 0
          ? row[colMap.richiesta_taglio] ?? null
          : null,
      data_richiesta_taglio:
        colMap.data_richiesta_taglio >= 0
          ? row[colMap.data_richiesta_taglio] ?? null
          : null,
    };

    result.push(cavo);
  }

  console.log(
    `[INCA XLSX] Cavi letti (grezzi): ${rawDataRows.length} → righe valide: ${result.length}`
  );

  return result;
}
