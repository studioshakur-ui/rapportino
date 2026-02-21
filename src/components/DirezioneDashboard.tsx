// src/components/DirezioneDashboard.tsx
import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useCoreI18n } from "../i18n/coreI18n";
import { formatNumberByLang } from "../ui/format";
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

export type DirezioneDashboardProps = {
  isDark?: boolean;
  kpiModel?: unknown;
  verdictModel?: unknown;
  costr?: string;
  commessa?: string;
  windowFrom?: string;
  windowTo?: string;
  onResetFilters?: () => void;
  onChangeCostr?: (v: string) => void;
  onChangeCommessa?: (v: string) => void;
  onChangeWindowFrom?: (v: string) => void;
  onChangeWindowTo?: (v: string) => void;
  headerRight?: unknown;
};

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
  const topProduzioni = useMemo(() => selectTopProduzioni(dataset.produzioniAggCurrent || [], 10), [dataset]);

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
