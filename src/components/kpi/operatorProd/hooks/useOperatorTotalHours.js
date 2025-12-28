// src/components/kpi/operatorProd/hooks/useOperatorTotalHours.js
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { toNumber } from "../utils/kpiHelpers";

export function useOperatorTotalHours({
  profileId,
  scope,
  dateFrom,
  dateTo,
  showCostrCommessaFilters,
  costrFilter,
  commessaFilter,
  selectedIds,
}) {
  const [totalHoursMap, setTotalHoursMap] = useState(() => new Map());

  useEffect(() => {
    if (!profileId) return;
    if (!dateFrom || !dateTo) return;

    let alive = true;
    const ac = new AbortController();

    async function load() {
      try {
        let q = supabase
          .from("direzione_operator_facts_v1")
          .select("report_date, operator_id, tempo_hours, manager_id, costr, commessa")
          .gte("report_date", dateFrom)
          .lte("report_date", dateTo)
          .abortSignal(ac.signal);

        if (scope === "MANAGER") q = q.eq("manager_id", profileId);

        if (showCostrCommessaFilters) {
          if (costrFilter) q = q.eq("costr", costrFilter);
          if (commessaFilter) q = q.eq("commessa", commessaFilter);
        }

        if (selectedIds?.length > 0 && selectedIds.length <= 250) {
          q = q.in("operator_id", selectedIds);
        }

        const { data, error } = await q;
        if (error) throw error;

        const m = new Map();
        (data || []).forEach((r) => {
          const op = r?.operator_id || null;
          if (!op) return;
          const h = toNumber(r?.tempo_hours);
          const prev = m.get(op) || 0;
          m.set(op, prev + (h > 0 ? h : 0));
        });

        if (!alive) return;
        setTotalHoursMap(m);
      } catch (e) {
        console.warn("[useOperatorTotalHours] load error:", e);
        if (!alive) return;
        setTotalHoursMap(new Map());
      }
    }

    load();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [
    profileId,
    scope,
    dateFrom,
    dateTo,
    showCostrCommessaFilters,
    costrFilter,
    commessaFilter,
    selectedIds,
  ]);

  return { totalHoursMap };
}
