// src/inca/incaParser.js
import { parseIncaPdf } from "./parseIncaPdf";
import { parseIncaXlsx } from "./parseIncaXlsx";

/**
 * Canon INCA (sortie stable) compatible createIncaDataset().
 * On ajoute un champ "codice_inca" (optionnel) pour stocker le vrai code INCA
 * quand disponible (surtout XLSX où CODICE CAVO est souvent non unique).
 */

/**
 * @typedef {Object} IncaCanonCavo
 * @property {string} codice                 // identifiant principal côté CORE (XLSX => MARCA CAVO)
 * @property {string|null} codice_inca        // vrai code INCA (PDF => idem, XLSX => CODICE CAVO)
 * @property {string|null} marca_cavo         // MARCA CAVO (lisible atelier)
 * @property {string|null} descrizione
 * @property {string|null} impianto
 * @property {string|null} tipo
 * @property {string|null} sezione
 * @property {string|null} zona_da
 * @property {string|null} zona_a
 * @property {string|null} apparato_da
 * @property {string|null} apparato_a
 * @property {string|null} descrizione_da
 * @property {string|null} descrizione_a
 * @property {number|null} metri_teo
 * @property {number|null} metri_dis
 * @property {number|null} metri_sit_cavo
 * @property {number|null} metri_sit_tec
 * @property {number|null} pagina_pdf
 * @property {string|null} rev_inca
 * @property {string|null} stato_inca         // doit contenir P/B/T/R/E si dispo
 */

function fileTypeFromName(file) {
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "XLSX";
  return "UNKNOWN";
}

function normalizeText(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s : null;
}

function normalizeCodiceKeepDashes(v) {
  // pour les MARCA CAVO, garder les tirets mais enlever espaces
  const s = normalizeText(v);
  return s ? s.replace(/\s+/g, "").toUpperCase() : null;
}

function normalizeCodiceGeneric(v) {
  const s = normalizeText(v);
  return s ? s.replace(/\s+/g, "").toUpperCase() : null;
}

