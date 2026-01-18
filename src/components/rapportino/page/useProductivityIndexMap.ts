// src/components/rapportino/page/useProductivityIndexMap.ts
import { useMemo } from "react";
import { useOperatorProductivityData } from "../../../features/kpi/components/operatorProd/hooks/useOperatorProductivityData";

function normKey(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

export function useProductivityIndexMap({
  profileId,
  reportDate,
  costr,
  commessa,
  visibleRows,
}: {
  profileId: string | undefined;
  reportDate: string;
  costr: string | null | undefined;
  commessa: string | null | undefined;
  visibleRows: any[];
}): Map<string, number> {
  const operatorIdsInReport = useMemo(() => {
    const set = new Set<string>();
    (Array.isArray(visibleRows) ? visibleRows : []).forEach((r) => {
      const items = Array.isArray(r?.operator_items) ? r.operator_items : [];
      items.forEach((it: any) => {
        const id = it?.operator_id;
        if (id != null && String(id).trim()) set.add(String(id));
      });
    });
    const arr = Array.from(set.values());
    return arr.length > 0 && arr.length <= 250 ? arr : [];
  }, [visibleRows]);

  const { familyRows } = useOperatorProductivityData({
    profileId,
    scope: "CAPO",
    dateFrom: reportDate,
    dateTo: reportDate,
    showCostrCommessaFilters: false,
    costrFilter: costr || null,
    commessaFilter: commessa || null,
    selectedIds: operatorIdsInReport,
    search: "",
  });

  return useMemo(() => {
    const m = new Map<string, number>();
    const rows = Array.isArray(familyRows) ? familyRows : [];

    rows.forEach((r: any) => {
      const day = r?.report_date ? String(r.report_date) : null;
      if (day && String(day) !== String(reportDate)) return;

      const opId = r?.operator_id ? String(r.operator_id) : null;
      if (!opId) return;

      const cat = normKey(r?.categoria);
      const desc = normKey(r?.descrizione);
      if (!cat && !desc) return;

      const idx = r?.productivity_index;
      if (idx == null || !Number.isFinite(Number(idx))) return;

      const key = `${opId}||${cat}||${desc}`;
      if (!m.has(key)) m.set(key, Number(idx));
    });

    return m;
  }, [familyRows, reportDate]);
}
