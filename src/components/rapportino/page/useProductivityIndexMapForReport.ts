import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../../lib/supabaseClient";

type KpiRow = {
  report_date?: string;
  operator_id?: string;
  categoria?: string;
  descrizione?: string;
  productivity_index?: number;
};

type Params = {
  profileId?: string | null;
  reportDate: string;
  costr?: string | null;
  commessa?: string | null;
  rows: any[];
};

function norm(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function extractOperatorIdsFromRows(rows: any[]): string[] {
  const set = new Set<string>();
  const arr = Array.isArray(rows) ? rows : [];
  for (const r of arr) {
    const items = Array.isArray(r?.operator_items) ? r.operator_items : [];
    for (const it of items) {
      const id = it?.operator_id;
      if (id != null && String(id).trim()) set.add(String(id));
    }
  }
  const out = Array.from(set.values());
  return out.length > 0 && out.length <= 250 ? out : [];
}

export function useProductivityIndexMapForReport({ profileId, reportDate, costr, commessa, rows }: Params): Map<string, number> {
  const [kpiRows, setKpiRows] = useState<KpiRow[]>([]);

  const operatorIds = useMemo(() => extractOperatorIdsFromRows(rows), [rows]);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      if (!profileId || !reportDate) {
        if (!cancelled) setKpiRows([]);
        return;
      }

      // If the rapportino is legacy (no operator_ids), we cannot attribute per-operator indices reliably.
      if (!operatorIds.length) {
        if (!cancelled) setKpiRows([]);
        return;
      }

      const filters: Record<string, any> = {
        report_date: reportDate,
      };

      if (costr && String(costr).trim()) filters.costr = String(costr).trim();
      if (commessa && String(commessa).trim()) filters.commessa = String(commessa).trim();

      // Primary: v3 (capo_id aware)
      const q1 = supabase
        .from("kpi_operator_family_day_v3")
        .select("report_date, operator_id, categoria, descrizione, productivity_index")
        .eq("capo_id", String(profileId))
        .eq("report_date", String(reportDate))
        .in("operator_id", operatorIds);

      if (filters.costr) q1.eq("costr", filters.costr);
      if (filters.commessa) q1.eq("commessa", filters.commessa);

      const { data: d1, error: e1 } = await q1;

      if (!cancelled && !e1 && Array.isArray(d1) && d1.length) {
        setKpiRows(d1 as KpiRow[]);
        return;
      }

      // Fallback: v2 (may be less scoped)
      const q2 = supabase
        .from("kpi_operator_family_day_v2")
        .select("report_date, operator_id, categoria, descrizione, productivity_index")
        .eq("report_date", String(reportDate))
        .in("operator_id", operatorIds);

      if (filters.costr) q2.eq("costr", filters.costr);
      if (filters.commessa) q2.eq("commessa", filters.commessa);

      const { data: d2 } = await q2;
      if (!cancelled) setKpiRows((Array.isArray(d2) ? (d2 as KpiRow[]) : []) as KpiRow[]);
    }

    run().catch(() => {
      if (!cancelled) setKpiRows([]);
    });

    return () => {
      cancelled = true;
    };
  }, [profileId, reportDate, costr, commessa, operatorIds]);

  return useMemo(() => {
    const m = new Map<string, number>();
    for (const r of kpiRows) {
      const day = r?.report_date ? String(r.report_date) : null;
      if (day && String(day) !== String(reportDate)) continue;

      const opId = r?.operator_id ? String(r.operator_id) : null;
      if (!opId) continue;

      const cat = norm(r?.categoria);
      const desc = norm(r?.descrizione);
      if (!cat && !desc) continue;

      const idx = r?.productivity_index;
      if (idx == null || !Number.isFinite(Number(idx))) continue;

      const key = `${opId}||${cat}||${desc}`;
      if (!m.has(key)) m.set(key, Number(idx));
    }
    return m;
  }, [kpiRows, reportDate]);
}
