// src/inca/parseIncaPdf.js
// Parser INCA PDF – version A1 (layout-based, structuré, compatible inca_cavi).
//
// Hypothèses :
//  - PDF = export INCA Fincantieri "STAMPA COMPLETA" (liste cavi).
//  - Chaque câble commence par une ligne "MARCA / WBS / SUB / LIV / SRTP / ZONA / CODICE / CAVO / SEZIONE / METRI...".
//  - Les lignes "Da ..." et "Percorso:" suivent éventuellement pour définir l'origine et le chemin.
//
// Le parser renvoie un tableau d'objets "câble" avec :
//  - codice_inca      (vrai code INCA, ex: 2816102158WM)
//  - codice_marca     (code lisible atelier, ex: "1-N AH163" ou "N ND 290")
//  - codice           (alias = codice_inca pour compatibilité avec inca_cavi.codice)
//  - descrizione      (ligne brute)
//  - sezione, tipo_cavo
//  - metri_teo, metri_dis, metri_totali, metri_previsti, metri_posati_teorici
//  - situazione / stato_inca
//  - pagina_pdf
//  - origine_line, percorso_nodes (pour inca_percorsi)
//
// ⚠️ IMPORTANT : configuration du worker pdf.js pour éviter
// l'erreur "No GlobalWorkerOptions.workerSrc specified".

import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

console.log('🔥 PARSER A1 ACTIF — parseIncaPdf.js chargé');

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

/**
 * Détecte le format de la ligne câble et renvoie une description
 * ou null si la ligne ne semble pas être un "header" de câble INCA.
 *
 * @param {string[]} tokens
 * @returns {null | { format: '2-part' | '3-part', marcaParts: number, idxWbs: number, idxSub: number, idxLiv: number, idxSrpt: number, idxZona: number, idxCodiceInca: number, idxTipoCavo: number, idxSezione: number, idxMetriStart: number }}
 */
function detectCableHeaderFormat(tokens) {
  if (!Array.isArray(tokens)) return null;

  // Format 3-part MARCA (type "N ND 290 401 ND S 2816..."):
  // [0] marca1, [1] marca2, [2] marca3, [3] WBS(3 digits), [4] SUB, [5] LIV, [6] ZONA, [7] CODICE_INCA, [8] TIPO_CAVO, [9] SEZIONE, ...
  if (
    tokens.length >= 10 &&
    /^\d{3}$/.test(tokens[3]) &&
    /^[A-Z]{2,3}$/i.test(tokens[4]) &&
    /^[A-Z]$/i.test(tokens[5])
  ) {
    return {
      format: '3-part',
      marcaParts: 3,
      idxWbs: 3,
      idxSub: 4,
      idxLiv: 5,
      idxSrpt: null, // pas toujours explicite
      idxZona: 6,
      idxCodiceInca: 7,
      idxTipoCavo: 8,
      idxSezione: 9,
      idxMetriStart: 10,
    };
  }

  // Format 2-part MARCA (type "1-N AH163 401 AH N 29 2816..."):
  // [0] marca1, [1] marca2, [2] WBS, [3] SUB, [4] LIV, [5] SRPT, [6] ZONA, [7] CODICE_INCA, [8] TIPO_CAVO, [9] SEZIONE, ...
  if (
    tokens.length >= 10 &&
    /^\d{3}$/.test(tokens[2]) &&
    /^[A-Z]{2,3}$/i.test(tokens[3]) &&
    /^[A-Z]$/i.test(tokens[4])
  ) {
    return {
      format: '2-part',
      marcaParts: 2,
      idxWbs: 2,
      idxSub: 3,
      idxLiv: 4,
      idxSrpt: 5,
      idxZona: 6,
      idxCodiceInca: 7,
      idxTipoCavo: 8,
      idxSezione: 9,
      idxMetriStart: 10,
    };
  }

  return null;
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

// Regroupement texte pdf.js → lignes
function buildLinesFromPage(content) {
  const linesMap = new Map();

  for (const item of content.items) {
    const str = item.str;
    if (!str || !str.trim()) continue;

    const [a, b, c, d, e, f] = item.transform;
    const y = f;
    const x = e;

    // Quantisation du Y pour regrouper les fragments sur une même ligne
    const yKey = Math.round(y / 2) * 2;

    if (!linesMap.has(yKey)) {
      linesMap.set(yKey, []);
    }
    linesMap.get(yKey).push({ x, text: str });
  }

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
 * Parse un PDF INCA et renvoie un tableau d'objets "câble" structurés.
 *
 * @param {File} file
 * @returns {Promise<Array<object>>}
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

      const headerInfo = detectCableHeaderFormat(tokens);
      if (!headerInfo) {
        i += 1;
        continue;
      }

      const {
        format,
        marcaParts,
        idxWbs,
        idxSub,
        idxLiv,
        idxSrpt,
        idxZona,
        idxCodiceInca,
        idxTipoCavo,
        idxSezione,
        idxMetriStart,
      } = headerInfo;

      const marcaTokens = tokens.slice(0, marcaParts);
      const codice_marca = marcaTokens.join(' ');

      const wbs = tokens[idxWbs] || null;
      const sub = tokens[idxSub] || null;
      const liv = tokens[idxLiv] || null;
      const srpt = idxSrpt != null ? tokens[idxSrpt] || null : null;
      const zona = tokens[idxZona] || null;

      const codice_inca = tokens[idxCodiceInca] || null;
      const tipo_cavo = tokens[idxTipoCavo] || null;
      const sezione = tokens[idxSezione] || null;

      const metri_teo = parseNumber(tokens[idxMetriStart]);
      const metri_dis = parseNumber(tokens[idxMetriStart + 1]);
      const metri_sta = parseNumber(tokens[idxMetriStart + 2]);

      const sit_cavo = tokens[idxMetriStart + 3] || null;
      const sit_tec = tokens[idxMetriStart + 4] || null;

      const extra = tokens.slice(idxMetriStart + 5);
      const direttiva = extra[0] || null;
      const top_posa = extra[1] || null;
      const esec_att = extra.slice(2).join(' ') || null;

      const situazione =
        detectSituazioneFromTokens(tokens) || detectSituazioneFromTokens(extra);

      const metri_totali = metri_teo ?? null;
      const metri_previsti = metri_teo ?? null;
      const metri_posati_teorici =
        (situazione && situazione.toUpperCase() === 'P' && metri_totali) || 0;

      const cable = {
        codice_inca: codice_inca || null,
        codice_marca: codice_marca || null,
        codice: codice_inca || codice_marca || null,

        descrizione: rawLine,

        marca: codice_marca || null,
        wbs,
        sub,
        liv,
        srpt,
        zona,
        tipo_cavo,
        sezione,

        metri_teo,
        metri_dis,
        metri_sta,
        metri_totali,
        metri_previsti,
        metri_posati_teorici,

        sit_cavo,
        sit_tec,
        direttiva,
        top_posa,
        esec_att,

        situazione: situazione || null,
        stato_inca: situazione || null,

        pagina_pdf: pageNum,

        raw_line: rawLine,
        origine_line: null,
        percorso_nodes: [],
      };

      // Lignes suivantes : "Da ..." et "Percorso:"
      let j = i + 1;

      if (j < allLinesWithPage.length) {
        const next = allLinesWithPage[j];
        const nextLine = normalizeSpaces(next.line);
        if (/^Da\s+/i.test(nextLine)) {
          cable.origine_line = nextLine;
          j += 1;
        }
      }

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
    throw err; // on laisse remonter l'erreur à l'UI
  }
}
