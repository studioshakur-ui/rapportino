// src/core/cable/cableIdentity.ts
// CORE COMMAND — Canonical cable IDENTITY & MATCHING keys (single source of truth).
// See docs/domain/CABLE_NOMENCLATURE.md.
//
// The numeric "alimento" prefix (1-1, 1-5, 2-2, …) is PART of the cable identity
// and must NEVER be discarded. Two cables "1-5 I RS 002" and "I RS 002" are
// DIFFERENT cables. We therefore keep two matching keys:
//
//   - strict : prefix PRESERVED, body normalised   -> "1-5 IRS 002"
//              exact key for SDC/daily ↔ INCA (both carry the prefix)
//   - loose  : prefix STRIPPED, body normalised     -> "IRS 002"
//              fuzzy key for free-text field signals (Telegram never writes the
//              prefix) — but a loose match can be AMBIGUOUS (several alimenti),
//              in which case it must NOT be auto-assigned.
//
// Storage keeps the raw value; UI uses formatCableDisplay(). Matching uses these.

import { formatCableDisplay } from "./cableDisplay";

const SECTION_PREFIX_RE = /^(\d+)[-/](\d+)\s+(.*)$/;

/** How an INCA match was established (for traceability + confidence). */
export type CableMatchSource = "strict" | "loose" | "ambiguous" | "none";

export interface CableIdentity {
  raw: string;          // exact source value, never mutated
  display: string;      // formatCableDisplay(raw)
  strict: string;       // prefix-preserving matching key
  loose: string;        // prefix-stripped matching key
  hasPrefix: boolean;   // carries an alimento/section prefix
}

export interface CableMatchResult {
  incaCavoId: string | null;
  source: CableMatchSource;
  confidence: number; // 1 strict, 0.7 single loose, 0 ambiguous/none
}

/** Split an alimento/section prefix ("1-7 ", "2/1 ") from the rest. */
export function extractAlimentoPrefix(raw: string): { prefix: string | null; rest: string } {
  const m = String(raw ?? "").trim().match(SECTION_PREFIX_RE);
  if (m) return { prefix: `${m[1]}-${m[2]}`, rest: m[3] };
  return { prefix: null, rest: String(raw ?? "").trim() };
}

/**
 * Loose key — prefix stripped. This is the historical normalizePdfCableCode
 * behaviour, kept identical so existing keys/matches are unchanged.
 * "1-7 W SF038" -> "WSF 038" ; "N AH163" -> "NAH 163".
 */
export function normalizeCableLoose(raw: string): string {
  if (!raw) return "";

  let s = String(raw).replace(/^\d+[-/]\d+\s+/, "").trim();

  s = s
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/[◑●○◐◒◓◔◕▶▷►◀◁◄]/g, "")
    .replace(/[.\s]+/g, " ")
    .trim()
    .toUpperCase();

  const m = s.match(/^([A-Z](?:\s*[A-Z]){1,4})\s*([\d]{2,5})\s*([A-Z]?)$/);
  if (!m) {
    const m2 = s.replace(/\s+/g, "").match(/^([A-Z]{2,5})([\d]{2,5})([A-Z]?)$/);
    if (m2) {
      const letters = m2[1];
      const digits = m2[2];
      const suffix = m2[3];
      return suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`;
    }
    return s;
  }

  const letters = m[1].replace(/\s+/g, "");
  const digits = m[2];
  const suffix = m[3];
  return suffix ? `${letters} ${digits} ${suffix}` : `${letters} ${digits}`;
}

/**
 * Strict key — alimento prefix PRESERVED, body normalised like loose.
 * "1-7 W SF038" -> "1-7 WSF 038" ; "I RS 002" -> "IRS 002".
 */
export function normalizeCableStrict(raw: string): string {
  const { prefix, rest } = extractAlimentoPrefix(raw);
  const body = normalizeCableLoose(rest);
  if (!body) return prefix ?? "";
  return prefix ? `${prefix} ${body}` : body;
}

/** Compact comparison form (no spaces, upper) for set membership / joins. */
export function cableKeyCompact(value: string): string {
  return String(value ?? "").replace(/\s+/g, "").toUpperCase();
}

/** Full identity of a cable reference. */
export function buildCableIdentity(raw: string): CableIdentity {
  const strict = normalizeCableStrict(raw);
  return {
    raw: String(raw ?? ""),
    display: formatCableDisplay(raw),
    strict,
    loose: normalizeCableLoose(raw),
    hasPrefix: extractAlimentoPrefix(raw).prefix !== null,
  };
}

/**
 * Resolve a cable reference against INCA candidates, non-destructively.
 * `candidates` are INCA rows with their strict/loose keys.
 *   1) exact STRICT match (1 candidate) -> confidence 1
 *   2) else exact LOOSE match with exactly 1 candidate -> confidence 0.7
 *   3) loose match with >1 candidate -> AMBIGUOUS, never auto-assigned
 *   4) none
 */
export function resolveCableMatch(
  raw: string,
  candidates: ReadonlyArray<{ id: string; strict: string; loose: string }>
): CableMatchResult {
  const wantStrict = cableKeyCompact(normalizeCableStrict(raw));
  const wantLoose = cableKeyCompact(normalizeCableLoose(raw));

  const strictHits = candidates.filter((c) => cableKeyCompact(c.strict) === wantStrict);
  if (strictHits.length === 1) {
    return { incaCavoId: strictHits[0].id, source: "strict", confidence: 1 };
  }

  const looseHits = candidates.filter((c) => cableKeyCompact(c.loose) === wantLoose);
  const looseIds = Array.from(new Set(looseHits.map((c) => c.id)));
  if (looseIds.length === 1) {
    return { incaCavoId: looseIds[0], source: "loose", confidence: 0.7 };
  }
  if (looseIds.length > 1) {
    return { incaCavoId: null, source: "ambiguous", confidence: 0 };
  }

  return { incaCavoId: null, source: "none", confidence: 0 };
}