function toNumber(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDaLine(line) {
  const s = normalizeText(line);
  if (!s) return { descrizione_da: null, descrizione_a: null };
  const m = s.match(/^Da\s+(.*?)(?:\s+a\s+|\s+A\s+)(.*)$/i);
  if (!m) return { descrizione_da: s, descrizione_a: null };
  return {
    descrizione_da: normalizeText(m[1]),
    descrizione_a: normalizeText(m[2]),
  };
}

function mergePrefer(a, b) {
  return a != null && String(a).trim() !== "" ? a : b;
}

function mergeCavo(existing, incoming) {
  const out = { ...existing };
  for (const k of Object.keys(incoming)) {
    if (k === "descrizione") continue;
    out[k] = mergePrefer(out[k], incoming[k]);
  }
  const a = normalizeText(existing.descrizione) || "";
  const b = normalizeText(incoming.descrizione) || "";
  out.descrizione = b.length > a.length ? b : a;
  return out;
}

// Normalise situation vers P/B/T/R/E quand possible
function normalizeSituazione(val) {
  const s = normalizeText(val);
  if (!s) return null;
  const u = s.toUpperCase();

  // Déjà code
  if (["P", "B", "T", "R", "E"].includes(u)) return u;

  // Mots possibles
  if (u.includes("ELIMIN")) return "E";
  if (u.includes("RICH")) return "R";
  if (u.includes("TAGLIO") || u.includes("TAGLIATO")) return "T";
  if (u.includes("POSA") || u.includes("POSATO") || u.includes("COLLEG")) return "P";
  if (u.includes("BLOCC") || u.includes("NON PRONTO")) return "B";

  return null;
}

/**
 * PDF -> canon
 */
function canonFromPdf(c) {
  const codiceInca = normalizeCodiceGeneric(c?.codice_inca || c?.codice);
  const marca = normalizeText(c?.codice_marca || c?.marca);
  const daA = parseDaLine(c?.origine_line);

  const stato = normalizeSituazione(c?.stato_inca || c?.situazione);

  return {
    // PDF: identifiant principal = code INCA long
    codice: codiceInca || normalizeCodiceGeneric(marca) || "UNKNOWN",
    codice_inca: codiceInca || null,
    marca_cavo: marca || null,

    descrizione: normalizeText(c?.descrizione || c?.raw_line),
    impianto: null,
    tipo: normalizeText(c?.tipo || c?.tipo_cavo),
    sezione: normalizeText(c?.sezione),
    zona_da: normalizeText(c?.zona),
    zona_a: null,
    apparato_da: null,
    apparato_a: null,
    descrizione_da: daA.descrizione_da,
    descrizione_a: daA.descrizione_a,
    metri_teo: toNumber(c?.metri_teo),
    metri_dis: toNumber(c?.metri_dis),
    metri_sit_cavo: toNumber(c?.metri_sit_cavo ?? c?.metri_sta ?? null),
    metri_sit_tec: toNumber(c?.metri_sit_tec ?? null),
    pagina_pdf: typeof c?.pagina_pdf === "number" ? c.pagina_pdf : null,
    rev_inca: normalizeText(c?.rev_inca),
    stato_inca: stato,
  };
}

/**
 * XLSX -> canon
 * IMPORTANT :
 * - codice = MARCA CAVO (unique)
 * - codice_inca = CODICE CAVO (souvent non unique)
 * - stato_inca doit prendre STATO CANTIERE en priorité
 * - metri_teo doit lire LUNGHEZZA DI DISEGNO
 */
function canonFromXlsx(c) {
  const marca = normalizeText(c?.marca_cavo);
  const codiceInca = normalizeText(c?.codice_cavo);

  const codiceCore = normalizeCodiceKeepDashes(marca) || "UNKNOWN";

  const stato =
    normalizeSituazione(c?.stato_cantiere) ||
    normalizeSituazione(c?.situazione_cavo) ||
    normalizeSituazione(c?.stato_inca) ||
    normalizeSituazione(c?.stato_tec) ||
    null;

  return {
    codice: codiceCore,
    codice_inca: normalizeCodiceGeneric(codiceInca) || null,
    marca_cavo: marca || null,

    descrizione: normalizeText(
      c?.descrizione ||
        c?.app_partenza_descrizione ||
        c?.app_arrivo_descrizione ||
        null
    ),
    impianto: null,
    tipo: normalizeText(c?.tipo || c?.tipo_cavo),
    sezione: normalizeText(c?.sezione),
    zona_da: normalizeText(c?.zona_da || c?.app_partenza_zona || c?.zona),
    zona_a: normalizeText(c?.zona_a || c?.app_arrivo_zona),
    apparato_da: normalizeText(c?.apparato_da || c?.app_partenza),
    apparato_a: normalizeText(c?.apparato_a || c?.app_arrivo),
    descrizione_da: normalizeText(c?.descrizione_da || c?.app_partenza_descrizione),
    descrizione_a: normalizeText(c?.descrizione_a || c?.app_arrivo_descrizione),

    // demandé: metri_teo = LUNGHEZZA DI DISEGNO
    metri_teo: toNumber(
      c?.lunghezza_disegno ??
        c?.lunghezza_di_disegno ??
        c?.lunghezza_calcolo ??
        null
    ),
    metri_dis: toNumber(c?.lunghezza_posa ?? c?.lunghezza_di_posa ?? null),
    metri_sit_cavo: toNumber(c?.metri_sit_cavo ?? null),
    metri_sit_tec: toNumber(c?.metri_sit_tec ?? null),
    pagina_pdf: null,
    rev_inca: normalizeText(c?.rev_inca),
    stato_inca: stato,
  };
}

export async function parseIncaFile(file) {
  if (!file) throw new Error("Aucun fichier fourni.");

  const fileType = fileTypeFromName(file);
  if (fileType === "UNKNOWN") {
    throw new Error("Tipo file non supportato. Usa PDF o XLSX.");
  }

  let raw = [];
  let percorsiByCodice = {};

  if (fileType === "PDF") {
    raw = await parseIncaPdf(file);

    const map = {};
    for (const c of raw) {
      const codice = normalizeCodiceGeneric(c?.codice_inca || c?.codice || c?.codice_marca);
      if (!codice) continue;

      const nodes = Array.isArray(c?.percorso_nodes) ? c.percorso_nodes : [];
      if (nodes.length > 0) {
        map[codice] = nodes.map((x) => normalizeText(x)).filter(Boolean);
      }
    }
    percorsiByCodice = map;
  } else {
    raw = await parseIncaXlsx(file);
  }

  // Canon + de-dup (codice + rev)
  // Pour XLSX, "codice" = MARCA CAVO => unique, donc on ne casse plus la base
  const uniq = new Map();

  for (const item of raw) {
    const canon = fileType === "PDF" ? canonFromPdf(item) : canonFromXlsx(item);
    const codice = normalizeCodiceGeneric(canon.codice);

    if (!codice || codice === "UNKNOWN") continue;

    const rev = normalizeText(canon.rev_inca) || "";
    const key = `${codice}::${rev}`;

    if (!uniq.has(key)) {
      uniq.set(key, { ...canon, codice });
    } else {
      uniq.set(key, mergeCavo(uniq.get(key), { ...canon, codice }));
    }
  }

  const cavi = Array.from(uniq.values());

  if (cavi.length === 0) {
    return { cavi: [], percorsiByCodice: {} };
  }

  // Normalisation percorsi
  const percorsiNormalized = {};
  for (const [codice, supports] of Object.entries(percorsiByCodice || {})) {
    const k = normalizeCodiceGeneric(codice);
    if (!k) continue;
    if (!Array.isArray(supports) || supports.length === 0) continue;
    percorsiNormalized[k] = supports.map((s) => normalizeText(s)).filter(Boolean);
  }

  return { cavi, percorsiByCodice: percorsiNormalized };
}
