// src/inca/parseIncaPdf.js
// Parser INCA PDF – version A1 (layout-based, structuré, compatible inca_cavi).
//
// Hypothèse : PDF de type liste INCA Fincantieri, où chaque câble apparaît
// sur une ligne principale avec la structure suivante (tokens):
//
// [0] MARCA     (ex: "1-7", "N", "W", "R")
// [1] PEZZO     (ex: "N", "ND", "MC", "SR")
// [2] CAVO      (ex: "AH165", "290", "007", "103")
// [3] WBS       (ex: "401" -> toujours 3 chiffres)
// [4] SUB       (ex: "AH", "ND", "MC", "SR" -> 2 lettres)
// [5] LIV       (ex: "N", "S", "R" -> 1 lettre)
// [6] ZONA      (ex: "2816102158WM", "60", "3", "200"...)
// [7] CODICE    (ex: "FN02-O-1.5", "CS0.50-O-12", "UN1.5-O-7", "CAVO", "TXOI0,6/1KV7X1,5"...)
// [8] SEZIONE   (souvent "-" ou une valeur de sezione)
// [9] MT_TEO
// [10] MT_DIS
// [11] MT_STA
// [12] SIT_CAVO (ex: "M", "N", "E", "Z"...)
// [13] SIT_TEC  (ex: "P", "B", "00", "MCG"...)
// [14+] EXTRA   (direttiva, T.O.P., date, "CN/", etc.)
//
// Ce parser produit un tableau d'objets qui peuvent être directement mappés vers
// la table public.inca_cavi (codice, descrizione, sezione, metri_teo, metri_dis,
// metri_totali, metri_previsti, metri_posati_teorici, situazione, stato_inca, etc.),
// plus quelques champs "techniques" supplémentaires pour futurs usages (marca, pezzo, etc.).

import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// IMPORTANT : on suppose que le worker pdf.js est déjà configuré
// ailleurs (ex. dans src/pdf.worker.js via GlobalWorkerOptions).

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

