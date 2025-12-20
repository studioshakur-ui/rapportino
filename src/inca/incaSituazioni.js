// src/inca/incaSituazioni.js
// Source de vérité unique — INCA situazioni (ordre + labels + couleurs)
// IMPORTANT: E = ELIMINATO (pas "Eseguito")

export const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"];

export const SITUAZIONI_LABEL = {
  NP: "Non posato",
  T: "Teorico",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eliminato",
};

export function normalizeSituazione(s) {
  const v = String(s || "").trim().toUpperCase();
  return v && SITUAZIONI_ORDER.includes(v) ? v : "NP";
}

export function colorForSituazione(code) {
  const k = normalizeSituazione(code);
  // Palette cohérente: NP neutre, T bleu, P vert, R jaune, B violet, E rose
  switch (k) {
    case "P":
      return "#34d399";
    case "T":
      return "#38bdf8";
    case "R":
      return "#fbbf24";
    case "B":
      return "#e879f9";
    case "E":
      return "#fb7185";
    case "NP":
    default:
      return "#94a3b8";
  }
}
