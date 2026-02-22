// src/components/charts/DirezioneChartsSection.jsx
import { useMemo } from "react";
import type { EChartsOption } from "echarts";
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

  const cardBase = "theme-panel rounded-3xl px-4 py-3";

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
        axisLabel: { color: "var(--textMuted)" },
        axisLine: { lineStyle: { color: "var(--border)" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "var(--textMuted)" },
        splitLine: { lineStyle: { color: "var(--border)" } },
        axisLine: { lineStyle: { color: "var(--border)" } },
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
        textStyle: { color: "var(--textMuted)" },
      },
      xAxis: {
        type: "category" as const,
        data: labels,
        axisLabel: { color: "var(--textMuted)", rotate: 22 },
        axisLine: { lineStyle: { color: "var(--border)" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "var(--textMuted)" },
        splitLine: { lineStyle: { color: "var(--border)" } },
        axisLine: { lineStyle: { color: "var(--border)" } },
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
        axisLabel: { color: "var(--textMuted)" },
        axisLine: { lineStyle: { color: "var(--border)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "var(--textMuted)" },
        splitLine: { lineStyle: { color: "var(--border)" } },
        axisLine: { lineStyle: { color: "var(--border)" } },
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
      <div className="text-[11px] uppercase tracking-[0.18em] mb-2 theme-text-muted">
        {t("CHARTS_TITLE")}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                {t("CHART_TREND_TITLE")}
              </div>
              <div className="text-xs mt-1 theme-text-muted">{t("CHART_TREND_SUB")}</div>
            </div>
          </div>

          <div className="mt-3">
            <EChart option={trendOpt} style={{ height: 260, width: "100%" }} />
          </div>
        </div>

        <div className={cardBase}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                {t("CHART_INCA_TITLE")}
              </div>
              <div className="text-xs mt-1 theme-text-muted">{t("CHART_INCA_SUB")}</div>
            </div>
          </div>

          <div className="mt-3">
            <EChart option={incaOpt} style={{ height: 260, width: "100%" }} />
          </div>
        </div>
      </div>

      {showEChartsPreview ? (
        <div className="mt-3 theme-panel rounded-3xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
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
