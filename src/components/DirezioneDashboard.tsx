// src/components/DirezioneDashboard.tsx
import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useCoreI18n } from "../i18n/coreI18n";
import { formatNumberByLang, formatNumberIT, safeText } from "../ui/format";
import DirezioneHeader from "../features/direzione/dashboard/components/DirezioneHeader";
import DirezioneFilters from "../features/direzione/dashboard/components/DirezioneFilters";
import DirezioneVerdict, {
  type DirezioneVerdictModel,
  type DirezioneVerdictTone,
} from "../features/direzione/dashboard/components/DirezioneVerdict";
import DirezioneKpiStrip from "../features/direzione/dashboard/components/DirezioneKpiStrip";
import DirezioneCharts from "../features/direzione/dashboard/components/DirezioneCharts";
import DirezioneKpiModal from "../features/direzione/dashboard/components/DirezioneKpiModal";
import { useDirezioneDashboardData } from "../features/direzione/dashboard/useDirezioneDashboardData";
import type { DirezioneFilters as DirezioneFiltersState } from "../features/direzione/dashboard/types";
import { KPI_IDS, type KpiId } from "../features/direzione/dashboard/kpiRegistry";
import { buildIncaOption } from "../features/direzione/dashboard/charts";
import {
  selectKpiSummary,
  selectProdTrend,
  selectTimeline,
  selectTopProduzioni,
} from "../features/direzione/dashboard/selectors";
import { toISODate } from "../features/direzione/dashboard/utils";
import { useOperatorProductivityData } from "../features/kpi/components/operatorProd/hooks/useOperatorProductivityData";
import CoreEChart from "../components/charts/CoreEChart";
import { coreLayout } from "../ui/coreLayout";
import type { DirezioneAiFilters, DirezioneAiProjectionPoint } from "../features/direzione/dashboard/aiTypes";
import { useDirezioneAiDashboardData } from "../features/direzione/dashboard/useDirezioneAiDashboardData";

export type DirezioneDashboardProps = {
  isDark?: boolean;
};

const STABILITY_FORMULA = "Score = 100 - 5*C - 3*M - 2*B - 1*A - 1*MM";

function getDefaultWindow(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const to = toISODate(today);
  const fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  fromDate.setDate(fromDate.getDate() - 6);
  const from = toISODate(fromDate);
  return { dateFrom: from, dateTo: to };
}

function formatDelta(lang: string | null | undefined, v: number, maxFrac: number = 2): string {
  const n = Number.isFinite(v) ? v : 0;
  const s = formatNumberByLang(lang, Math.abs(n), maxFrac);
  return n > 0 ? `+${s}` : n < 0 ? `-${s}` : s;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * w;
}

function toScopeLabel(filters: DirezioneAiFilters): string {
  const costr = filters.costr.trim();
  const commessa = filters.commessa.trim();
  if (costr && commessa) return `COSTR ${costr} · Commessa ${commessa}`;
  if (costr) return `COSTR ${costr}`;
  return "Globale";
}

function buildRadarOption(values: number[], labels: string[], isDark: boolean): Record<string, unknown> {
  const maxValue = Math.max(1, ...values);
  return {
    radar: {
      radius: "62%",
      splitNumber: 4,
      indicator: labels.map((name) => ({ name, max: maxValue })),
      axisName: {
        color: isDark ? "#e2e8f0" : "#1f2937",
        fontSize: 11,
      },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            areaStyle: { opacity: 0.2 },
            lineStyle: { width: 2 },
          },
        ],
      },
    ],
  };
}

function buildProjectionOption(points: DirezioneAiProjectionPoint[]): Record<string, unknown> {
  const labels = points.map((p) => p.forecast_date);
  const values = points.map((p) => p.forecast_risk_index ?? 0);
  return {
    grid: { left: 6, right: 6, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { opacity: 0.15 } },
    },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        areaStyle: { opacity: 0.18 },
      },
    ],
  };
}

