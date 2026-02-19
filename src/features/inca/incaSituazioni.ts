// src/features/inca/incaSituazioni.ts
// Source de vérité unique — INCA situazioni (ordre + labels)
// Canon (Feb 2026):
// - DB: L is stored as NULL (never 'L' text)
// - KPI bucket NP = L + T + B + R

export type SituazioneAtomic = "T" | "P" | "R" | "B" | "E" | null;
export type SituazioneBucket = "NP" | "P" | "E";
export type SituazioneUi = "NP" | "T" | "P" | "R" | "B" | "E";

export const SITUAZIONI_ORDER: ReadonlyArray<SituazioneUi> = ["NP", "T", "P", "R", "B", "E"];

export const SITUAZIONI_LABEL: Readonly<Record<SituazioneUi, string>> = {
  NP: "Non posato",
  T: "Tagliato",
  P: "Posato",
  R: "Richiesta",
  B: "Bloccato",
  E: "Eliminato",
};

/**
 * Normalize an atomic DB value (P/T/R/B/E/null) into a UI code.
 * - null (L) => NP
 * - T/R/B => NP (by KPI definition), but we keep atomics available for chips/filters.
 */
export function toUiSituazione(v: unknown): SituazioneUi {
  const s0 = v === null || v === undefined ? "" : String(v);
  const s = s0.trim().toUpperCase();
  if (!s) return "NP"; // NULL => L => NP
  const c = s[0] as SituazioneUi;
  return SITUAZIONI_ORDER.includes(c) ? c : "NP";
}

/**
 * KPI bucket mapping.
 * NP = L (NULL) + T + B + R
 */
export function toKpiBucket(v: unknown): SituazioneBucket {
  const ui = toUiSituazione(v);
  if (ui === "P") return "P";
  if (ui === "E") return "E";
  return "NP";
}
