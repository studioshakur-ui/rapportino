// src/features/direzione/dashboard/useDirezioneAiDashboardData.ts

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { isMissingRelation, toNumber } from "./utils";
import type {
  AiScopeLevel,
  DirezioneAiAnomalyRow,
  DirezioneAiAnomalyTotalRow,
  DirezioneAiFilters,
  DirezioneAiPerformanceRow,
  DirezioneAiProjectionPoint,
  DirezioneAiRadarRow,
  DirezioneAiStabilityRow,
} from "./aiTypes";

export type DirezioneAiDashboardState = {
  loading: boolean;
  error: string | null;
  scope: AiScopeLevel;
  radar: DirezioneAiRadarRow | null;
  stability: DirezioneAiStabilityRow | null;
  projection: DirezioneAiProjectionPoint[];
  topPerformance: DirezioneAiPerformanceRow[];
  bottomPerformance: DirezioneAiPerformanceRow[];
  anomalies: DirezioneAiAnomalyRow[];
  anomaliesTotal: DirezioneAiAnomalyTotalRow | null;
};

function getScope(filters: DirezioneAiFilters): {
  scope: AiScopeLevel;
  costr: string | null;
  commessa: string | null;
} {
  const costr = filters.costr.trim();
  const commessa = filters.commessa.trim();
  if (costr && commessa) return { scope: "COMMESSA", costr, commessa };
  if (costr) return { scope: "COSTR", costr, commessa: null };
  return { scope: "GLOBAL", costr: null, commessa: null };
}

function normalizePerformance(rows: DirezioneAiPerformanceRow[]): DirezioneAiPerformanceRow[] {
  return (rows || []).map((r) => ({
    ...r,
    previsto_sum: toNumber(r.previsto_sum),
    prodotto_sum: toNumber(r.prodotto_sum),
    righe_count: toNumber(r.righe_count),
    performance_ratio: r.performance_ratio == null ? null : toNumber(r.performance_ratio),
  }));
}

export function useDirezioneAiDashboardData(opts: {
  profilePresent: boolean;
  filters: DirezioneAiFilters;
}): DirezioneAiDashboardState {
  const { profilePresent, filters } = opts;

  const scope = useMemo(() => getScope(filters), [filters.costr, filters.commessa]);

  const [state, setState] = useState<DirezioneAiDashboardState>({
    loading: true,
    error: null,
    scope: scope.scope,
    radar: null,
    stability: null,
    projection: [],
    topPerformance: [],
    bottomPerformance: [],
    anomalies: [],
    anomaliesTotal: null,
  });

  useEffect(() => {
    if (!profilePresent) return;
    let cancelled = false;

    async function load(): Promise<void> {
      setState((prev) => ({ ...prev, loading: true, error: null, scope: scope.scope }));

      try {
        const radarQuery = supabase
          .from("direzione_ai_radar_v1")
          .select("*")
          .eq("scope_level", scope.scope);

        const stabilityQuery = supabase
          .from("direzione_ai_stability_v1")
          .select("*")
          .eq("scope_level", scope.scope);

        const projectionQuery = supabase
          .from("direzione_ai_projection_v1")
          .select("*")
          .eq("scope_level", scope.scope)
          .order("forecast_date", { ascending: true });

        const anomaliesQuery = supabase
          .from("direzione_ai_anomalies_v1")
          .select("*")
          .eq("scope_level", scope.scope)
          .order("open_count", { ascending: false });

        const anomaliesTotalQuery = supabase
          .from("direzione_ai_anomalies_total_v1")
          .select("*")
          .eq("scope_level", scope.scope);

        const topPerfQuery = supabase
          .from("direzione_ai_performance_rank_v1")
          .select("*")
          .not("performance_ratio", "is", null)
          .order("performance_ratio", { ascending: false })
          .limit(5);

        const bottomPerfQuery = supabase
          .from("direzione_ai_performance_rank_v1")
          .select("*")
          .not("performance_ratio", "is", null)
          .order("performance_ratio", { ascending: true })
          .limit(5);

        if (scope.costr) {
          radarQuery.eq("costr", scope.costr);
          stabilityQuery.eq("costr", scope.costr);
          projectionQuery.eq("costr", scope.costr);
          anomaliesQuery.eq("costr", scope.costr);
          anomaliesTotalQuery.eq("costr", scope.costr);
          topPerfQuery.eq("costr", scope.costr);
          bottomPerfQuery.eq("costr", scope.costr);
        }

        if (scope.commessa) {
          radarQuery.eq("commessa", scope.commessa);
          stabilityQuery.eq("commessa", scope.commessa);
          projectionQuery.eq("commessa", scope.commessa);
          anomaliesQuery.eq("commessa", scope.commessa);
          anomaliesTotalQuery.eq("commessa", scope.commessa);
          topPerfQuery.eq("commessa", scope.commessa);
          bottomPerfQuery.eq("commessa", scope.commessa);
        } else if (scope.scope === "COSTR") {
          radarQuery.is("commessa", null);
          stabilityQuery.is("commessa", null);
          projectionQuery.is("commessa", null);
          anomaliesQuery.is("commessa", null);
          anomaliesTotalQuery.is("commessa", null);
        }

        const [
          radarRes,
          stabilityRes,
          projectionRes,
          anomaliesRes,
          anomaliesTotalRes,
          topPerfRes,
          bottomPerfRes,
        ] = await Promise.all([
          radarQuery,
          stabilityQuery,
          projectionQuery,
          anomaliesQuery,
          anomaliesTotalQuery,
          topPerfQuery,
          bottomPerfQuery,
        ]);

        const errors = [
          radarRes.error,
          stabilityRes.error,
          projectionRes.error,
          anomaliesRes.error,
          anomaliesTotalRes.error,
          topPerfRes.error,
          bottomPerfRes.error,
        ].filter(Boolean);

        if (errors.length) {
          const missing = errors.some((e) => isMissingRelation(e));
          if (missing) {
            if (!cancelled) {
              setState((prev) => ({
                ...prev,
                loading: false,
                error: "Dati AI Direzione non disponibili (view mancanti).",
                radar: null,
                stability: null,
                projection: [],
                anomalies: [],
                anomaliesTotal: null,
                topPerformance: [],
                bottomPerformance: [],
              }));
            }
            return;
          }
          throw errors[0];
        }

        if (!cancelled) {
          const radarRow = (radarRes.data || [])[0] as DirezioneAiRadarRow | undefined;
          const stabilityRow = (stabilityRes.data || [])[0] as DirezioneAiStabilityRow | undefined;
          const anomaliesTotalRow = (anomaliesTotalRes.data || [])[0] as
            | DirezioneAiAnomalyTotalRow
            | undefined;

          setState({
            loading: false,
            error: null,
            scope: scope.scope,
            radar: radarRow || null,
            stability: stabilityRow || null,
            projection: (projectionRes.data || []) as DirezioneAiProjectionPoint[],
            anomalies: (anomaliesRes.data || []) as DirezioneAiAnomalyRow[],
            anomaliesTotal: anomaliesTotalRow || null,
            topPerformance: normalizePerformance((topPerfRes.data || []) as DirezioneAiPerformanceRow[]),
            bottomPerformance: normalizePerformance((bottomPerfRes.data || []) as DirezioneAiPerformanceRow[]),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "Errore nel caricamento dei dati Direzione AI.",
            radar: null,
            stability: null,
            projection: [],
            anomalies: [],
            anomaliesTotal: null,
            topPerformance: [],
            bottomPerformance: [],
          }));
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [profilePresent, scope.scope, scope.costr, scope.commessa]);

  return state;
}