export default function DirezioneDashboard({ isDark = true }: DirezioneDashboardProps) {
  const { profile } = useAuth();
  const { t, lang } = useCoreI18n();

  const tf = (key: string, fallback?: string) => {
    const v = t(key);
    if (typeof v === "string" && v.trim() && v !== key) return v;
    if (fallback != null) return fallback;
    return typeof v === "string" ? v : key;
  };

  const [filters, setFilters] = useState<DirezioneFiltersState>(() => {
    const { dateFrom, dateTo } = getDefaultWindow();
    return { dateFrom, dateTo, costr: "", commessa: "" };
  });
  const [showAi, setShowAi] = useState<boolean>(false);

  const { loading, dataset } = useDirezioneDashboardData({
    profilePresent: !!profile,
    filters,
  });

  const operatorData = useOperatorProductivityData({
    profileId: profile?.id,
    scope: "Direzione",
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    showCostrCommessaFilters: true,
    costrFilter: filters.costr || null,
    commessaFilter: filters.commessa || null,
    selectedIds: null,
    search: "",
  });

  const summary = useMemo(() => selectKpiSummary(dataset), [dataset]);
  const timelineData = useMemo(() => selectTimeline(dataset), [dataset]);
  const prodTrend = useMemo(() => selectProdTrend(dataset), [dataset]);
  const topProduzioni = useMemo(
    () => selectTopProduzioni(dataset.produzioniAggCurrent || [], 10),
    [dataset]
  );

  const incaOption = useMemo(() => buildIncaOption(dataset.incaChantier || []), [dataset.incaChantier]);
  const hasIncaData = (dataset.incaChantier || []).length > 0;

  const [activeKpi, setActiveKpi] = useState<KpiId>(null);
  const openKpi = (id: KpiId) => setActiveKpi(id);
  const closeKpi = () => setActiveKpi(null);

  const incaCoverage = useMemo(() => {
    if (!summary.incaBaselineRef || summary.incaBaselineRef <= 0) return null;
    return summary.incaDisAudit / summary.incaBaselineRef;
  }, [summary.incaBaselineRef, summary.incaDisAudit]);

  const operatorStats = useMemo(() => {
    const perOperator = operatorData.perOperator || [];
    const total = perOperator.length;
    const indices = perOperator
      .map((r) => r.productivity_index_range)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      .sort((a, b) => a - b);
    const included = indices.length;
    const mean = included > 0 ? indices.reduce((a, b) => a + b, 0) / included : null;
    const median = percentile(indices, 0.5);
    const p10 = percentile(indices, 0.1);
    const p90 = percentile(indices, 0.9);
    return { total, included, mean, median, p10, p90 };
  }, [operatorData.perOperator]);

  const verdictModel = useMemo<DirezioneVerdictModel>(() => {
    const missing: string[] = [];
    if (operatorStats.mean == null) missing.push("prodIndex");
    if (!summary.incaBaselineRef || summary.incaBaselineRef <= 0 || summary.incaDisAudit <= 0) missing.push("inca");
    if (!summary.totalAttesi || summary.totalAttesi <= 0) missing.push("ritardi");

    const reliability =
      missing.length === 0 ? "HIGH" : missing.length === 1 ? "MEDIUM" : "LOW";

    if (loading) {
      return {
        tone: "WARN",
        score: operatorStats.mean,
        scoreFormatted: operatorStats.mean == null ? "—" : formatNumberByLang(lang, operatorStats.mean, 2),
        indiceProd: operatorStats.mean,
        incaCoverage,
        ritardiCapi: summary.totalRitardo,
        reliability,
        missingMetrics: missing,
        scoreFormula: tf(
          "DIR_SCORE_FORMULA",
          "Score = media degli indici produttività per operatore (solo indici calcolabili)."
        ),
        scoreInclusion: tf(
          "DIR_SCORE_INCLUSION",
          "Inclusione: operatori con indice calcolabile; esclusi quelli senza previsto/realizzato."
        ),
        scoreStats: tf("DIR_SCORE_STATS", "Operatori inclusi: {i}/{t} · Mediana: {m} · Dispersione P10–P90: {p10}–{p90}")
          .replace("{i}", String(operatorStats.included))
          .replace("{t}", String(operatorStats.total))
          .replace(
            "{m}",
            operatorStats.median == null ? "—" : formatNumberByLang(lang, operatorStats.median, 2)
          )
          .replace(
            "{p10}",
            operatorStats.p10 == null ? "—" : formatNumberByLang(lang, operatorStats.p10, 2)
          )
          .replace(
            "{p90}",
            operatorStats.p90 == null ? "—" : formatNumberByLang(lang, operatorStats.p90, 2)
          ),
      };
    }

    const score = operatorStats.mean;
    const scoreFormatted = score == null ? "—" : formatNumberByLang(lang, score, 2);
    const delayRatio =
      summary.totalAttesi > 0 ? summary.totalRitardo / summary.totalAttesi : null;
    const tone: DirezioneVerdictTone =
      score != null && score < 0.7
        ? "BLOCK"
        : (delayRatio != null && delayRatio >= 0.35) || (incaCoverage != null && incaCoverage < 0.6)
        ? "BLOCK"
        : score != null && score < 0.9
        ? "WARN"
        : (delayRatio != null && delayRatio >= 0.15) || (incaCoverage != null && incaCoverage < 0.8)
        ? "WARN"
        : "OK";

    const prodTarget = 1;
    const prodIndex = operatorStats.mean;
    const prodDelta = prodIndex == null ? null : prodIndex - prodTarget;
    const prodIndexFmt = prodIndex == null ? "—" : formatNumberByLang(lang, prodIndex, 2);
    const prodDeltaFmt = prodDelta == null ? "—" : formatDelta(lang, prodDelta, 2);

    const incaBaseFmt = formatNumberByLang(lang, summary.incaBaselineRef, 0);
    const incaRealFmt = formatNumberByLang(lang, summary.incaDisAudit, 0);
    const incaCovFmt =
      incaCoverage == null ? "—" : `${formatNumberByLang(lang, incaCoverage * 100, 0)}%`;

    const ritardiFmt =
      summary.totalAttesi > 0
        ? `${summary.totalRitardo}/${summary.totalAttesi}`
        : tf("DIR_RITARDI_NA", "Non disponibile");

    const reasons = [
      tf("DIR_REASON_PROD_FMT", "Indice prod: {v} (target {t}, Δ {d})")
        .replace("{v}", prodIndexFmt)
        .replace("{t}", formatNumberByLang(lang, prodTarget, 2))
        .replace("{d}", prodDeltaFmt),
      tf("DIR_REASON_INCA_FMT", "INCA coverage: {p} · {r} / {b} m")
        .replace("{p}", incaCovFmt)
        .replace("{r}", incaRealFmt)
        .replace("{b}", incaBaseFmt),
      tf("DIR_REASON_RITARDI_FMT", "Ritardi capi: {v} · deadline 08:30 (J+1)")
        .replace("{v}", ritardiFmt),
    ];

    const insights: string[] = [];
    if (prodIndex == null) {
      insights.push(tf("DIR_INSIGHT_PROD_NA", "Indice prod non disponibile: verifica i dati di base."));
    } else if (prodIndex < prodTarget) {
      insights.push(tf("DIR_INSIGHT_PROD_LOW", "Indice prod sotto target: analizzare scostamenti per squadra/commessa."));
    } else {
      insights.push(tf("DIR_INSIGHT_PROD_OK", "Indice prod in linea: preservare ritmo e fattori di stabilità."));
    }

    if (incaCoverage == null) {
      insights.push(tf("DIR_INSIGHT_INCA_NA", "INCA non disponibile: verificare import e filtri COSTR/Commessa."));
    } else if (incaCoverage < 0.85) {
      insights.push(tf("DIR_INSIGHT_INCA_LOW", "Coverage INCA basso: completare baseline o audit dis."));
    } else {
      insights.push(tf("DIR_INSIGHT_INCA_OK", "Coverage INCA stabile: monitorare variazioni di baseline."));
    }

    if (summary.totalAttesi > 0 && summary.totalRitardo > 0) {
      insights.push(tf("DIR_INSIGHT_RITARDI", "Ritardi presenti: rivedere planning DAY FROZEN e deadline 08:30."));
    } else if (summary.totalAttesi > 0) {
      insights.push(tf("DIR_INSIGHT_RITARDI_OK", "Ritardi sotto controllo: mantenere disciplina di consegna."));
    }

    return {
      tone,
      score,
      scoreFormatted,
      indiceProd: prodIndex,
      incaCoverage,
      ritardiCapi: summary.totalRitardo,
      reliability,
      missingMetrics: missing,
      reasons,
      insights,
      scoreFormula: tf(
        "DIR_SCORE_FORMULA",
        "Score = media degli indici produttività per operatore (solo indici calcolabili)."
      ),
      scoreInclusion: tf(
        "DIR_SCORE_INCLUSION",
        "Inclusione: operatori con indice calcolabile; esclusi quelli senza previsto/realizzato."
      ),
      scoreStats: tf("DIR_SCORE_STATS", "Operatori inclusi: {i}/{t} · Mediana: {m} · Dispersione P10–P90: {p10}–{p90}")
        .replace("{i}", String(operatorStats.included))
        .replace("{t}", String(operatorStats.total))
        .replace(
          "{m}",
          operatorStats.median == null ? "—" : formatNumberByLang(lang, operatorStats.median, 2)
        )
        .replace(
          "{p10}",
          operatorStats.p10 == null ? "—" : formatNumberByLang(lang, operatorStats.p10, 2)
        )
        .replace(
          "{p90}",
          operatorStats.p90 == null ? "—" : formatNumberByLang(lang, operatorStats.p90, 2)
        ),
    };
  }, [
    loading,
    lang,
    operatorStats.mean,
    operatorStats.included,
    operatorStats.total,
    operatorStats.median,
    operatorStats.p10,
    operatorStats.p90,
    summary.incaBaselineRef,
    summary.incaDisAudit,
    summary.totalAttesi,
    summary.totalRitardo,
    incaCoverage,
  ]);

  const filterLabels = useMemo(
    () => ({
      window: tf("DIR_WINDOW", "Finestra"),
      costr: tf("DIR_COSTR", "COSTR"),
      commessa: tf("DIR_COMMESSA", "Commessa"),
      reset: tf("DIR_RESET_FILTERS", "Reset filtri"),
    }),
    [tf]
  );

  const kpiLabels = useMemo(
    () => ({
      rapportini: tf("KPI_RAPPORTINI", "Rapportini"),
      righe: tf("KPI_RIGHE_ATTIVITA", "Righe attività"),
      prod: tf("KPI_INDICE_PROD", "Indice prod."),
      incaPrev: tf("KPI_INCA_PREV", "INCA prev"),
      incaReal: tf("KPI_INCA_REAL", "INCA real"),
      ore: tf("KPI_ORE_LAVORO", "Ore lavoro"),
      ritardi: tf("KPI_RITARDI_CAPI", "Ritardi capi"),
      prev: tf("KPI_PREV", "Prev"),
      delta: tf("KPI_DELTA", "Δ"),
      hoursUnit: tf("KPI_HOURS_UNIT", "h"),
      vsPrev: tf("KPI_VS_PREV", "vs prev"),
      metri: tf("KPI_METRI", "metri"),
      deadline: tf("KPI_DEADLINE", "deadline 08:30 (J+1)"),
      prodFormulaSub: tf("DIR_PROD_FORMULA", "Σrealizzato / Σprevisto_alloc (MT)"),
    }),
    [tf]
  );

  const aiFilters: DirezioneAiFilters = useMemo(
    () => ({ costr: filters.costr, commessa: filters.commessa }),
    [filters.costr, filters.commessa]
  );

  const {
    loading: aiLoading,
    error: aiError,
    radar,
    stability,
    projection,
    anomalies,
    anomaliesTotal,
    topPerformance,
    bottomPerformance,
  } = useDirezioneAiDashboardData({
    profilePresent: !!profile,
    filters: aiFilters,
  });

  const scopeLabel = useMemo(() => toScopeLabel(aiFilters), [aiFilters]);

  const radarValues = useMemo(() => {
    return [
      radar?.alerts_open_critical ?? 0,
      radar?.alerts_open_major ?? 0,
      radar?.blocks_open ?? 0,
      radar?.anomalies_open ?? 0,
      radar?.alerts_open_metri_mismatch ?? 0,
    ].map((v) => Number(v) || 0);
  }, [radar]);

  const radarLabels = ["Critici", "Major", "Blocchi", "Anomalie", "Metri"];

  const radarOption = useMemo(() => buildRadarOption(radarValues, radarLabels, isDark), [radarValues, isDark]);

  const projectionOption = useMemo(() => buildProjectionOption(projection), [projection]);

  const score = stability?.stability_score ?? null;
  const scoreLabel = score == null ? "—" : formatNumberIT(score, 0);

  const anomaliesTotalLabel =
    anomaliesTotal?.open_count != null ? formatNumberIT(anomaliesTotal.open_count, 0) : "—";

  const riskIndexNow = radarValues.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <DirezioneHeader
        kicker={tf("DIR_KICKER", "Direzione · CNCS / CORE")}
        title={tf("DIR_DASH_TITLE", "Dashboard Direzione")}
        readOnlyLabel={tf("DIR_READONLY", "SOLO LETTURA")}
      />

      <DirezioneFilters
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters({ ...getDefaultWindow(), costr: "", commessa: "" })}
        labels={filterLabels}
      />

      <DirezioneVerdict isDark={isDark} model={verdictModel} t={tf} />

      <DirezioneKpiStrip
        loading={loading}
        summary={summary}
        onOpenKpi={openKpi}
        labels={kpiLabels}
        lang={lang || "it"}
      />

      <DirezioneCharts
        isDark={isDark}
        lang={lang || "it"}
        loading={loading}
        t={tf}
        timelineData={timelineData}
        incaOption={incaOption}
        hasIncaData={hasIncaData}
        prodTrend={prodTrend}
        topProduzioni={topProduzioni}
      />

      <section className="space-y-3 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.22em] theme-text-muted">Direzione AI</div>
          <button
            type="button"
            onClick={() => setShowAi((prev) => !prev)}
            className="btn-instrument px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          >
            {showAi ? "Nascondi" : "Mostra"}
          </button>
        </div>

        {showAi ? (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3">
          <div className="theme-panel theme-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Radar Giornaliero</div>
              <div className="text-xs theme-text-muted">{scopeLabel}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 mt-3">
              <CoreEChart
                isDark={isDark}
                option={radarOption}
                height={220}
                loading={aiLoading}
                empty={!aiLoading && !radar}
                emptyLabel="Nessun dato"
              />
              <div className="grid grid-cols-2 gap-2">
                {radarLabels.map((label, idx) => (
                  <div key={label} className="theme-panel-2 theme-border rounded-xl px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{label}</div>
                    <div className="text-lg font-semibold theme-text">{formatNumberIT(radarValues[idx], 0)}</div>
                  </div>
                ))}
                <div className="theme-panel-2 theme-border rounded-xl px-3 py-2 col-span-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">Indice Rischio Oggi</div>
                  <div className="text-xl font-semibold theme-text">{formatNumberIT(riskIndexNow, 0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-rows-2 gap-3">
            <div className={coreLayout.kpiCard(isDark, "amber")}>
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">CNCS Stability Score</div>
              <div className="text-3xl font-semibold">{scoreLabel}</div>
              <div className="text-[11px] theme-text-muted">{STABILITY_FORMULA}</div>
            </div>

            <div className={coreLayout.kpiCard(isDark, "rose")}>
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Anomalie Strutturali</div>
              <div className="text-3xl font-semibold">{anomaliesTotalLabel}</div>
              <div className="text-[11px] theme-text-muted">Open</div>
            </div>
          </div>
        </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3">
          <div className="theme-panel theme-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Proiezione 7 Giorni</div>
              <div className="text-xs theme-text-muted">Trend lineare</div>
            </div>
            <div className="mt-3">
              <CoreEChart
                isDark={isDark}
                option={projectionOption}
                height={260}
                loading={aiLoading}
                empty={!aiLoading && projection.length === 0}
                emptyLabel="Nessun dato"
              />
            </div>
          </div>

          <div className="theme-panel theme-border rounded-2xl p-4">
            <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Ranking Performance</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">Top</div>
                <div className="mt-2 space-y-2">
                  {topPerformance.length === 0 ? (
                    <div className="text-sm theme-text-muted">Nessun dato</div>
                  ) : (
                    topPerformance.map((row, idx) => (
                      <div
                        key={row.ship_id ?? row.ship_code ?? row.ship_name ?? `top-${idx}`}
                        className="flex items-center justify-between"
                      >
                        <div className="text-sm theme-text">{safeText(row.ship_name || row.ship_code || row.ship_id)}</div>
                        <div className="text-sm font-semibold">{formatNumberIT(row.performance_ratio, 2)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">Bottom</div>
                <div className="mt-2 space-y-2">
                  {bottomPerformance.length === 0 ? (
                    <div className="text-sm theme-text-muted">Nessun dato</div>
                  ) : (
                    bottomPerformance.map((row, idx) => (
                      <div
                        key={row.ship_id ?? row.ship_code ?? row.ship_name ?? `bottom-${idx}`}
                        className="flex items-center justify-between"
                      >
                        <div className="text-sm theme-text">{safeText(row.ship_name || row.ship_code || row.ship_id)}</div>
                        <div className="text-sm font-semibold">{formatNumberIT(row.performance_ratio, 2)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

            <section className="theme-panel theme-border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] theme-text-muted">Anomalie Strutturali</div>
            <div className="text-xs theme-text-muted">Breakdown</div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {anomalies.length === 0 ? (
              <div className="text-sm theme-text-muted">Nessun dato</div>
            ) : (
              anomalies.map((row) => (
                <div key={row.anomaly_type} className="theme-panel-2 theme-border rounded-xl px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">
                    {row.anomaly_type.replace("NAV_", "")}
                  </div>
                  <div className="text-lg font-semibold theme-text">{formatNumberIT(row.open_count, 0)}</div>
                </div>
              ))
            )}
          </div>
          {aiError ? <div className="text-xs text-rose-300 mt-2">{aiError}</div> : null}
            </section>
          </>
        ) : null}
      </section>

      <DirezioneKpiModal
        isOpen={!!activeKpi}
        activeKpi={activeKpi || KPI_IDS.RAPPORTINI}
        onClose={closeKpi}
        filters={filters}
        dataset={dataset}
        t={tf}
      />
    </div>
  );
}
