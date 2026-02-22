// src/features/kpi/components/MegaKpiCapoStesuraPanel.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "../../../lib/supabaseClient";

import CoreEChart from "../../../components/charts/CoreEChart";
import { CORE_CHART_THEME, coreTooltipStyle, formatCompactNumber } from "../../../components/charts/coreChartTheme";


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
      metri_teo_total?: number | string | null;
      metri_dis_total?: number | string | null;
      metri_ref_total?: number | string | null;
    };
  };
  headline?: {
    today?: {
      stesura_giorno_m?: number | string | null;
      fascettatura_m?: number | string | null;
    };
    cumulative?: {
      stesura_cum_m?: number | string | null;
      inca_progress_m?: number | string | null;
      progress_pct?: number | string | null;
    };
  };
  series?: {
    daily?: DailyRow[];
    total?: DailyRow[];
    events?: EventRow[];
    projection_7d?: ProjectionRow[];
  };
};

type BuildOptionInput = {
  data: CapoMegaKpiStesuraV1 | null | undefined;
  isDark: boolean;
  trendLine?: number[];
  targetLine?: number[];
  incaLine?: number[];
};

function buildOption({ data, isDark, trendLine, targetLine, incaLine }: BuildOptionInput): Record<string, unknown> {
  void isDark; // theme currently fixed by CORE_CHART_THEME
  const theme = CORE_CHART_THEME;

  const daily: DailyRow[] = Array.isArray(data?.series?.daily) ? (data?.series?.daily as DailyRow[]) : [];
  const events: EventRow[] = Array.isArray(data?.series?.events) ? (data?.series?.events as EventRow[]) : [];
  const projection: ProjectionRow[] = Array.isArray(data?.series?.projection_7d)
    ? (data?.series?.projection_7d as ProjectionRow[])
    : [];

  const x = daily.map((r) => String(r.date ?? ""));
  const y = daily.map((r) => safeNum(r.stesura_cum_m));
  const yDaily = daily.map((r) => safeNum(r.stesura_giorno_m));

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
        `<div><span style="color:#94a3b8">Stesura (oggi)</span>: <b>${formatCompactNumber(day)}</b> m</div>`
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
    grid: { left: 12, right: 12, top: 26, bottom: 36, containLabel: true },
    tooltip,
    legend: {
      top: 0,
      left: 0,
      textStyle: { color: theme.subtext, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 6,
      itemGap: 16,
      data: [
        "Cumul posa (finestra)",
        "Cumul INCA (totale)",
        "Stesura giornaliera",
        "Trend prod (7j)",
        "Target",
      ],
    },
    xAxis: {
      type: "category",
      data: x,
      boundaryGap: false,
      axisLabel: { color: theme.subtext, fontSize: 12 },
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: theme.subtext, fontSize: 12 },
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
        name: "Cumul posa (finestra)",
        type: "line",
        data: y,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3.5, color: theme.accent },
        areaStyle: { opacity: 0.16, color: theme.accent },
        emphasis: { focus: "series", lineStyle: { width: 4 } },
        markLine: milestoneLines.length
          ? {
              symbol: ["none", "none"],
              precision: 0,
              data: milestoneLines,
            }
          : undefined,
      },
      {
        name: "Stesura giornaliera",
        type: "line",
        data: yDaily,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, opacity: 0.4, color: theme.subtext },
        silent: true,
      },
      ...(Array.isArray(incaLine) && incaLine.length
        ? [
            {
              name: "Cumul INCA (totale)",
              type: "line",
              data: incaLine,
              showSymbol: false,
              lineStyle: { width: 2, type: "dotted", opacity: 0.8, color: theme.text },
              silent: true,
            },
          ]
        : []),
      ...(Array.isArray(trendLine) && trendLine.length
        ? [
            {
              name: "Trend prod (7j)",
              type: "line",
              data: trendLine,
              smooth: true,
              showSymbol: false,
              lineStyle: { width: 2, type: "dashed", opacity: 0.7, color: theme.subtext },
              silent: true,
            },
          ]
        : []),
      ...(Array.isArray(targetLine) && targetLine.length
        ? [
            {
              name: "Target",
              type: "line",
              data: targetLine,
              showSymbol: false,
              lineStyle: { width: 1.5, type: "dashed", opacity: 0.7, color: theme.warning },
              silent: true,
            },
          ]
        : []),
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

  const headline = data?.headline || {};
  const today = headline?.today || {};
  const cum = headline?.cumulative || {};
  const scope = data?.meta?.scope || {};
  const offset = safeNum(scope?.offset_m);
  const targetTotal = safeNum(scope?.metri_teo_total);
  const incaTotal = safeNum(scope?.metri_ref_total || scope?.metri_dis_total);

  const stesuraDay = safeNum(today?.stesura_giorno_m);
  const fascDay = today?.fascettatura_m == null ? null : safeNum(today?.fascettatura_m);

  const cumM = safeNum(cum?.stesura_cum_m);
  const incaProgressM = safeNum(cum?.inca_progress_m);
  const pct = safePct(cum?.progress_pct);

  const daily = Array.isArray(data?.series?.daily) ? (data?.series?.daily as DailyRow[]) : [];
  const totalDaily = Array.isArray(data?.series?.total) ? (data?.series?.total as DailyRow[]) : [];
  const lastDate = daily.length ? String(daily[daily.length - 1]?.date || "") : "";

  const trendWindow = 7;
  const trendDaily = daily
    .slice(-trendWindow)
    .map((r) => safeNum(r.stesura_giorno_m))
    .filter((v) => v > 0);
  const trendAvg = trendDaily.length ? trendDaily.reduce((a, b) => a + b, 0) / trendDaily.length : 0;

  const trendLine = useMemo(() => {
    if (daily.length < 2) return [];
    const n = Math.min(trendWindow, daily.length);
    const startIdx = daily.length - n;
    const start = safeNum(daily[startIdx]?.stesura_cum_m);
    const end = safeNum(daily[daily.length - 1]?.stesura_cum_m);
    const slope = n > 1 ? (end - start) / (n - 1) : 0;
    return daily.map((_, i) => {
      if (i < startIdx) return null;
      return start + slope * (i - startIdx);
    }) as number[];
  }, [daily]);

  const targetLine = useMemo(() => {
    if (!daily.length || !targetTotal) return [];
    return daily.map(() => targetTotal);
  }, [daily, targetTotal]);

  const incaProgressLine = useMemo(() => {
    if (!daily.length || !incaProgressM) return [];
    return daily.map(() => incaProgressM);
  }, [daily, incaProgressM]);

  const optionFull = useMemo(
    () => buildOption({ data, isDark, trendLine, targetLine, incaLine: incaProgressLine }),
    [data, isDark, trendLine, targetLine, incaProgressLine]
  );

  const optionWindow = useMemo(() => {
    const opt = { ...(optionFull as any) };
    const keep = new Set(["Cumul posa (finestra)", "Stesura giornaliera", "Trend prod (7j)", "Target"]);
    opt.series = (opt.series || []).filter((s: any) => keep.has(String(s?.name || "")));
    opt.legend = { ...(opt.legend || {}), data: [...keep] };
    return opt;
  }, [optionFull]);

  const optionTotal = useMemo(() => {
    if (!totalDaily.length) {
      const opt = { ...(optionFull as any) };
      const keep = new Set(["Cumul INCA (totale)"]);
      opt.series = (opt.series || []).filter((s: any) => keep.has(String(s?.name || "")));
      if (opt.series?.[0]) opt.series[0].lineStyle = { ...(opt.series[0].lineStyle || {}), width: 3 };
      opt.legend = { ...(opt.legend || {}), data: [...keep] };
      return opt;
    }

    const x = totalDaily.map((r) => String(r.date ?? ""));
    const y = totalDaily.map((r) => safeNum(r.stesura_cum_m));
    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 1100,
      animationEasing: "cubicOut",
      grid: { left: 12, right: 12, top: 26, bottom: 36, containLabel: true },
      tooltip: (optionFull as any).tooltip,
      legend: {
        top: 0,
        left: 0,
        textStyle: { color: CORE_CHART_THEME.subtext, fontSize: 12 },
        itemWidth: 14,
        itemHeight: 6,
        itemGap: 16,
        data: ["Cumul INCA (totale)"],
      },
      xAxis: {
        type: "category",
        data: x,
        boundaryGap: false,
        axisLabel: { color: CORE_CHART_THEME.subtext, fontSize: 12 },
        axisLine: { lineStyle: { color: CORE_CHART_THEME.axisLine } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: CORE_CHART_THEME.subtext, fontSize: 12 },
        splitLine: { lineStyle: { color: CORE_CHART_THEME.gridLine } },
      },
      series: [
        {
          name: "Cumul INCA (totale)",
          type: "line",
          data: y,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: CORE_CHART_THEME.text },
          emphasis: { focus: "series", lineStyle: { width: 3.5 } },
        },
      ],
    } as Record<string, unknown>;
  }, [optionFull, totalDaily]);

  const finishDateFromTrend = (total: number): string | null => {
    if (!lastDate || !total || trendAvg <= 0) return null;
    const remaining = total - cumM;
    if (remaining <= 0) return lastDate;
    const days = Math.ceil(remaining / trendAvg);
    const d = new Date(lastDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}`;
  };

  const finishTarget = targetTotal ? finishDateFromTrend(targetTotal) : null;
  const finishInca = incaTotal ? finishDateFromTrend(incaTotal) : null;

  const [targetDateOverride, setTargetDateOverride] = useState<string>("");
  const requiredDaily = useMemo(() => {
    if (!targetDateOverride || !targetTotal || !lastDate) return null;
    const last = new Date(lastDate);
    const tgt = new Date(targetDateOverride);
    if (Number.isNaN(last.getTime()) || Number.isNaN(tgt.getTime())) return null;
    const diffDays = Math.ceil((tgt.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return null;
    const remaining = targetTotal - cumM;
    if (remaining <= 0) return 0;
    return remaining / diffDays;
  }, [targetDateOverride, targetTotal, lastDate, cumM]);

  return (
    <div className="rounded-2xl theme-panel px-4 py-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.20em] mb-1 theme-text-muted">KPI · Capo · Stesura</div>
          <div className="text-lg font-semibold theme-text">Curva INCA (progress)</div>
          <div className="text-sm theme-text-muted">
            Basata su <span className="font-semibold theme-text">situazione P</span> e{" "}
            <span className="font-semibold theme-text">progress 50/70/100</span>. Rapportini esclusi.
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl theme-panel-2 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Stesura oggi</div>
            <div className="text-base font-semibold theme-text">{formatCompactNumber(stesuraDay)} m</div>
          </div>

          <div className="rounded-xl theme-panel-2 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Cumul posa (finestra)</div>
            <div className="text-base font-semibold theme-text">{formatCompactNumber(cumM)} m</div>
          </div>

          <div className="rounded-xl theme-panel-2 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">% INCA</div>
            <div className="text-base font-semibold theme-text">{pct == null ? "—" : `${pct.toFixed(1)}%`}</div>
            <div className="text-[10px] theme-text-muted mt-1">
              Metri INCA: <span className="theme-text font-semibold">{formatCompactNumber(incaProgressM)} m</span>
            </div>
          </div>

          <div className="rounded-xl theme-panel-2 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Offset INCA</div>
            <div className="text-base font-semibold theme-text">{formatCompactNumber(offset)} m</div>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] theme-text-muted mb-1">
          <span>Avanzamento INCA</span>
          <span className="theme-text font-semibold">{pct == null ? "—" : `${pct.toFixed(1)}%`}</span>
        </div>
        <div className="h-2 rounded-full theme-panel-2 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[12px] theme-text-muted">
        <div>
          Trend prod (7j): <span className="theme-text font-semibold">{trendAvg ? `${formatCompactNumber(trendAvg)} m/g` : "—"}</span>
        </div>
        <div>
          Finitura target: <span className="theme-text font-semibold">{finishTarget || "—"}</span>
        </div>
        <div>
          Finitura INCA: <span className="theme-text font-semibold">{finishInca || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Data target</span>
          <input
            type="date"
            value={targetDateOverride}
            onChange={(e) => setTargetDateOverride(e.target.value)}
            className="rounded-xl theme-input px-2 py-1 text-[12px]"
          />
          <span>
            Pace richiesta:{" "}
            <span className="theme-text font-semibold">
              {requiredDaily == null ? "—" : `${formatCompactNumber(requiredDaily)} m/g`}
            </span>
          </span>
        </div>
      </div>

      {fascDay != null ? (
        <div className="mb-3 text-xs theme-text-muted">
          Fascettatura oggi:{" "}
          <span className="font-semibold theme-text">{formatCompactNumber(fascDay)} m</span>{" "}
          <span className="theme-text-muted">(non inclusa)</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl px-3 py-3 text-sm badge-danger">
          Errore nel caricamento KPI: {String((error as any)?.message || error)}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl theme-panel-2 px-4 py-4">
            <div className="text-[12px] font-semibold theme-text mb-2">Cumul posa (finestra)</div>
            <CoreEChart
              option={optionWindow}
              height={280}
              loading={isLoading}
              empty={empty}
              emptyLabel="Nessun dato per la posa"
              emptyHint="Verifica di avere posa INCA nel range."
              isDark={isDark}
            />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] theme-text-muted">
              <span>
                Cumul: <span className="theme-text font-semibold">{formatCompactNumber(cumM)} m</span>
              </span>
              <span>
                Media 7j: <span className="theme-text font-semibold">{trendAvg ? `${formatCompactNumber(trendAvg)} m/g` : "—"}</span>
              </span>
              <span>
                Ultima data: <span className="theme-text font-semibold">{lastDate || "—"}</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl theme-panel-2 px-4 py-4">
            <div className="text-[12px] font-semibold theme-text mb-2">Cumul INCA (totale)</div>
            <CoreEChart
              option={optionTotal}
              height={280}
              loading={isLoading}
              empty={empty}
              emptyLabel="Nessun dato INCA"
              emptyHint="Verifica baseline INCA e progress."
              isDark={isDark}
            />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] theme-text-muted">
              <span>
                Metri INCA: <span className="theme-text font-semibold">{formatCompactNumber(incaProgressM)} m</span>
              </span>
              <span>
                Metri ref: <span className="theme-text font-semibold">{formatCompactNumber(incaTotal)} m</span>
              </span>
              <span>
                % INCA: <span className="theme-text font-semibold">{pct == null ? "—" : `${pct.toFixed(1)}%`}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-[11px] theme-text-muted flex flex-wrap gap-3">
        <span>
          <span className="font-semibold theme-text">Cumul posa (finestra)</span>: INCA con data posa nel range.
        </span>
        <span>
          <span className="font-semibold theme-text">Cumul INCA (totale)</span>: tutti i cavi con progress/situazione.
        </span>
        <span>
          <span className="font-semibold theme-text">Stesura giornaliera</span>: posa del giorno (INCA).
        </span>
      </div>

      <div className="mt-3 text-[11px] theme-text-muted">
        Nota: la curva usa solo INCA (situazione + progress_percent) con data posa INCA. Rapportini esclusi.
      </div>
    </div>
  );
}
