// src/features/kpi/components/MegaKpiCapoStesuraPanel.tsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "../../../lib/supabaseClient";

import CoreEChart from "./charts/CoreEChart";
import { CORE_CHART_THEME, coreTooltipStyle, formatCompactNumber } from "./charts/coreChartTheme";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safePct(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

type DailyRow = {
  date?: string;
  stesura_m?: number | string | null;
  ripresa_m?: number | string | null;
  fascettatura_m?: number | string | null;
  stesura_giorno_m?: number | string | null;
  stesura_cum_m?: number | string | null;
  target_cum_m?: number | string | null;
  delta_m?: number | string | null;
};

type EventRow = {
  date?: string;
  label?: string;
};

type ProjectionRow = {
  date?: string;
  stesura_cum_proj_m?: number | string | null;
};

type CapoMegaKpiStesuraV1 = {
  meta?: {
    scope?: {
      offset_m?: number | string | null;
    };
  };
  headline?: {
    today?: {
      stesura_giorno_m?: number | string | null;
      fascettatura_m?: number | string | null;
    };
    cumulative?: {
      stesura_cum_m?: number | string | null;
      progress_pct?: number | string | null;
    };
  };
  series?: {
    daily?: DailyRow[];
    events?: EventRow[];
    projection_7d?: ProjectionRow[];
  };
};

type BuildOptionInput = {
  data: CapoMegaKpiStesuraV1 | null | undefined;
  isDark: boolean;
};

function buildOption({ data, isDark }: BuildOptionInput): Record<string, unknown> {
  void isDark; // theme currently fixed by CORE_CHART_THEME
  const theme = CORE_CHART_THEME;

  const daily: DailyRow[] = Array.isArray(data?.series?.daily) ? (data?.series?.daily as DailyRow[]) : [];
  const events: EventRow[] = Array.isArray(data?.series?.events) ? (data?.series?.events as EventRow[]) : [];
  const projection: ProjectionRow[] = Array.isArray(data?.series?.projection_7d)
    ? (data?.series?.projection_7d as ProjectionRow[])
    : [];

  const x = daily.map((r) => String(r.date ?? ""));
  const y = daily.map((r) => safeNum(r.stesura_cum_m));

  const yProj = projection.map((r) => safeNum(r.stesura_cum_proj_m));
  const xProj = projection.map((r) => String(r.date ?? ""));

  const lastY = y.length ? y[y.length - 1] : null;

  const milestoneLines = (events || [])
    .filter((e) => Boolean(e?.date))
    .map((e) => ({
      xAxis: String(e.date),
      label: {
        formatter: e.label || "Evento",
        color: theme.text,
        fontSize: 11,
        padding: [3, 6, 3, 6],
        backgroundColor: "rgba(2,6,23,0.90)",
        borderColor: theme.axisLine,
        borderWidth: 1,
        borderRadius: 10,
      },
      lineStyle: { type: "dashed", width: 1, opacity: 0.8 },
    }));

  const tooltip = {
    trigger: "axis",
    axisPointer: { type: "line" },
    confine: true,
    backgroundColor: coreTooltipStyle(theme).backgroundColor,
    borderColor: coreTooltipStyle(theme).border,
    borderWidth: 1,
    extraCssText: [
      "border-radius: 12px",
      "box-shadow: 0 12px 32px rgba(0,0,0,0.35)",
      "padding: 10px 12px",
      "color: #e5e7eb",
      "font-size: 12px",
    ].join(";"),
    formatter: (params: Array<{ dataIndex?: number }> | { dataIndex?: number }) => {
      const p0 = Array.isArray(params) ? params[0] : params;
      if (!p0) return "";

      const idx = p0.dataIndex ?? 0;
      const row: DailyRow = daily[idx] || {};

      const stesura = safeNum(row.stesura_m);
      const ripresa = safeNum(row.ripresa_m);
      const fasc = row.fascettatura_m == null ? null : safeNum(row.fascettatura_m);
      const day = safeNum(row.stesura_giorno_m);
      const cum = safeNum(row.stesura_cum_m);

      const target = row.target_cum_m == null ? null : safeNum(row.target_cum_m);
      const delta = row.delta_m == null ? null : safeNum(row.delta_m);

      const s: string[] = [];
      s.push(`<div style="font-weight:700;margin-bottom:6px">${row.date || ""}</div>`);
      s.push(`<div><span style="color:#94a3b8">Cumul posa</span>: <b>${formatCompactNumber(cum)}</b> m</div>`);

      if (target != null && delta != null) {
        const deltaLabel = delta >= 0 ? `+${formatCompactNumber(delta)}` : `${formatCompactNumber(delta)}`;
        s.push(
          `<div style="margin-top:4px"><span style="color:#94a3b8">Target</span>: <b>${formatCompactNumber(
            target
          )}</b> m · <span style="color:#94a3b8">Δ</span>: <b>${deltaLabel}</b> m</div>`
        );
      }

      s.push(
        `<div style="margin-top:8px"><span style="color:#94a3b8">Stesura</span>: <b>${formatCompactNumber(
          stesura
        )}</b> m</div>`
      );
      s.push(`<div><span style="color:#94a3b8">Ripresa</span>: <b>${formatCompactNumber(ripresa)}</b> m</div>`);
      s.push(
        `<div><span style="color:#94a3b8">Totale posa (oggi)</span>: <b>${formatCompactNumber(day)}</b> m</div>`
      );

      if (fasc != null) {
        s.push(
          `<div style="margin-top:6px"><span style="color:#94a3b8">Fascettatura</span>: <b>${formatCompactNumber(
            fasc
          )}</b> m <span style="color:#64748b">(non inclusa)</span></div>`
        );
      }

      return s.join("");
    },
  };

  const option: any = {
    backgroundColor: "transparent",
    animation: true,
    animationDuration: 1100,
    animationEasing: "cubicOut",
    grid: { left: 10, right: 10, top: 18, bottom: 34, containLabel: true },
    tooltip,
    xAxis: {
      type: "category",
      data: x,
      boundaryGap: false,
      axisLabel: { color: theme.subtext, fontSize: 11 },
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: theme.subtext, fontSize: 11 },
      splitLine: { lineStyle: { color: theme.gridLine } },
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 18,
        bottom: 8,
        borderColor: "transparent",
        backgroundColor: "rgba(15,23,42,0.35)",
        fillerColor: "rgba(16,185,129,0.18)",
        handleStyle: { color: "rgba(16,185,129,0.45)", borderColor: "rgba(16,185,129,0.65)" },
        textStyle: { color: theme.subtext },
      },
    ],
    series: [
      {
        name: "Cumul posa",
        type: "line",
        data: y,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.12 },
        emphasis: { focus: "series" },
        markLine: milestoneLines.length
          ? {
              symbol: ["none", "none"],
              precision: 0,
              data: milestoneLines,
            }
          : undefined,
      },
      ...(xProj.length
        ? [
            {
              name: "Proiezione 7g",
              type: "line",
              data: yProj,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, type: "dashed", opacity: 0.7 },
              silent: true,
              xAxisIndex: 0,
            },
          ]
        : []),
    ],
  };

  // Projection alignment (robust)
  if (xProj.length && option.series[1]) {
    const projDatesSet = new Set(xProj);
    const aligned = x.map((d) => (projDatesSet.has(d) ? yProj[xProj.indexOf(d)] : null));
    option.series[1].data = aligned;
  }

  // Highlight last point (subtle)
  if (lastY != null && x.length) {
    option.series[0].markPoint = {
      symbol: "circle",
      symbolSize: 10,
      data: [{ coord: [x[x.length - 1], lastY] }],
      label: { show: false },
    };
  }

  return option as Record<string, unknown>;
}

