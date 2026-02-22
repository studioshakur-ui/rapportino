// src/navemaster/hooks/useNavemasterKpis.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { KpiCounters, NavSeverity, NavStatus } from "../contracts/navemaster.types";

type CountRes = { count: number | null; error?: string };

async function countQuery(q: ReturnType<typeof supabase.from>): Promise<CountRes> {
  const { count, error } = await (q as any).select("id", { count: "exact", head: true });
  if (error) return { count: null, error: error.message || "count error" };
  return { count: count ?? null };
}

export function useNavemasterKpis(shipId: string | null, refreshKey?: number): {
  kpis: KpiCounters;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const empty: KpiCounters = useMemo(
    () => ({
      totalRows: null,
      byNavStatus: { P: null, R: null, T: null, B: null, E: null, NP: null, L: null },
      alertsBySeverity: { CRITICAL: null, MAJOR: null, INFO: null },
      diffBySeverity: { CRITICAL: null, MAJOR: null, INFO: null },
    }),
    []
  );

  const [kpis, setKpis] = useState<KpiCounters>(empty);

  async function load(): Promise<void> {
    if (!shipId) {
      setKpis(empty);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const statuses: NavStatus[] = ["P", "R", "T", "B", "E", "NP", "L"];
    const severities: NavSeverity[] = ["CRITICAL", "MAJOR", "INFO"];

    const { data: latest, error: latestErr } = await supabase
      .from("navemaster_latest_run_v2")
      .select("id")
      .eq("ship_id", shipId)
      .maybeSingle();

    if (latestErr) {
      setError(latestErr.message || "latest run error");
      setKpis(empty);
      setLoading(false);
      return;
    }

    const runId = (latest as { id?: string } | null)?.id ?? null;

    // Cockpit rows total + by stato_cavo
    const totalP = countQuery((supabase.from("navemaster_live_v2") as any).eq("ship_id", shipId));
    const byStatusP = Promise.all(
      statuses.map((s) =>
        countQuery(
          (supabase
            .from("navemaster_live_v2") as any)
            .eq("ship_id", shipId)
            .eq("stato_nav", s)
        ).then((r) => ({ s, r }))
      )
    );

    // Alerts by severity
    const alertsP = Promise.all(
      severities.map((sev) =>
        countQuery(
          (supabase
            .from("navemaster_alerts") as any)
            .eq("run_id", runId ?? "00000000-0000-0000-0000-000000000000")
            .eq("severity", sev)
        ).then((r) => ({ sev, r }))
      )
    );

    // Diff by severity
    const diffP = Promise.all(
      severities.map((sev) =>
        countQuery(
          (supabase
            .from("navemaster_inca_diff") as any)
            .eq("ship_id", shipId)
            .eq("severity", sev)
        ).then((r) => ({ sev, r }))
      )
    );

    const [totalRes, byStatusRes, alertsRes, diffRes] = await Promise.all([totalP, byStatusP, alertsP, diffP]);

    const next: KpiCounters = {
      totalRows: totalRes.count,
      byNavStatus: { P: null, R: null, T: null, B: null, E: null, NP: null, L: null },
      alertsBySeverity: { CRITICAL: null, MAJOR: null, INFO: null },
      diffBySeverity: { CRITICAL: null, MAJOR: null, INFO: null },
    };

    for (const x of byStatusRes) next.byNavStatus[x.s] = x.r.count;
    for (const x of alertsRes) next.alertsBySeverity[x.sev] = x.r.count;
    for (const x of diffRes) next.diffBySeverity[x.sev] = x.r.count;

    setKpis(next);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, refreshKey]);

  return useMemo(() => ({ kpis, loading, error, refresh: load }), [kpis, loading, error]);
}