function normalizeSpaces(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Détection d'une "ligne câble" INCA basée sur la structure générale :
// [0] MARCA (alphanum, peut contenir "-")
// [1] PEZZO (1–2 lettres)
// [2] CAVO (alphanum)
// [3] WBS (3 chiffres)
// [4] SUB (2 lettres)
// [5] LIV (1 lettre)
function isCableLineTokens(tokens) {
  if (!Array.isArray(tokens) || tokens.length < 12) return false;

  const [marca, pezzo, cavo, wbs, sub, liv] = tokens;

  if (!/^[A-Z0-9\-]+$/i.test(marca)) return false;
  if (!/^[A-Z]{1,2}$/.test(pezzo)) return false;
  if (!/^[A-Z0-9]+$/i.test(cavo)) return false;
  if (!/^\d{3}$/.test(wbs)) return false;
  if (!/^[A-Z]{2}$/.test(sub)) return false;
  if (!/^[A-Z]$/.test(liv)) return false;

  return true;
}

// Essaie de repérer T / P / R / B dans les derniers tokens (stato INCA).
function detectSituazioneFromTokens(tokens) {
  const tail = tokens.slice(-6);
  for (const t of tail) {
    const v = t.toUpperCase();
    if (v === 'T' || v === 'P' || v === 'R' || v === 'B') {
      return v;
    }
  }
  return null;
}

// -------------------------------------------------------------
// Regroupement texte pdf.js → lignes
// -------------------------------------------------------------

function buildLinesFromPage(content) {
  const linesMap = new Map();

  for (const item of content.items) {
    const str = item.str;
    if (!str || !str.trim()) continue;

    const transform = item.transform;
    const x = transform[4];
    const y = transform[5];

    // Quantisation du Y pour regrouper les fragments sur une même ligne.
    const yKey = Math.round(y / 2) * 2;

    if (!linesMap.has(yKey)) {
      linesMap.set(yKey, []);
    }
    linesMap.get(yKey).push({ x, text: str });
  }

  // y décroissant = du haut vers le bas
  const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

  const lines = [];
  for (const yKey of sortedY) {
    const items = linesMap.get(yKey) || [];
    items.sort((a, b) => a.x - b.x);
    const lineText = normalizeSpaces(items.map((i) => i.text).join(' '));
    if (lineText) lines.push(lineText);
  }

  return lines;
}

// -------------------------------------------------------------
// parseIncaPdf(file: File) : Promise<IncaCable[]>
// -------------------------------------------------------------

/**
 * @param {File} file - PDF INCA export
 * @returns {Promise<Array<object>>} liste de câbles structurés
 *
 * Chaque objet câble contient au minimum :
 * - codice          -> à mapper sur inca_cavi.codice
 * - descrizione     -> à mapper sur inca_cavi.descrizione
 * - sezione         -> inca_cavi.sezione
 * - metri_teo       -> inca_cavi.metri_teo
 * - metri_dis       -> inca_cavi.metri_dis
 * - metri_totali    -> inca_cavi.metri_totali
 * - metri_previsti  -> inca_cavi.metri_previsti
 * - metri_posati_teorici -> inca_cavi.metri_posati_teorici
 * - situazione      -> inca_cavi.situazione
 * - stato_inca      -> inca_cavi.stato_inca
 * - pagina_pdf      -> inca_cavi.pagina_pdf (numéro de page)
 *
 * + champs techniques (marca, pezzo, cavo, wbs, sub, liv, zona, sit_cavo, sit_tec, direttiva, top, mlf, esec, raw_line, origine_line, percorso_nodes)
 */
export async function parseIncaPdf(file) {
  if (!file) return [];

  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const allLinesWithPage = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const lines = buildLinesFromPage(content);

      for (const line of lines) {
        allLinesWithPage.push({ pageNum, line });
      }
    }

    console.groupCollapsed(
      `[INCA] parseIncaPdf – Aperçu texte pour: ${file.name}`
    );
    console.log('Nombre total de lignes détectées :', allLinesWithPage.length);
    console.log('Exemples (40 premières lignes) :');
    allLinesWithPage.slice(0, 40).forEach((lwp, idx) => {
      console.log(
        String(idx + 1).padStart(3, ' ') +
          ` [p.${lwp.pageNum}] : ` +
          lwp.line
      );
    });
    console.groupEnd();

    const results = [];
    let i = 0;

    while (i < allLinesWithPage.length) {
      const { pageNum, line } = allLinesWithPage[i];
      const rawLine = normalizeSpaces(line);
      const tokens = rawLine.split(' ').filter(Boolean);

      if (!isCableLineTokens(tokens)) {
        i += 1;
        continue;
      }

      // Ligne câble détectée
      const [marca, pezzo, cavo, wbs, sub, liv, ...rest] = tokens;

      if (rest.length < 6) {
        i += 1;
        continue;
      }

      // Mapping des colonnes à partir de rest :
      // [0] ZONA
      // [1] CODICE (INCA)
      // [2] SEZIONE
      // [3] MT_TEO
      // [4] MT_DIS
      // [5] MT_STA
      // [6] SIT_CAVO
      // [7] SIT_TEC (facultatif)
      // [8+] EXTRA (direttiva, T.O.P., date, "CN/", etc.)

      const zona = rest[0] || null;
      const codiceInca = rest[1] || null;
      const sezione = rest[2] || null;

      const metri_teo = parseNumber(rest[3]);
      const metri_dis = parseNumber(rest[4]);
      const metri_sta = parseNumber(rest[5]);

      const sit_cavo = rest[6] || null;
      const sit_tec = rest[7] || null;

      const extra = rest.slice(8);
      const direttiva = extra[0] || null;
      const top = extra[1] || null;
      const mlf = extra[2] || null;
      const esec = extra.slice(3).join(' ') || null;

      const situazione =
        detectSituazioneFromTokens(rest) || detectSituazioneFromTokens(extra);

      const metri_totali = metri_teo ?? null;
      const metri_previsti = metri_teo ?? null;
      const metri_posati_teorici = metri_sta ?? null;

      const cable = {
        // Champs techniques "tête"
        marca,
        pezzo,
        cavo,
        wbs,
        sub,
        liv,
        zona,

        // Champs principaux pour inca_cavi
        codice: codiceInca,
        descrizione: rawLine, // pour l'instant: la ligne brute
        sezione,

        metri_teo,
        metri_dis,
        // Dans ta structure, tu as aussi:
        // - metri_sit_cavo
        // - metri_sit_tec
        // Pour le PDF on n'a pas ces infos séparées → null par défaut
        metri_sit_cavo: null,
        metri_sit_tec: null,

        metri_totali,
        metri_previsti,
        metri_posati_teorici,

        sit_cavo,
        sit_tec,
        direttiva,
        top,
        mlf,
        esec,

        situazione: situazione || null,
        stato_inca: situazione || null,

        pagina_pdf: pageNum,

        // Pour futurs raffinements (origine, percorso, etc.)
        raw_line: rawLine,
        origine_line: null,
        percorso_nodes: [],
      };

      // Lignes suivantes éventuelles: "Da ..." et "Percorso:"
      let j = i + 1;

      // "Da ..."
      if (j < allLinesWithPage.length) {
        const next = allLinesWithPage[j];
        const nextLine = normalizeSpaces(next.line);
        if (/^Da\s+/i.test(nextLine)) {
          cable.origine_line = nextLine;
          j += 1;
        }
      }

      // "Percorso:" + supports (si présent)
      if (j < allLinesWithPage.length) {
        const next2 = allLinesWithPage[j];
        const lPerc = normalizeSpaces(next2.line);
        if (/^Percorso:/i.test(lPerc)) {
          j += 1;
          if (j < allLinesWithPage.length) {
            const supLine = normalizeSpaces(allLinesWithPage[j].line);
            const supports = supLine
              .split(' ')
              .map((s) => s.trim())
              .filter(Boolean);
            cable.percorso_nodes = supports;
            j += 1;
          }
        }
      }

      results.push(cable);
      i = j;
    }

    console.log(
      `[INCA] parseIncaPdf – câbles trouvés pour ${file.name} :`,
      results.length
    );

    return results;
  } catch (err) {
    console.error(
      'parseIncaPdf → Errore durante il parsing del PDF INCA:',
      err
    );
    return [];
  }
}
