// src/navemaster/hooks/useNavemasterAlertCounts.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { NavSeverity } from "../contracts/navemaster.types";

type CountRes = { count: number | null; error?: string };

async function countQuery(q: ReturnType<typeof supabase.from>): Promise<CountRes> {
  const { count, error } = await (q as any).select("id", { count: "exact", head: true });
  if (error) return { count: null, error: error.message || "count error" };
  return { count: typeof count === "number" ? count : 0 };
}

export function useNavemasterAlertCounts(shipId: string | null, refreshKey?: number): {
  counts: Record<NavSeverity, number | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<NavSeverity, number | null>>({
    CRITICAL: null,
    MAJOR: null,
    INFO: null,
  });

  async function load(): Promise<void> {
    if (!shipId) {
      setCounts({ CRITICAL: null, MAJOR: null, INFO: null });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: latest, error: latestErr } = await supabase
      .from("navemaster_latest_run_v2")
      .select("id")
      .eq("ship_id", shipId)
      .maybeSingle();

    if (latestErr) {
      setError(latestErr.message || "latest run error");
      setCounts({ CRITICAL: null, MAJOR: null, INFO: null });
      setLoading(false);
      return;
    }

    const runId = (latest as { id?: string } | null)?.id ?? null;
    if (!runId) {
      setCounts({ CRITICAL: null, MAJOR: null, INFO: null });
      setLoading(false);
      return;
    }

    const severities: NavSeverity[] = ["CRITICAL", "MAJOR", "INFO"];
    const res = await Promise.all(
      severities.map((sev) =>
        countQuery((supabase.from("navemaster_alerts") as any).eq("run_id", runId).eq("severity", sev)).then((r) => ({
          sev,
          r,
        }))
      )
    );

    const next: Record<NavSeverity, number | null> = { CRITICAL: null, MAJOR: null, INFO: null };
    for (const x of res) next[x.sev] = x.r.count;
    setCounts(next);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, refreshKey]);

  return useMemo(() => ({ counts, loading, error, refresh: load }), [counts, loading, error]);
}
