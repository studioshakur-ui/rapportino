// src/modules/whatsapp/parser.ts
// Parsing d'un export WhatsApp .txt (historique de conversation).
// Gère les formats iOS et Android, messages multi-lignes, et messages système.

export type ParsedWaMessage = {
  sent_at: string | null; // ISO
  author: string | null;
  raw_text: string;
  is_system: boolean;
};

// iOS:     [12/05/2024, 14:32:11] Hamidou: texte
// iOS bis: [12/05/24, 2:32:11 PM] Hamidou: texte
const IOS_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\]\s*(?:([^:]{1,60}):\s*)?(.*)$/i;
// Android: 12/05/2024, 14:32 - Hamidou: texte
const ANDROID_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?\s+-\s+(?:([^:]{1,60}):\s*)?(.*)$/i;

function buildDate(
  d: string,
  m: string,
  y: string,
  hh: string,
  mm: string,
  ss: string | undefined,
  ampm: string | undefined
): string | null {
  let year = Number(y);
  if (year < 100) year += 2000;
  let hour = Number(hh);
  if (ampm) {
    const isPM = ampm.toUpperCase() === "PM";
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  }
  // Format WhatsApp = jour/mois/année (locale FR/IT).
  const date = new Date(year, Number(m) - 1, Number(d), hour, Number(mm), ss ? Number(ss) : 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function matchHeader(line: string): ParsedWaMessage | null {
  const clean = line.replace(/^‎/, "").replace(/‪|‬/g, "");
  let m = IOS_RE.exec(clean);
  let kind: "ios" | "android" | null = m ? "ios" : null;
  if (!m) {
    m = ANDROID_RE.exec(clean);
    kind = m ? "android" : null;
  }
  if (!m || !kind) return null;
  const [, dd, mo, yy, hh, mm, ss, ampm, author, text] = m;
  return {
    sent_at: buildDate(dd, mo, yy, hh, mm, ss, ampm),
    author: author ? author.trim() : null,
    raw_text: text ?? "",
    is_system: !author,
  };
}

export function parseWhatsappTxt(content: string): ParsedWaMessage[] {
  const lines = content.split(/\r?\n/);
  const out: ParsedWaMessage[] = [];
  let current: ParsedWaMessage | null = null;

  for (const line of lines) {
    const header = matchHeader(line);
    if (header) {
      if (current) out.push(current);
      current = header;
    } else if (current) {
      // continuation multi-lignes
      current.raw_text += (current.raw_text ? "\n" : "") + line;
    }
  }
  if (current) out.push(current);

  return out
    .map((m) => ({ ...m, raw_text: m.raw_text.trim() }))
    .filter((m) => m.raw_text.length > 0);
}
