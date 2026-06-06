// src/core/cable/cableDisplay.ts
// CORE COMMAND — Canonical cable DISPLAY formatter (single source of truth).
// See docs/domain/CABLE_NOMENCLATURE.md for the business rules.
//
// Layering rule (NEVER mix these up):
//   - Storage  : the exact INCA value, never mutated.
//   - Matching : normalized_code (compact, INTERNAL ONLY — never shown to a human).
//   - UI       : formatCableDisplay(code)  ← ALWAYS use this to render a code.
//
// Display contract:
//   "TKV001"        -> "T KV 001"
//   "TKV 001"       -> "T KV 001"
//   "T KV 001"      -> "T KV 001"
//   "NAH163"        -> "N AH 163"
//   "IRS002"        -> "I RS 002"
//   "1-1TKV001"     -> "1-1 T KV 001"   (alimento — prefix preserved)
//   "1-1 N AH 163"  -> "1-1 N AH 163"
//
// ABSOLUTE RULE: the numeric "alimento" prefix (1-1, 1-5, 2-2, …) is part of
// the cable identity and is NEVER stripped. "1-1 N AH 163" and "N AH 163" are
// two DIFFERENT cables. This formatter only inserts spacing — it never removes
// the prefix and never merges the two forms.

// Alimento prefix: "1-1", "1-5", "2-2", "1/7" … at the very start of the code.
const ALIMENTO_PREFIX_RE = /^(\d+\s*[-/]\s*\d+)\s*/;

// Core cable body once spaces are removed:
//   1 head letter + 1..4 letters + 2..5 digits + optional trailing suffix letter.
const CABLE_BODY_RE = /^([A-Z])([A-Z]{1,4})(\d{2,5})([A-Z]?)$/;

/**
 * Format a cable code for human display.
 *
 * Preserves the alimento prefix verbatim and inserts the canonical spacing
 * ("T KV 001"). Falls back to a cleaned (trimmed / single-spaced / uppercased)
 * version when the value does not look like a cable code — it never throws and
 * never mangles a non-cable string.
 */
export function formatCableDisplay(code: string | null | undefined): string {
  if (code == null) return "";

  // Normalize whitespace + dots, uppercase. Do NOT remove the prefix.
  const cleaned = String(code)
    .replace(/[. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!cleaned) return "";

  // Pull off the alimento prefix (kept, with its internal spacing normalized).
  let prefix = "";
  let rest = cleaned;
  const prefixMatch = cleaned.match(ALIMENTO_PREFIX_RE);
  if (prefixMatch) {
    prefix = prefixMatch[1].replace(/\s+/g, ""); // "1 - 1" -> "1-1"
    rest = cleaned.slice(prefixMatch[0].length);
  }

  // Compact the remaining body, then re-space it canonically.
  const compact = rest.replace(/\s+/g, "");
  const bodyMatch = compact.match(CABLE_BODY_RE);
  if (!bodyMatch) {
    // Not a recognizable cable body — return the cleaned input unchanged.
    return prefix ? `${prefix} ${rest}`.trim() : cleaned;
  }

  const [, head, letters, digits, suffix] = bodyMatch;
  const body = suffix
    ? `${head} ${letters} ${digits} ${suffix}`
    : `${head} ${letters} ${digits}`;

  return prefix ? `${prefix} ${body}` : body;
}
