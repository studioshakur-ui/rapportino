import type { NavemasterDiffKind, NavemasterDiffRow, NavemasterNormalizedRow } from "./navemaster.types";

function pickComparable(row: NavemasterNormalizedRow): Record<string, unknown> {
  return {
    impianto: row.impianto,
    zona_da: row.zona_da,
    zona_a: row.zona_a,
    apparato_da: row.apparato_da,
    apparato_a: row.apparato_a,
    stato_cavo: row.stato_cavo,
    situazione_cavo_conit: row.situazione_cavo_conit,
    metri_calcolo: row.payload.metri_calcolo,
    metri_dis: row.payload.metri_dis,
    metri_can: row.payload.metri_can,
    note_sviluppo: row.payload.note_sviluppo,
    problematiche_cavi: row.payload.problematiche_cavi,
    problematiche_collegamenti: row.payload.problematiche_collegamenti,
  };
}

function pushDiff(list: NavemasterDiffRow[], marcacavo: string, kind: NavemasterDiffKind, before: Record<string, unknown> | null, after: Record<string, unknown> | null): void {
  list.push({ marcacavo, kind, before, after });
}

export function buildNavemasterDiff(previousRows: NavemasterNormalizedRow[], nextRows: NavemasterNormalizedRow[]): NavemasterDiffRow[] {
  const previousMap = new Map(previousRows.map((row) => [row.marcacavo, row]));
  const nextMap = new Map(nextRows.map((row) => [row.marcacavo, row]));
  const allCodes = Array.from(new Set([...previousMap.keys(), ...nextMap.keys()])).sort();
  const diff: NavemasterDiffRow[] = [];

  for (const code of allCodes) {
    const before = previousMap.get(code);
    const after = nextMap.get(code);

    if (!before && after) {
      pushDiff(diff, code, "NEW_CABLE", null, pickComparable(after));
      continue;
    }
    if (before && !after) {
      pushDiff(diff, code, "REMOVED_CABLE", pickComparable(before), null);
      continue;
    }
    if (!before || !after) continue;

    if ((before.stato_cavo ?? "") !== (after.stato_cavo ?? "") || (before.situazione_cavo_conit ?? "") !== (after.situazione_cavo_conit ?? "")) {
      pushDiff(diff, code, "STATUS_CHANGED", pickComparable(before), pickComparable(after));
    }
    if ((before.impianto ?? "") !== (after.impianto ?? "")) {
      pushDiff(diff, code, "PERIMETER_CHANGED", pickComparable(before), pickComparable(after));
    }
    if ((before.apparato_da ?? "") !== (after.apparato_da ?? "") || (before.apparato_a ?? "") !== (after.apparato_a ?? "") || (before.zona_da ?? "") !== (after.zona_da ?? "") || (before.zona_a ?? "") !== (after.zona_a ?? "")) {
      pushDiff(diff, code, "ENDPOINT_CHANGED", pickComparable(before), pickComparable(after));
    }

    const beforeMeters = JSON.stringify([before.payload.metri_calcolo, before.payload.metri_dis, before.payload.metri_can]);
    const afterMeters = JSON.stringify([after.payload.metri_calcolo, after.payload.metri_dis, after.payload.metri_can]);
    if (beforeMeters !== afterMeters) {
      pushDiff(diff, code, "METERS_CHANGED", pickComparable(before), pickComparable(after));
    }

    const beforeNotes = JSON.stringify([before.payload.note_sviluppo, before.payload.problematiche_cavi, before.payload.problematiche_collegamenti, before.payload.note_conit]);
    const afterNotes = JSON.stringify([after.payload.note_sviluppo, after.payload.problematiche_cavi, after.payload.problematiche_collegamenti, after.payload.note_conit]);
    if (beforeNotes !== afterNotes) {
      pushDiff(diff, code, "NOTE_CHANGED", pickComparable(before), pickComparable(after));
    }
  }

  return diff;
}

export function groupNavemasterDiff(diffRows: NavemasterDiffRow[]): Record<NavemasterDiffKind, NavemasterDiffRow[]> {
  return diffRows.reduce<Record<NavemasterDiffKind, NavemasterDiffRow[]>>((acc, row) => {
    acc[row.kind].push(row);
    return acc;
  }, {
    NEW_CABLE: [],
    REMOVED_CABLE: [],
    STATUS_CHANGED: [],
    METERS_CHANGED: [],
    PERIMETER_CHANGED: [],
    ENDPOINT_CHANGED: [],
    NOTE_CHANGED: [],
  });
}
