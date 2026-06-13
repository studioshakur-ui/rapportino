// src/modules/navemaster/perimetroBoard.logic.ts
// Logique pure du tableau périmètre : choix des périmètres à mettre en avant
// ("phrase du matin") et formatage. Aucune dépendance React/DB -> testable.

import type { PerimetroBoardRow } from "./navemaster.types";

/** Un périmètre est "actionnable" tant qu'il reste des câbles à compléter. */
export function isActionable(row: PerimetroBoardRow): boolean {
  return row.da_completare > 0;
}

/** En retard = échéance dépassée (jours au target strictement négatif). */
export function isOverdue(row: PerimetroBoardRow): boolean {
  return row.giorni_al_target != null && row.giorni_al_target < 0;
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
      if (a.da_completare !== b.da_completare) return a.da_completare - b.da_completare;
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

/** Une puce lisible par câble : "INAV 2 (50% posa, 3 cavi) · in ritardo di 78 g". */
export function describeHighlight(row: PerimetroBoardRow): string {
  const pct = row.pct_posa == null ? "—" : `${row.pct_posa}%`;
  const cavi = row.da_completare === 1 ? "1 cavo" : `${row.da_completare} cavi`;
  const bloc = row.bloccati > 0 ? ` · ${row.bloccati} bloccati` : "";
  return `${row.perimetro} (${pct} posa, ${cavi})${deadlineFragment(row)}${bloc}`;
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
