// src/modules/navemaster/perimetroBoard.logic.ts
// Logique pure du tableau périmètre : choix des périmètres à mettre en avant
// ("phrase du matin") et formatage. Aucune dépendance React/DB -> testable.

import type { PerimetroBoardRow } from "./navemaster.types";

/** Un périmètre est "actionnable" tant qu'il reste des câbles à compléter. */
export function isActionable(row: PerimetroBoardRow): boolean {
  return leverCount(row) > 0;
}

/** En retard = échéance dépassée (jours au target strictement négatif). */
export function isOverdue(row: PerimetroBoardRow): boolean {
  return row.giorni_al_target != null && row.giorni_al_target < 0;
}

export function cableLevers(row: PerimetroBoardRow): { daPosare: number; daCollegare: number } {
  const daPosare = Math.max(0, row.tot_cavi - row.posati);
  const daCollegare = Math.max(0, row.posati - row.collegati);
  return { daPosare, daCollegare };
}

function leverCount(row: PerimetroBoardRow): number {
  const buckets =
    (row.da_posare ?? 0)
    + (row.da_sistemare ?? 0)
    + (row.pronto_coll ?? 0)
    + (row.coll_parziale ?? 0);
  return buckets > 0 ? buckets : row.da_completare;
}

/**
 * Classement pour la phrase du matin : on veut le plus fort levier en premier.
 *   1) en retard d'abord,
 *   2) le moins de câbles restants (le plus proche d'être livré),
 *   3) le plus avancé en pose.
 */
export function rankForMorning(rows: PerimetroBoardRow[]): PerimetroBoardRow[] {
  return rows
    .filter(isActionable)
    .slice()
    .sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const ar = leverCount(a);
      const br = leverCount(b);
      if (ar !== br) return ar - br;
      return (b.pct_posa ?? 0) - (a.pct_posa ?? 0);
    });
}

/** Les N périmètres à mettre en avant (par défaut 3). */
export function pickMorningHighlights(rows: PerimetroBoardRow[], n = 3): PerimetroBoardRow[] {
  return rankForMorning(rows).slice(0, n);
}

function deadlineFragment(row: PerimetroBoardRow): string {
  const g = row.giorni_al_target;
  if (g == null) return "";
  if (g < 0) return ` · in ritardo di ${Math.abs(g)} g`;
  if (g <= 14) return ` · consegna tra ${g} g`;
  return "";
}

function leverFragments(row: PerimetroBoardRow): string[] {
  if ((row.da_posare ?? 0) > 0) return [`${row.da_posare} da posare`];
  if ((row.da_sistemare ?? 0) > 0) return [`${row.da_sistemare} da sistemare`];
  if ((row.pronto_coll ?? 0) > 0) return [row.pronto_coll === 1 ? "1 pronto da collegare" : `${row.pronto_coll} pronti da collegare`];
  if ((row.coll_parziale ?? 0) > 0) return [row.coll_parziale === 1 ? "1 da finire" : `${row.coll_parziale} da finire`];
  return [];
}

/** Une puce lisible par levier dominant : "INAV 2 — 2 pronti da collegare · in ritardo di 78 g". */
export function describeHighlight(row: PerimetroBoardRow): string {
  const leverFragment = leverFragments(row)[0] || `${row.da_completare} cavi rimasti`;
  const bloc = row.bloccati > 0 ? ` · ${row.bloccati} bloccati` : "";
  return `${row.perimetro} — ${leverFragment}${deadlineFragment(row)}${bloc}`;
}

/** La "phrase du matin" : où appuyer aujourd'hui pour décrocher des consegne. */
export function buildMorningSentence(rows: PerimetroBoardRow[]): string {
  const highlights = pickMorningHighlights(rows);
  if (highlights.length === 0) {
    return rows.length === 0
      ? "Nessun perimetro nel baseline INCA attivo."
      : "Tutti i perimetri sono completi. Niente da chiudere oggi.";
  }
  return `Da chiudere: ${highlights.map(describeHighlight).join(" · ")}.`;
}
