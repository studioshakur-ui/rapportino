// /src/components/charts/CoreLineChart.jsx
// CORE / CNCS — Recharts Line wrapper (MIT) with unified theme & tooltip

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  CORE_CHART_THEME,
  formatNumberIT,
  safeText,
  toNumber,
  coreTooltipStyle,
} from "./coreChartTheme";
import { CoreEmpty, CoreLoading } from "./CoreEmptyState";

type CoreLineChartLine = {
  key: string;
  name?: string;
  stroke?: string;
};

type CoreLineChartProps = {
  data?: unknown[];
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  emptyHint?: string;
  isDark?: boolean;
  xKey?: string;
  yLines?: CoreLineChartLine[];
  showLegend?: boolean;
  labelFormatter?: (label: unknown, payload: unknown[]) => string;
  xTickFormatter?: (value: unknown, index: number) => string;
  yTickFormatter?: (value: unknown, index: number) => string;
  yDomain?: unknown;
  className?: string;
};

type YDomain =
  | [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"]
  | ["auto", "auto"]
  | [number, number]
  | undefined;

function defaultTickFormatter(v: unknown): string {
  if (typeof v === "string") return v;
  return formatNumberIT(v, 2);
}

function TooltipContent({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: unknown; value?: unknown }> | null;
  label?: unknown;
  labelFormatter?: (label: unknown, payload: unknown[]) => string;
}) {
  const t = CORE_CHART_THEME;
  if (!active || !payload || !payload.length) return null;

  const niceLabel = labelFormatter ? labelFormatter(label, payload) : safeText(label, "—");

  return (
    <div style={coreTooltipStyle(t)}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{niceLabel}</div>
      <div style={{ display: "grid", gap: 4 }}>
        {payload.map((p, idx) => {
          const name = safeText(p?.name);
          const val = p?.value;
          return (
            <div key={`${name}-${idx}`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: t.subtext }}>{name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{defaultTickFormatter(val)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CoreLineChart({
  data = [],
  height = 240,
  loading = false,
  empty = false,
  emptyLabel = "Nessun dato",
  emptyHint,
  isDark = true,

  xKey = "label",
  yLines = [
    // { key: "value", name: "Valore", stroke: CORE_CHART_THEME.accent }
  ],

  showLegend = true,
  labelFormatter,
  xTickFormatter,
  yTickFormatter,
  yDomain, // e.g. [0, "auto"] or ["auto", "auto"]
  className = "",
}: CoreLineChartProps) {
  const t = CORE_CHART_THEME;

  const computedEmpty = useMemo(() => {
    if (empty) return true;
    if (loading) return false;
    return !data || data.length === 0 || yLines.every((l) => data.every((r) => toNumber((r as Record<string, unknown>)?.[l.key]) === 0));
  }, [empty, loading, data, yLines]);

  if (loading) return <CoreLoading isDark={isDark} />;
  if (computedEmpty) return <CoreEmpty isDark={isDark} label={emptyLabel} hint={emptyHint} />;

  const axisTick = { fontSize: 10, fill: isDark ? t.subtext : "#64748b" };

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={t.axisLine} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={axisTick}
            axisLine={{ stroke: t.axisLine }}
            tickLine={{ stroke: t.axisLine }}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            tick={axisTick}
            axisLine={{ stroke: t.axisLine }}
            tickLine={{ stroke: t.axisLine }}
            domain={yDomain as YDomain}
            tickFormatter={yTickFormatter || defaultTickFormatter}
          />
          <Tooltip content={<TooltipContent labelFormatter={labelFormatter} />} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11, color: t.text }} /> : null}

          {yLines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name || l.key}
              stroke={l.stroke || t.accent}
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={t.animMs}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
