// /src/components/rapportino/page/useProductivityIndexMap.ts
// Read-only mapping: (operator_id, categoria, descrizione) -> productivity_index
// Source of truth: KPI views (computed server-side). No recalculation in UI.

import { useMemo } from "react";

import { useOperatorProductivityData } from "../../../features/kpi/components/operatorProd/hooks/useOperatorProductivityData";

type AnyRow = Record<string, any>;

function normKey(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function extractOperatorIdsFromRows(rows: AnyRow[]): string[] {
  const set = new Set<string>();
  const arr = Array.isArray(rows) ? rows : [];
  for (const r of arr) {
    const items = Array.isArray(r?.operator_items) ? r.operator_items : [];
    for (const it of items) {
      const id = it?.operator_id;
      const s = id == null ? "" : String(id).trim();
      if (s) set.add(s);
    }
  }
  const out = Array.from(set.values());
  // garde-fou (éviter requêtes énormes)
  return out.length > 0 && out.length <= 250 ? out : [];
}

export function useProductivityIndexMap({
  profileId,
  reportDate,
  costr,
  commessa,
  rows,
}: {
  profileId: string | undefined;
  reportDate: string;
  costr: string;
  commessa: string;
  rows: AnyRow[];
}): Map<string, number> {
  const operatorIds = useMemo(() => extractOperatorIdsFromRows(rows), [rows]);

  const { familyRows } = useOperatorProductivityData({
    profileId,
    scope: "CAPO",
    dateFrom: reportDate,
    dateTo: reportDate,
    showCostrCommessaFilters: false,
    costrFilter: costr || null,
    commessaFilter: commessa || null,
    selectedIds: operatorIds,
    search: "",
  });

  const map = useMemo(() => {
    const m = new Map<string, number>();
    const arr: AnyRow[] = Array.isArray(familyRows) ? (familyRows as unknown as AnyRow[]) : [];

    for (const r of arr) {
      const opId = r?.operator_id ? String(r.operator_id).trim() : "";
      if (!opId) continue;

      const cat = normKey(r?.categoria);
      const desc = normKey(r?.descrizione);
      if (!cat && !desc) continue;

      const idxRaw = r?.productivity_index;
      const idx = Number(idxRaw);
      if (!Number.isFinite(idx)) continue;

      const key = `${opId}||${cat}||${desc}`;
      if (!m.has(key)) m.set(key, idx);
    }

    return m;
  }, [familyRows]);

  return map;
}
