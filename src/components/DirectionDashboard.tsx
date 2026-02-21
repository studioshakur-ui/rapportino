// src/components/DirectionDashboard.tsx
//
// Direction Dashboard (Direzione) — KPI strip + charts + drill-down modal.
// Refactor 2026-02: split monolith into feature modules under src/features/direzione/dashboard.

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { useCoreI18n } from "../i18n/coreI18n";

import DirezioneHeader from "../features/direzione/dashboard/components/DirezioneHeader";
import DirezioneFilters from "../features/direzione/dashboard/components/DirezioneFilters";
import DirezioneKpiStrip from "../features/direzione/dashboard/components/DirezioneKpiStrip";
import DirezioneCharts from "../features/direzione/dashboard/components/DirezioneCharts";
import DirezioneKpiModal from "../features/direzione/dashboard/components/DirezioneKpiModal";
import DirezioneVerdict from "../features/direzione/dashboard/components/DirezioneVerdict";

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
  const lang = (i18n?.lang || "it") as string;

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
        kicker={t("DIR_KICKER", "DIREZIONE · CNCS / CORE")}
        title={t("DIR_DASH_TITLE", "Dashboard Direzione")}
        readOnlyLabel={t("DIR_READONLY", "Sola lettura")}
      />

      <DirezioneFilters
        filters={filters}
        onChange={(patch) => setFilters((s) => ({ ...s, ...patch }))}
        onReset={onReset}
        labels={{
          window: t("DIR_WINDOW", "Finestra"),
          costr: t("DIR_COSTR", "COSTR"),
          commessa: t("DIR_COMMESSA", "Commessa"),
          reset: t("DIR_RESET_FILTERS", "Reset filtri"),
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-rose-600/40 bg-rose-900/20 px-4 py-3 text-[12px] text-rose-100">
          {error}
        </div>
      ) : null}

      {/* INTELLIGENCE LAYER */}
      <DirezioneVerdict isDark={isDark} lang={lang} loading={loading} summary={summary} prodTrend={prodTrend} t={t} />

      <DirezioneKpiStrip
        loading={loading}
        summary={summary}
        onOpenKpi={(id) => setActiveKpi(id)}
        lang={lang}
        labels={{
          rapportini: t("KPI_RAPPORTINI", "Rapportini"),
          righe: t("KPI_RIGHE_ATTIVITA", "Righe attività"),
          prod: t("KPI_INDICE_PROD", "Indice produttività"),
          incaPrev: t("KPI_INCA_PREV", "INCA PREV"),
          incaReal: t("KPI_INCA_REAL", "INCA REAL"),
          ore: t("KPI_ORE_LAVORO", "Ore lavoro"),
          ritardi: t("KPI_RITARDI_CAPI", "Ritardi capi"),
          prev: t("KPI_PREV", "Prev"),
          vsPrev: t("KPI_VS_PREV", "vs prev"),
          metri: t("KPI_METRI", "metri"),
          deadline: t("KPI_DEADLINE", "deadline 08:30 (J+1)"),
          prodFormulaSub: t("DIR_PROD_SUB", "Σrealizzato / Σprevisto_alloc (MT)"),
        }}
      />

      <DirezioneCharts
        isDark={isDark}
        lang={lang}
        t={t}
        loading={loading}
        timelineData={timelineData}
        incaOption={incaOption}
        hasIncaData={hasIncaData}
        prodTrend={prodTrend}
        topProduzioni={topProduzioni}
      />

      <div className="text-[11px] text-slate-500">
        {t("DIR_FORMULA_FOOTER", "Formula indice = Σreal_alloc / Σprevisto_alloc (solo unit=MT, rapportini APPROVED_UFFICIO).")}
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