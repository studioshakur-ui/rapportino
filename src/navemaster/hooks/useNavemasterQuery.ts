// src/navemaster/hooks/useNavemasterQuery.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { CockpitQuery } from "../contracts/navemaster.query";
import type { NavemasterLiveRowV2, PageResult } from "../contracts/navemaster.types";
import { ilikePattern } from "../contracts/navemaster.logic";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function useNavemasterQuery(q: CockpitQuery | null): {
  result: PageResult<NavemasterLiveRowV2>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const empty: PageResult<NavemasterLiveRowV2> = useMemo(
    () => ({ rows: [], page: 1, pageSize: 100, total: null, hasMore: false }),
    []
  );
  const [result, setResult] = useState<PageResult<NavemasterLiveRowV2>>(empty);

  const abortRef = useRef<AbortController | null>(null);

  async function load(): Promise<void> {
    if (!q) {
      setResult(empty);
      setError(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const pageSize = clamp(q.paging.pageSize, 25, 250);
    const page = clamp(q.paging.page, 1, 999999);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("navemaster_live_v2")
      .select(
        [
          "id",
          "run_id",
          "ship_id",
          "inca_file_id",
          "codice",
          "codice_norm",
          "is_modified",
          "stato_nav",
          "metri_ref",
          "metri_posati_ref",
          "delta_metri",
          "descrizione",
          "impianto",
          "tipo",
          "sezione",
          "livello",
          "zona_da",
          "zona_a",
          "apparato_da",
          "apparato_a",
          "descrizione_da",
          "descrizione_a",
          "wbs",
          "last_proof_at",
          "coverage",
          "created_at",
          "run_frozen_at",
          "run_verdict",
        ].join(", "),
        { count: "exact" }
      )
      .eq("ship_id", q.shipId);

    const f = q.filters;

    if (f.search && f.search.trim()) {
      query = query.ilike("codice", ilikePattern(f.search));
    }
    if (f.navStatus && f.navStatus !== "ALL") {
      query = query.eq("stato_nav", f.navStatus);
    }
    if (f.zona && f.zona !== "ALL") {
      // match either side
      query = query.or(`zona_da.eq.${f.zona},zona_a.eq.${f.zona}`);
    }
    if (f.sezione && f.sezione !== "ALL") {
      query = query.eq("sezione", f.sezione);
    }
    if (f.onlyWithInca) {
      query = query.eq("coverage", "BOTH");
    }
    if (f.onlyModified) {
      query = query.eq("is_modified", true);
    }
    if (f.onlyNoProof) {
      query = query.eq("metri_posati_ref", 0);
    }

    // sorting (safe keys only)
    query = query.order(q.sort.key, { ascending: q.sort.dir === "asc" });

    const { data, error, count } = await query.range(from, to).abortSignal(abortRef.current.signal);

    if (error) {
      setError(error.message || "query error");
      setResult({ rows: [], page, pageSize, total: null, hasMore: false });
      setLoading(false);
      return;
    }

    const rows = ((data ?? []) as unknown as NavemasterLiveRowV2[]).map((r) => r);
    const total = typeof count === "number" ? count : null;
    const hasMore = total === null ? rows.length === pageSize : from + rows.length < total;

    setResult({ rows, page, pageSize, total, hasMore });
    setLoading(false);
  }

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(q)]);

  return useMemo(() => ({ result, loading, error, refresh: load }), [result, loading, error]);
}
