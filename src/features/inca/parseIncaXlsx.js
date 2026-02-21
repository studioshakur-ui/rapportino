// src/inca/parseIncaXlsx.js
import * as XLSX from "xlsx";

/**
 * Parser XLSX INCA robuste.
 *
 * IMPORTANT (ton Excel 6368 SDC) :
 * - "MARCA CAVO" est l'identifiant réellement unique par câble (ex: 1-1 N AH163)
 * - "CODICE CAVO" peut être très court (ex: NB) et NON unique
 * - "STATO CANTIERE" contient souvent P/B/T/R... même si "SITUAZIONE CAVO" est vide
 *
 * Retour :
 *  - marca_cavo
 *  - codice_cavo (le "CODICE CAVO" INCA, non unique)
 *  - stato_cantiere / situazione_cavo
 *  - lunghezza_disegno (LUNGHEZZA DI DISEGNO)
 *  - lunghezza_posa (LUNGHEZZA DI POSA)
 *  - lunghezza_calcolo (LUNGHEZZA DI CALCOLO)
 *  - app_* etc.
 *
 * ⚠️ Aucun dé-doublonnage ici (géré plus haut).
 */
export async function parseIncaXlsx(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames?.[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;

  if (!sheet) {
    console.warn("[INCA XLSX] Nessun foglio trovato.");
    return [];
  }

  // Tableau de tableaux (raw rows)
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (!rows || rows.length === 0) {
    console.warn("[INCA XLSX] Fichier vide ou non lisible.");
    return [];
  }

  // Helpers
  const normHeader = (v) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const toStr = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s : null;
  };

  const toNum = (v) => {
    if (v == null || v === "") return null;
    // Excel peut fournir number, ou string "36,5"
    const s = String(v).trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  // 1) Trouver la ligne d'en-tête contenant MARCA CAVO + CODICE CAVO
  let headerRowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const upper = row.map(normHeader);

    const hasMarca = upper.some((h) => h.includes("MARCA CAVO"));
    const hasCodice = upper.some((h) => h.includes("CODICE CAVO"));

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

  const headerRaw = rows[headerRowIndex] || [];
  const header = headerRaw.map((h) => normHeader(h));

  const findCol = (...labels) => {
    for (const lab of labels) {
      const idx = header.findIndex((h) => h === normHeader(lab));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const colMap = {
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
    // Ton header réel est "APP ARRIVO- DESCRIZIONE" (sans espace après ARRIVO)
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

  // debug logs removed (deterministic parsing only)

  // 2) Construire les objets
  const rawDataRows = rows.slice(headerRowIndex + 1);
  const result = [];

  for (const row of rawDataRows) {
    if (!Array.isArray(row)) continue;

    const marca = colMap.marca >= 0 ? toStr(row[colMap.marca]) : null;
    const codice = colMap.codice >= 0 ? toStr(row[colMap.codice]) : null;

    // ligne vide -> skip
    if (!marca && !codice) continue;

    const cavo = {
      marca_cavo: marca,
      codice_cavo: codice,

      livello_disturbo:
        colMap.livello >= 0 ? toStr(row[colMap.livello]) : null,
      tipo_cavo: colMap.tipo >= 0 ? toStr(row[colMap.tipo]) : null,

      // souvent vide dans ton fichier
      situazione_cavo:
        colMap.situazione >= 0 ? toStr(row[colMap.situazione]) : null,

      stato_tec: colMap.stato_tec >= 0 ? toStr(row[colMap.stato_tec]) : null,

      // CRITIQUE : ici se trouvent P/B/T/R/E dans ton Excel
      stato_cantiere:
        colMap.stato_cantiere >= 0 ? toStr(row[colMap.stato_cantiere]) : null,

      app_partenza: colMap.app_da >= 0 ? toStr(row[colMap.app_da]) : null,
      app_partenza_zona:
        colMap.app_da_locale >= 0 ? toStr(row[colMap.app_da_locale]) : null,
      app_partenza_descrizione:
        colMap.app_da_descr >= 0 ? toStr(row[colMap.app_da_descr]) : null,

      app_arrivo: colMap.app_a >= 0 ? toStr(row[colMap.app_a]) : null,
      app_arrivo_zona:
        colMap.app_a_locale >= 0 ? toStr(row[colMap.app_a_locale]) : null,
      app_arrivo_descrizione:
        colMap.app_a_descr >= 0 ? toStr(row[colMap.app_a_descr]) : null,

      // LONGUEUR (ta demande) : "LUNGHEZZA DI DISEGNO" -> longueur de référence
      lunghezza_disegno:
        colMap.lung_dis >= 0 ? toNum(row[colMap.lung_dis]) : null,
      lunghezza_posa:
        colMap.lung_posa >= 0 ? toNum(row[colMap.lung_posa]) : null,
      lunghezza_calcolo:
        colMap.lung_calc >= 0 ? toNum(row[colMap.lung_calc]) : null,

      sezione: colMap.sezione >= 0 ? toStr(row[colMap.sezione]) : null,
      wbs: colMap.wbs >= 0 ? toStr(row[colMap.wbs]) : null,

      rev_inca:
        colMap.rev_inca >= 0 ? toStr(row[colMap.rev_inca]) : null,

      zona: colMap.zona >= 0 ? toStr(row[colMap.zona]) : null,

      richiesta_taglio:
        colMap.richiesta_taglio >= 0 ? toStr(row[colMap.richiesta_taglio]) : null,
      data_richiesta_taglio:
        colMap.data_richiesta_taglio >= 0
          ? toStr(row[colMap.data_richiesta_taglio])
          : null,
    };

    result.push(cavo);
  }

  // debug logs removed (deterministic parsing only)

  return result;
}
