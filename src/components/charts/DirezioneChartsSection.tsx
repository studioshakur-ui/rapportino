// src/components/charts/DirezioneChartsSection.jsx
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { cn } from "../../ui/cn";
import { useCoreI18n } from "../../i18n/coreI18n";
import EChart from "./EChart";
import ECharts from "./ECharts";

/**
 * SECTION A (Tesla-X):
 * Les graphes reviennent SOUS les KPI.
 * - 2 cartes max
 * - lisibles
 * - contraste renforcé (“allumer les lampes”)
 */
type TrendData = { x?: unknown[]; y?: unknown[]; min?: unknown; max?: unknown } | null;
type IncaData = { labels?: unknown[]; previsti?: unknown[]; realizzati?: unknown[]; posati?: unknown[] } | null;

export default function DirezioneChartsSection({
  isDark = true,
  trend = null, // { x: [date], y: [number], min?:, max?: }
  inca = null, // { labels:[], previsti:[], realizzati:[], posati:[] }
}: {
  isDark?: boolean;
  trend?: TrendData;
  inca?: IncaData;
}) {
  const { t } = useCoreI18n();

  const cardBase = cn(
    "rounded-3xl border px-4 py-3",
    isDark ? "border-slate-800/70 bg-slate-950/55" : "border-slate-200 bg-white"
  );

  const trendOpt = useMemo<EChartsOption>(() => {
    const x = (trend?.x || []) as any[];
    const y = (trend?.y || []) as any[];

    return {
      backgroundColor: "transparent",
      grid: { left: 50, right: 18, top: 22, bottom: 36 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category" as const,
        data: x,
        axisLabel: { color: "rgba(226,232,240,0.75)" },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "rgba(226,232,240,0.75)" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      series: [
        {
          name: "Indice",
          type: "line" as const,
          data: y,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3 },
          emphasis: { focus: "series" },
        },
      ],
    };
  }, [trend]);

  const incaOpt = useMemo<EChartsOption>(() => {
    const labels = (inca?.labels || []) as any[];
    const previsti = (inca?.previsti || []) as any[];
    const realizzati = (inca?.realizzati || []) as any[];
    const posati = (inca?.posati || []) as any[];

    return {
      backgroundColor: "transparent",
      grid: { left: 52, right: 18, top: 22, bottom: 56 },
      tooltip: { trigger: "axis" },
      legend: {
        top: 0,
        textStyle: { color: "rgba(226,232,240,0.78)" },
      },
      xAxis: {
        type: "category" as const,
        data: labels,
        axisLabel: { color: "rgba(226,232,240,0.75)", rotate: 22 },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "rgba(226,232,240,0.75)" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      series: [
        { name: "Previsti", type: "bar" as const, data: previsti, barMaxWidth: 38 },
        { name: "Realizzati", type: "bar" as const, data: realizzati, barMaxWidth: 38 },
        {
          name: "Posati",
          type: "line" as const,
          data: posati,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3 },
        },
      ],
    };
  }, [inca]);

  const showEChartsPreview = false;
  const previewOpt = useMemo(
    (): EChartsOption => ({
      backgroundColor: "transparent",
      grid: { left: 40, right: 16, top: 18, bottom: 28 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: ["Q1", "Q2", "Q3", "Q4"],
        axisLabel: { color: "rgba(226,232,240,0.75)" },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "rgba(226,232,240,0.75)" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.18)" } },
        axisLine: { lineStyle: { color: "rgba(148,163,184,0.25)" } },
      },
      series: [
        {
          name: "Preview",
          type: "line",
          data: [12, 18, 14, 22],
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2 },
        },
      ],
    }),
    []
  );

  return (
    <section className="px-3 sm:px-4 mt-3">
      <div className={cn("text-[11px] uppercase tracking-[0.18em] mb-2", isDark ? "text-slate-500" : "text-slate-600")}>
        {t("CHARTS_TITLE")}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
                {t("CHART_TREND_TITLE")}
              </div>
              <div className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-600")}>{t("CHART_TREND_SUB")}</div>
            </div>
          </div>

          <div className="mt-3">
            <EChart option={trendOpt} style={{ height: 260, width: "100%" }} />
          </div>
        </div>

        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
                {t("CHART_INCA_TITLE")}
              </div>
              <div className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-600")}>{t("CHART_INCA_SUB")}</div>
            </div>
          </div>

          <div className="mt-3">
            <EChart option={incaOpt} style={{ height: 260, width: "100%" }} />
          </div>
        </div>
      </div>

      {showEChartsPreview ? (
        <div className={cn("mt-3 rounded-3xl border px-4 py-3", isDark ? "border-slate-800/70 bg-slate-950/55" : "border-slate-200 bg-white")}>
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
            ECharts Preview
          </div>
          <div className="mt-3">
            <ECharts option={previewOpt} style={{ height: 220, width: "100%" }} isDark={isDark} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
