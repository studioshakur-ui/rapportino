// src/modules/whatsapp/normalize.ts
// Heuristiques d'extraction d'un événement structuré depuis un message brut.
// Partagé par WhatsApp Intake et le Normalizer Agent.
import type { CableEventType } from "../../core/db/types";

export type NormalizedEvent = {
  kind: CableEventType | null;
  cavo_code: string | null;
  meters: number | null;
  zone: string | null;
  confidence: number; // 0..1
};

// Marca cavo typique : "1-1 N AH163", "2-3 B C123", codes alphanumériques.
const CAVO_RE = /\b(\d{1,2}-\d{1,2}\s*[A-Z]?\s*[A-Z]{1,3}\d{2,5})\b/i;
const CODICE_RE = /\b([A-Z]{1,4}\d{2,6})\b/;
const METERS_RE = /\b(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m|mt|metri|mètres|metres)\b/i;
const ZONE_RE = /\b(?:zona|zone|local[ei]?)\s*[:#]?\s*([A-Z0-9\-]{1,12})\b/i;

const KIND_KEYWORDS: Array<{ kind: CableEventType; re: RegExp }> = [
  { kind: "blocco", re: /\b(blocc|bloqu|bloque|stop|fermo|impedit)/i },
  { kind: "ripresa", re: /\b(riprend|ripres|rework|rifare|rifatt|reprise|refait)/i },
  { kind: "anomalia", re: /\b(anomal|problem|errore|sbagliat|difett|defaut|défaut)/i },
  { kind: "posa", re: /\b(posat|posa|pos[eé]|tir[ae]t|stes[ao]|installat|fatto|fait|termin)/i },
];

export function normalizeMessage(text: string): NormalizedEvent {
  const cavoMatch = CAVO_RE.exec(text);
  const codiceMatch = !cavoMatch ? CODICE_RE.exec(text) : null;
  const metersMatch = METERS_RE.exec(text);
  const zoneMatch = ZONE_RE.exec(text);

  let kind: CableEventType | null = null;
  for (const k of KIND_KEYWORDS) {
    if (k.re.test(text)) {
      kind = k.kind;
      break;
    }
  }

  const cavo_code = (cavoMatch?.[1] ?? codiceMatch?.[1] ?? null)?.replace(/\s+/g, " ").trim() ?? null;
  const meters = metersMatch ? Number(metersMatch[1].replace(",", ".")) : null;
  const zone = zoneMatch?.[1] ?? null;

  // confiance : présence code + type + mètres
  let confidence = 0;
  if (cavo_code) confidence += 0.4;
  if (kind) confidence += 0.4;
  if (meters != null) confidence += 0.2;

  return { kind, cavo_code, meters, zone, confidence };
}
