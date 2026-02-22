// src/navemaster/hooks/useNavemasterKpiSummary.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NavemasterKpiSummaryV2 } from "../contracts/navemaster.types";

export function useNavemasterKpiSummary(shipId: string | null, refreshKey?: number): {
  summary: NavemasterKpiSummaryV2 | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [summary, setSummary] = useState<NavemasterKpiSummaryV2 | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!shipId) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("navemaster_kpi_v2")
      .select(
        "ship_id, costr, commessa, run_id, frozen_at, verdict, total, cnt_p, cnt_t, cnt_r, cnt_l, cnt_b, cnt_e, cnt_np, metri_ref_sum, metri_posati_sum, delta_sum, progress_ratio"
      )
      .eq("ship_id", shipId)
      .maybeSingle();

    if (error) {
      setError(error.message || "kpi summary error");
      setSummary(null);
      setLoading(false);
      return;
    }

    setSummary((data as NavemasterKpiSummaryV2 | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, refreshKey]);

  return useMemo(() => ({ summary, loading, error, refresh: load }), [summary, loading, error]);
}
