// src/components/DirezioneDashboard.tsx
import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import DashboardDirezionePage from "../direzione/DashboardDirezionePage";
import { useDirezioneDashboardData } from "../features/direzione/dashboard/useDirezioneDashboardData";
import type { DirezioneFilters } from "../features/direzione/dashboard/types";
import { selectKpiSummary, selectProdTrend } from "../features/direzione/dashboard/selectors";
import { toISODate, toNumber } from "../features/direzione/dashboard/utils";

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

export default function DirezioneDashboard({ isDark = true }: DirezioneDashboardProps) {
  const { profile } = useAuth();

  const [filters, setFilters] = useState<DirezioneFilters>(() => {
    const { dateFrom, dateTo } = getDefaultWindow();
    return { dateFrom, dateTo, costr: "", commessa: "" };
  });

  const { loading, dataset } = useDirezioneDashboardData({
    profilePresent: !!profile,
    filters,
  });

  const summary = useMemo(() => selectKpiSummary(dataset), [dataset]);
  const trendPoints = useMemo(() => selectProdTrend(dataset), [dataset]);

  const trend = useMemo(() => {
    const x = trendPoints.map((p) => p.label || p.report_date);
    const y = trendPoints.map((p) => p.indice);
    const numeric = y.filter((v) => typeof v === "number" && Number.isFinite(v)) as number[];
    const min = numeric.length ? Math.min(...numeric) : undefined;
    const max = numeric.length ? Math.max(...numeric) : undefined;
    return { x, y, min, max };
  }, [trendPoints]);

  const inca = useMemo(() => {
    const rows = dataset.incaChantier || [];
    const labels = rows.map((r) => r.commessa || r.costr || r.nome_file || "—");
    const previsti = rows.map((r) => toNumber(r.metri_ref_totali ?? r.metri_previsti_totali));
    const realizzati = rows.map((r) => toNumber(r.metri_dis_totali ?? r.metri_realizzati));
    const posati = rows.map((r) => toNumber(r.metri_posati_ref ?? r.metri_posati));
    return { labels, previsti, realizzati, posati };
  }, [dataset.incaChantier]);

  const windowLabel = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo) return "—";
    return `${filters.dateFrom} → ${filters.dateTo}`;
  }, [filters.dateFrom, filters.dateTo]);

  const kpiModel = useMemo(
    () => ({
      rapportini: summary.currCount,
      rapportini_prev: summary.prevCount,
      righe_attivita: summary.currRighe,
      righe_attivita_vs_prev: summary.prevRighe,
      indice_prod: summary.productivityIndexNow,
      inca_prev: summary.incaBaselineRef,
      inca_real: summary.incaDisAudit,
      ritardi_capi: summary.totalAttesi > 0 ? `${summary.totalRitardo}/${summary.totalAttesi}` : "—",
      trend,
      inca,
      windowLabel,
      loading,
    }),
    [summary, trend, inca, windowLabel, loading]
  );

  const handleReset = () => {
    const { dateFrom, dateTo } = getDefaultWindow();
    setFilters({ dateFrom, dateTo, costr: "", commessa: "" });
  };

  return (
    <DashboardDirezionePage
      isDark={isDark}
      kpiModel={kpiModel}
      onResetFilters={handleReset}
      headerRight={null}
    />
  );
}