export type MegaKpiCapoStesuraPanelProps = {
  isDark?: boolean;
  costr?: string | null;
  commessa?: string | null;
};

export default function MegaKpiCapoStesuraPanel({
  isDark = true,
  costr,
  commessa,
}: MegaKpiCapoStesuraPanelProps): JSX.Element {
  const { data, isLoading, error } = useQuery<CapoMegaKpiStesuraV1 | null>({
    queryKey: ["capo-mega-kpi-stesura-v1", String(costr || ""), String(commessa || "")],
    enabled: Boolean(costr),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("capo_mega_kpi_stesura_v1", {
        p_costr: costr ?? null,
        p_commessa: commessa ?? null,
        p_inca_file_id: null,
        p_date_from: null,
        p_date_to: null,
      });
      if (error) throw error;
      return (data ?? null) as CapoMegaKpiStesuraV1 | null;
    },
  });

  const empty = useMemo(() => {
    const daily = Array.isArray(data?.series?.daily) ? (data?.series?.daily as DailyRow[]) : [];
    return daily.length === 0;
  }, [data]);

  const option = useMemo(() => buildOption({ data, isDark }), [data, isDark]);

  const headline = data?.headline || {};
  const today = headline?.today || {};
  const cum = headline?.cumulative || {};
  const scope = data?.meta?.scope || {};
  const offset = safeNum(scope?.offset_m);

  const stesuraDay = safeNum(today?.stesura_giorno_m);
  const fascDay = today?.fascettatura_m == null ? null : safeNum(today?.fascettatura_m);

  const cumM = safeNum(cum?.stesura_cum_m);
  const pct = safePct(cum?.progress_pct);

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
        <div>
          <div
            className={cn(
              "text-[11px] uppercase tracking-[0.20em] mb-1",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            KPI · Capo · Stesura
          </div>
          <div className={cn("text-lg font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
            Curva di produzione (cumulata)
          </div>
          <div className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-600")}>
            Include <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>stesura + ripresa</span>.
            Fascettatura esclusa.
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={cn("rounded-xl border px-3 py-2", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
            <div className={cn("text-[10px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-500")}>
              Stesura oggi
            </div>
            <div className={cn("text-base font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
              {formatCompactNumber(stesuraDay)} m
            </div>
          </div>

          <div className={cn("rounded-xl border px-3 py-2", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
            <div className={cn("text-[10px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-500")}>
              Cumul posa
            </div>
            <div className={cn("text-base font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
              {formatCompactNumber(cumM)} m
            </div>
          </div>

          <div className={cn("rounded-xl border px-3 py-2", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
            <div className={cn("text-[10px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-500")}>
              % INCA
            </div>
            <div className={cn("text-base font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
              {pct == null ? "—" : `${pct.toFixed(1)}%`}
            </div>
          </div>

          <div className={cn("rounded-xl border px-3 py-2", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
            <div className={cn("text-[10px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-500")}>
              Offset INCA
            </div>
            <div className={cn("text-base font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
              {formatCompactNumber(offset)} m
            </div>
          </div>
        </div>
      </div>

      {fascDay != null ? (
        <div className={cn("mb-3 text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
          Fascettatura oggi:{" "}
          <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-800")}>
            {formatCompactNumber(fascDay)} m
          </span>{" "}
          <span className={cn(isDark ? "text-slate-500" : "text-slate-500")}>(non inclusa nella posa)</span>
        </div>
      ) : null}

      {error ? (
        <div
          className={cn(
            "rounded-xl border px-3 py-3 text-sm",
            isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-800"
          )}
        >
          Errore nel caricamento KPI: {String((error as any)?.message || error)}
        </div>
      ) : (
        <CoreEChart
          option={option}
          height={360}
          loading={isLoading}
          empty={empty}
          emptyLabel="Nessun dato per la posa"
          emptyHint="Verifica di avere rapportini con stesura/ripresa (fascettatura esclusa)."
          isDark={isDark}
        />
      )}

      <div className={cn("mt-3 text-[11px]", isDark ? "text-slate-500" : "text-slate-500")}>
        Nota: la curva parte dalla data del primo rapportino del Capo e include un offset INCA (cavi già in P). Il back applica la regola:
        <span className={cn("font-semibold", isDark ? "text-slate-300" : "text-slate-700")}> stesura del giorno = stesura + ripresa</span>.
      </div>
    </div>
  );
}