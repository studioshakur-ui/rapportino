// src/components/DirectionDashboard.tsx
//
// Direction Dashboard (Direzione) — KPI strip + charts + drill-down modal.
// Refactor 2026-02: split monolith into feature modules under src/features/direzione/dashboard.

import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { useCoreI18n } from "../i18n/CoreI18n";

import DirezioneHeader from "../features/direzione/dashboard/components/DirezioneHeader";
import DirezioneFilters from "../features/direzione/dashboard/components/DirezioneFilters";
import DirezioneKpiStrip from "../features/direzione/dashboard/components/DirezioneKpiStrip";
import DirezioneCharts from "../features/direzione/dashboard/components/DirezioneCharts";
import DirezioneKpiModal from "../features/direzione/dashboard/components/DirezioneKpiModal";

import type { KpiId } from "../features/direzione/dashboard/kpiRegistry";
import { buildIncaOption } from "../features/direzione/dashboard/charts";
import {
  selectKpiSummary,
  selectProdTrend,
  selectTimeline,
  selectTopProduzioni,
} from "../features/direzione/dashboard/selectors";
import { useDirezioneDashboardData } from "../features/direzione/dashboard/useDirezioneDashboardData";
import type { DirezioneFilters as DirezioneFiltersT } from "../features/direzione/dashboard/types";
import { toISODate } from "../features/direzione/dashboard/utils";

export default function DirectionDashboard({ isDark = true }: { isDark?: boolean }): JSX.Element {
  const { profile } = useAuth();

  const i18n = useCoreI18n();
  const tRaw = i18n?.t ? i18n.t : (k: string) => k;
  const t = (key: string, fallback?: string) => {
    const v = tRaw(key);
    if (!v || v === key) return fallback ?? key;
    return v;
  };

  // Default window = last 7 days
  const [filters, setFilters] = useState<DirezioneFiltersT>(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    return {
      dateFrom: toISODate(start),
      dateTo: toISODate(today),
      costr: "",
      commessa: "",
    };
  });

  const onReset = () => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    setFilters({ dateFrom: toISODate(start), dateTo: toISODate(today), costr: "", commessa: "" });
  };

  const [activeKpi, setActiveKpi] = useState<KpiId>(null);

  const { loading, error, dataset } = useDirezioneDashboardData({
    profilePresent: !!profile,
    filters,
  });

  const summary = useMemo(() => selectKpiSummary(dataset), [dataset]);
  const timelineData = useMemo(() => selectTimeline(dataset), [dataset]);
  const prodTrend = useMemo(() => selectProdTrend(dataset), [dataset]);
  const topProduzioni = useMemo(
    () => selectTopProduzioni(dataset.produzioniAggCurrent, 10),
    [dataset.produzioniAggCurrent]
  );

  const incaOption = useMemo(() => buildIncaOption(dataset.incaChantier), [dataset.incaChantier]);
  const hasIncaData = (dataset.incaChantier || []).length > 0;

  useEffect(() => {
    if (filters.dateFrom || filters.dateTo) return;
    onReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <DirezioneHeader
        kicker={t("DIR_KICKER", "DIR KICKER")}
        title={t("DIR_TITLE", "Dir Title")}
        readOnlyLabel={t("DIR_READONLY", "Dir Readonly")}
      />

      <DirezioneFilters
        filters={filters}
        onChange={(patch) => setFilters((s) => ({ ...s, ...patch }))}
        onReset={onReset}
        labels={{
          window: t("DIR_WINDOW", "Dir Window"),
          costr: t("DIR_COSTR", "Dir Costr"),
          commessa: t("DIR_COMMESSA", "Dir Commessa"),
          reset: t("DIR_RESET", "Dir Reset Filters"),
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-600/40 bg-rose-900/20 px-4 py-3 text-[12px] text-rose-100">
          {error}
        </div>
      ) : null}

      <DirezioneKpiStrip
        loading={loading}
        summary={summary}
        onOpenKpi={(id) => setActiveKpi(id)}
        labels={{
          rapportini: t("KPI_RAPPORTINI", "KPI RAPPORTINI"),
          righe: t("KPI_RIGHE_ATTIVITA", "KPI RIGHE ATTIVITA"),
          prod: t("KPI_INDICE_PROD", "KPI INDICE PROD"),
          incaPrev: t("KPI_INCA_PREV", "KPI INCA PREV"),
          incaReal: t("KPI_INCA_REAL", "KPI INCA REAL"),
          ore: t("KPI_ORE_LAVORO", "KPI ORE LAVORO"),
          ritardi: t("KPI_RITARDI_CAPI", "KPI RITARDI CAPI"),
          prev: t("KPI_PREV", "Kpi Prev"),
          vsPrev: t("KPI_VS_PREV", "Kpi Vs Prev"),
          metri: t("KPI_METRI", "Kpi Metri"),
          deadline: t("KPI_DEADLINE", "Kpi Deadline"),
        }}
      />

      <DirezioneCharts
        isDark={isDark}
        loading={loading}
        timelineData={timelineData}
        incaOption={incaOption}
        hasIncaData={hasIncaData}
        prodTrend={prodTrend}
        topProduzioni={topProduzioni}
      />

      <div className="text-[11px] text-slate-500">
        Formula indice = Σreal_alloc / Σprevisto_alloc (solo unit=MT, rapportini APPROVED_UFFICIO).
      </div>

      <DirezioneKpiModal
        isOpen={!!activeKpi}
        activeKpi={activeKpi}
        onClose={() => setActiveKpi(null)}
        filters={filters}
        dataset={dataset}
        t={t}
      />
    </div>
  );
}