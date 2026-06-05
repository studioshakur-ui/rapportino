// src/normalizer.ts — extraction des codes câble depuis un message WhatsApp
// Même logique que normalizer.agent.ts côté frontend. Dupliquée intentionnellement
// pour que le bridge soit complètement autonome (pas de dépendance Vite/React).

const COMMON_WORDS = new Set([
  "OK","SI","NO","HO","HA","CI","DA","DI","IN","UN","LA","LE","LO","AI",
  "ME","TE","SE","MA","OR","ED","AL","NE","SU","GU","DO","RE","FA","MI",
  "HI","IS","IT","AT","AS","BE","BY","IF","OF","ON","TO","UP","WE",
  "IA","IO","SA","SO","CO","PO","MO","BO","VO","FO","GO",
]);

function stripNoise(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/[◑●○◐◒◓◔◕▶▷►◀◁◄]/g, "")
    .replace(/@[^\s]+/g, "")
    .trim();
}

function stripSectionPrefix(s: string): string {
  return s.replace(/^\d+[-/]\d+\s+/, "");
}

export function normalizeCableCode(raw: string): string {
  const cleaned = stripNoise(raw).replace(/[\s.]+/g, " ").trim().toUpperCase();
  const m = cleaned.match(/^([A-Z](?:\s*[A-Z]){1,4})\s*([\d]{2,5})\s*([A-Z]?)$/);
  if (!m) return cleaned;
  const letters = m[1].replace(/\s+/g, "");
  const digits  = m[2];
  const suffix  = m[3];
  return suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`;
}

export interface ExtractedRef {
  raw:        string;
  normalized: string;
}

export function extractCableRefs(text: string): ExtractedRef[] {
  const results: ExtractedRef[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\n/);

  for (const rawLine of lines) {
    const line = stripSectionPrefix(stripNoise(rawLine)).trim();
    if (!line) continue;

    const re = /\b([A-Za-z](?:[\s.]*[A-Za-z]){1,4})[\s.]*(\d{2,5})\s*([A-Za-z]?)\b/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      const letterRaw = m[1].replace(/[\s.]+/g, "").toUpperCase();
      const digits    = m[2];
      const suffix    = m[3].toUpperCase();

      if (letterRaw.length < 2 || letterRaw.length > 5) continue;
      if (COMMON_WORDS.has(letterRaw)) continue;
      if (/^\d+$/.test(letterRaw)) continue;

      const normalized = suffix ? `${letterRaw} ${digits} ${suffix}` : `${letterRaw} ${digits}`;

      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push({ raw: m[0].trim(), normalized });
      }
    }
  }
  return results;
}

// Détecte un pourcentage dans un message ("70%" "100%%" "95 %")
export function extractProgressPercent(text: string): number | null {
  const m = text.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return v >= 0 && v <= 100 ? v : null;
}
