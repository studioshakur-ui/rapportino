// src/inca/parseIncaPdf.js
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

console.log("🔥 PARSER A1 ACTIF — parseIncaPdf.js chargé");

function normalizeSpaces(str) {
  return String(str || "").replace(/\s+/g, " ").trim();
}

function parseNumber(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function detectCableHeaderFormat(tokens) {
  if (!Array.isArray(tokens)) return null;

  if (
    tokens.length >= 10 &&
    /^\d{3}$/.test(tokens[3]) &&
    /^[A-Z]{2,3}$/i.test(tokens[4]) &&
    /^[A-Z]$/i.test(tokens[5])
  ) {
    return {
      format: "3-part",
      marcaParts: 3,
      idxWbs: 3,
      idxSub: 4,
      idxLiv: 5,
      idxSrpt: null,
      idxZona: 6,
      idxCodiceInca: 7,
      idxTipoCavo: 8,
      idxSezione: 9,
      idxMetriStart: 10,
    };
  }

  if (
    tokens.length >= 10 &&
    /^\d{3}$/.test(tokens[2]) &&
    /^[A-Z]{2,3}$/i.test(tokens[3]) &&
    /^[A-Z]$/i.test(tokens[4])
  ) {
    return {
      format: "2-part",
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

function detectSituazioneFromTokens(tokens) {
  const tail = tokens.slice(-8);
  for (const t of tail) {
    const v = String(t || "").toUpperCase();
    if (v === "T" || v === "P" || v === "R" || v === "B" || v === "E") return v;
  }
  return null;
}

function buildLinesFromPage(content) {
  const linesMap = new Map();

  for (const item of content.items) {
    const str = item.str;
    if (!str || !str.trim()) continue;

    const [, , , , e, f] = item.transform;
    const y = f;
    const x = e;

    const yKey = Math.round(y / 2) * 2;
    if (!linesMap.has(yKey)) linesMap.set(yKey, []);
    linesMap.get(yKey).push({ x, text: str });
  }

  const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

  const lines = [];
  for (const yKey of sortedY) {
    const items = linesMap.get(yKey) || [];
    items.sort((a, b) => a.x - b.x);
    const lineText = normalizeSpaces(items.map((i) => i.text).join(" "));
    if (lineText) lines.push(lineText);
  }
  return lines;
}

function isHeaderLine(line) {
  const tokens = normalizeSpaces(line).split(" ").filter(Boolean);
  return !!detectCableHeaderFormat(tokens);
}

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

    const results = [];
    let i = 0;

    while (i < allLinesWithPage.length) {
      const { pageNum, line } = allLinesWithPage[i];
      const rawLine = normalizeSpaces(line);
      const tokens = rawLine.split(" ").filter(Boolean);

      const headerInfo = detectCableHeaderFormat(tokens);
      if (!headerInfo) {
        i += 1;
        continue;
      }

      const {
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

      const codice_marca = tokens.slice(0, marcaParts).join(" ");
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

      const extra = tokens.slice(idxMetriStart + 5);
      const situazione =
        detectSituazioneFromTokens(tokens) || detectSituazioneFromTokens(extra);

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

        situazione: situazione || null,
        stato_inca: situazione || null,

        pagina_pdf: pageNum,

        raw_line: rawLine,
        origine_line: null,
        percorso_nodes: [],
      };

      let j = i + 1;

      // --- "Da ..." multi-lignes (jusqu'à Percorso ou header)
      if (j < allLinesWithPage.length) {
        const nextLine = normalizeSpaces(allLinesWithPage[j].line);
        if (/^Da\s+/i.test(nextLine)) {
          let origin = nextLine;
          j += 1;
          while (j < allLinesWithPage.length) {
            const l = normalizeSpaces(allLinesWithPage[j].line);
            if (!l) break;
            if (/^Percorso:/i.test(l)) break;
            if (/^Da\s+/i.test(l)) break;
            if (isHeaderLine(l)) break;
            // continuation
            origin = normalizeSpaces(origin + " " + l);
            j += 1;
          }
          cable.origine_line = origin;
        }
      }

      // --- Percorso: supports multi-lignes (jusqu'au prochain header / Da / vide)
      if (j < allLinesWithPage.length) {
        const lPerc = normalizeSpaces(allLinesWithPage[j].line);
        if (/^Percorso:/i.test(lPerc)) {
          j += 1;
          const supports = [];
          while (j < allLinesWithPage.length) {
            const l = normalizeSpaces(allLinesWithPage[j].line);
            if (!l) break;
            if (/^Da\s+/i.test(l)) break;
            if (/^Percorso:/i.test(l)) {
              j += 1;
              continue;
            }
            if (isHeaderLine(l)) break;

            l.split(" ")
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((s) => supports.push(s));

            j += 1;
          }
          cable.percorso_nodes = supports;
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
    console.error("parseIncaPdf → Errore durante il parsing del PDF INCA:", err);
    throw err;
  }
}
