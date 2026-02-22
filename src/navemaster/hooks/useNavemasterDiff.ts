// src/navemaster/hooks/useNavemasterDiff.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { DiffQuery } from "../contracts/navemaster.query";
import type { NavemasterIncaDiff, PageResult } from "../contracts/navemaster.types";
import { ilikePattern } from "../contracts/navemaster.logic";

export function useNavemasterDiff(q: DiffQuery | null): {
  result: PageResult<NavemasterIncaDiff>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const empty: PageResult<NavemasterIncaDiff> = useMemo(
    () => ({ rows: [], page: 1, pageSize: 50, total: null, hasMore: false }),
    []
  );

  const [result, setResult] = useState<PageResult<NavemasterIncaDiff>>(empty);
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
      .from("navemaster_inca_diff")
      .select(
        "id, ship_id, inca_file_id, marcacavo, nav_status, inca_status_prev, inca_status_new, match_prev, match_new, severity, rule, created_at, prev_value, new_value, meta",
        { count: "exact" }
      )
      .eq("ship_id", q.shipId);

    if (q.filters.severity && q.filters.severity !== "ALL") query = query.eq("severity", q.filters.severity);
    if (q.filters.rule && q.filters.rule !== "ALL") query = query.eq("rule", q.filters.rule);
    if (q.filters.search && q.filters.search.trim()) query = query.ilike("marcacavo", ilikePattern(q.filters.search));

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query.range(from, to);

    if (error) {
      setError(error.message || "diff query error");
      setResult({ rows: [], page, pageSize, total: null, hasMore: false });
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as NavemasterIncaDiff[];
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