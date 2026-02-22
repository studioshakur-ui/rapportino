// src/navemaster/hooks/useNavemasterAlerts.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { AlertsQuery } from "../contracts/navemaster.query";
import type { NavemasterIncaAlert, PageResult } from "../contracts/navemaster.types";
import { ilikePattern } from "../contracts/navemaster.logic";

export function useNavemasterAlerts(q: AlertsQuery | null): {
  result: PageResult<NavemasterIncaAlert>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const empty: PageResult<NavemasterIncaAlert> = useMemo(
    () => ({ rows: [], page: 1, pageSize: 50, total: null, hasMore: false }),
    []
  );

  const [result, setResult] = useState<PageResult<NavemasterIncaAlert>>(empty);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!q) {
      setResult(empty);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const page = Math.max(1, q.paging.page);
    const pageSize = Math.max(25, Math.min(200, q.paging.pageSize));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("navemaster_inca_alerts")
      .select("id, ship_id, inca_file_id, marcacavo, navemaster_state, inca_state, rule, created_at, severity, meta", {
        count: "exact",
      })
      .eq("ship_id", q.shipId);

    if (q.filters.severity && q.filters.severity !== "ALL") query = query.eq("severity", q.filters.severity);
    if (q.filters.rule && q.filters.rule !== "ALL") query = query.eq("rule", q.filters.rule);
    if (q.filters.search && q.filters.search.trim()) query = query.ilike("marcacavo", ilikePattern(q.filters.search));

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query.range(from, to);

    if (error) {
      setError(error.message || "alerts query error");
      setResult({ rows: [], page, pageSize, total: null, hasMore: false });
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as NavemasterIncaAlert[];
    const total = typeof count === "number" ? count : null;
    const hasMore = total === null ? rows.length === pageSize : from + rows.length < total;

    setResult({ rows, page, pageSize, total, hasMore });
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(q)]);

  return useMemo(() => ({ result, loading, error, refresh: load }), [result, loading, error]);
}