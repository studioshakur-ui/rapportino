// src/features/core-command/agents/normalizer.agent.ts
// V2 — Supporte les formats réels vus dans WhatsApp chantier.
// Formats reconnus :
//   "T C C..005"  → TCC 005
//   "C C S..574"  → CCS 574
//   "R co 008"    → RCO 008
//   "Rco012"      → RCO 012
//   "T NA  020"   → TNA 020
//   "1-6 c cs 006"→ CCS 006 (préfixe section ignoré)
//   "T NA. 023"   → TNA 023
//   "◑N AH 173"   → NAH 173
//   "T NA🚦009"   → TNA 009

export interface ExtractedCableRef {
  raw: string;
  normalized: string;
  line: string;
}

// ---------------------------------------------------------------------------
// Mots courants à ne pas confondre avec des codes câble
// ---------------------------------------------------------------------------
const COMMON_WORDS = new Set([
  "OK","SI","NO","HO","HA","CI","DA","DI","IN","UN","LA","LE","LO","AI",
  "ME","TE","SE","MA","OR","ED","AL","NE","SU","GU","DO","RE","FA","MI",
  "HI","IS","IT","AT","AS","BE","BY","IF","OF","ON","TO","UP","WE",
  "IA","IO","SA","SO","CO","PO","MO","BO","VO","FO","GO",
]);

// Mots de chantier (lieux, structures, équipes) qui ressemblent à un code
// « LETTRES + chiffres » mais n'en sont PAS. Ex : "ponte 10" = pont n°10,
// pas le câble "PONTE 10". Comparaison exacte sur les lettres normalisées.
const SITE_WORDS = new Set([
  "PONTE","PONT","PORTA","PORTE","RAMPA","SCALA","SALA","SALE",
  "ZONA","AREA","LOCALE","SQUADRA","LATO","CABINA","QUADRO",
]);

// ---------------------------------------------------------------------------
// Strip émojis / symboles non-alphabétiques non-numériques
// ---------------------------------------------------------------------------
function stripNoise(s: string): string {
  return s
    // Emoji unicode ranges
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]/gu, "")
    // Symbols spéciaux chantier (◑ ● ○)
    .replace(/[◑●○◐◒◓◔◕▶▷►◀◁◄]/g, "")
    // @mentions WhatsApp
    .replace(/@[^\s]+/g, "")
    // Trim
    .trim();
}

// Strip préfixe section "1-6 " ou "A-3 " en début de segment
function stripSectionPrefix(s: string): string {
  return s.replace(/^\d+[-/]\d+\s+/, "");
}

// ---------------------------------------------------------------------------
// Normalise un code câble brut vers le format canonique "LETTERS DIGITS[SUFFIX]"
// ---------------------------------------------------------------------------
export function normalizeCableCode(raw: string): string {
  // Strip section prefix "1-7 " etc.
  let s = stripSectionPrefix(stripNoise(raw));
  // Collapse separators (spaces, dots, dashes between letters)
  s = s.replace(/[\s.\-]+/g, " ").trim().toUpperCase();
  // Match: 2-3 letters (possibly spaced) + digits + optional suffix
  const m = s.match(/^([A-Z](?:\s*[A-Z]){1,2})\s*([\d]{2,5})\s*([A-Z]?)$/);
  if (!m) {
    // Fallback: try without spaces at all e.g. "WTI036" or "wti036"
    const m2 = s.replace(/\s+/g, "").match(/^([A-Z]{2,3})([\d]{2,5})([A-Z]?)$/i);
    if (m2) {
      const letters = m2[1].toUpperCase();
      const digits  = m2[2];
      const suffix  = m2[3].toUpperCase();
      return suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`;
    }
    return s;
  }
  const letters = m[1].replace(/\s+/g, "");
  const digits  = m[2];
  const suffix  = m[3];
  return suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`;
}

/**
 * Convert normalized code "WTI 036" → INCA spaced format "W TI 036"
 * INCA stores: [ship_letter] [family_code] [number]
 * Normalized:  [ship_letter][family_code] [number]
 */
export function normalizedToIncaCode(normalized: string): string {
  const m = normalized.match(/^([A-Z])([A-Z]{1,2})\s+([\d]{2,5}.*)$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return normalized;
}

/**
 * All search variants for a cable code (for fuzzy DB lookups).
 * Given "WTI 036" returns: ["WTI 036", "W TI 036", "WTI036"]
 */
export function cableCodeVariants(normalized: string): string[] {
  const variants = new Set<string>();
  variants.add(normalized);
  variants.add(normalizedToIncaCode(normalized));                // "W TI 036"
  variants.add(normalized.replace(/\s+/g, ""));                 // "WTI036"
  variants.add(normalized.toLowerCase());                        // "wti 036"
  variants.add(normalizedToIncaCode(normalized).toLowerCase());  // "w ti 036"
  return [...variants].filter((v) => v.length >= 4);
}

// ---------------------------------------------------------------------------
// Extraction depuis un bloc de texte
// Line-by-line pour capturer un câble par ligne.
// ---------------------------------------------------------------------------
export function extractCableRefs(text: string): ExtractedCableRef[] {
  const results: ExtractedCableRef[] = [];
  const seen = new Set<string>();

  const lines = text.split(/\n/);

  for (const rawLine of lines) {
    const line = stripSectionPrefix(stripNoise(rawLine)).trim();
    if (!line) continue;

    // Regex: 2-3 letters (possibly spaced/dotted) + 2-5 digits + optional suffix.
    // Le suffixe variante doit être COLLÉ aux chiffres ("038A") : une lettre
    // séparée par un espace est un mot (conjonction italienne "e"=et, "o"=ou…),
    // jamais un suffixe. Ex : "IRS 002 e TVU 074" → deux câbles, pas "IRS 002 E".
    const re = /\b([A-Za-z](?:[\s.]*[A-Za-z]){1,2})[\s.]*(\d{2,5})([A-Za-z]?)\b/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      const rawMatch = m[0].trim();
      const letterRaw = m[1].replace(/[\s.]+/g, "").toUpperCase();
      const digits    = m[2];
      const suffix    = m[3].toUpperCase();

      // Filtre : lettres entre 2 et 3 chars
      if (letterRaw.length < 2 || letterRaw.length > 3) continue;
      // Filtre : pas un mot commun
      if (COMMON_WORDS.has(letterRaw)) continue;
      // Filtre : pas un mot de chantier (ponte, scala, zona…)
      if (SITE_WORDS.has(letterRaw)) continue;
      // Filtre : pas un nombre seul déguisé
      if (/^\d+$/.test(letterRaw)) continue;

      const normalized = suffix
        ? `${letterRaw} ${digits} ${suffix}`
        : `${letterRaw} ${digits}`;

      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push({ raw: rawMatch, normalized, line: rawLine.trim() });
      }
    }
  }

  return results;
}
