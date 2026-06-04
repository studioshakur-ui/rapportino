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
  const cleaned = stripNoise(raw).replace(/[\s.]+/g, " ").trim().toUpperCase();
  // Sépare lettres et chiffres
  const m = cleaned.match(/^([A-Z](?:\s*[A-Z]){1,4})\s*([\d]{2,5})\s*([A-Z]?)$/);
  if (!m) return cleaned;
  const letters = m[1].replace(/\s+/g, "");
  const digits  = m[2];
  const suffix  = m[3];
  return suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`;
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

    // Regex permissive :
    // - 1-5 lettres, chaque lettre séparée par espaces/points facultatifs
    // - séparateur optionnel (points, espaces)
    // - 2-5 chiffres
    // - suffixe lettre optionnel
    const re = /\b([A-Za-z](?:[\s.]*[A-Za-z]){1,4})[\s.]*(\d{2,5})\s*([A-Za-z]?)\b/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      const rawMatch = m[0].trim();
      const letterRaw = m[1].replace(/[\s.]+/g, "").toUpperCase();
      const digits    = m[2];
      const suffix    = m[3].toUpperCase();

      // Filtre : lettres entre 2 et 5 chars
      if (letterRaw.length < 2 || letterRaw.length > 5) continue;
      // Filtre : pas un mot commun
      if (COMMON_WORDS.has(letterRaw)) continue;
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
