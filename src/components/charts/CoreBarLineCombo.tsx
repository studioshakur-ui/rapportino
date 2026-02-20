// /src/components/charts/CoreBarLineCombo.jsx
// CORE / CNCS — Recharts Combo (bars + line) for timeline KPIs

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { CORE_CHART_THEME, formatNumberIT, safeText, coreTooltipStyle } from "./coreChartTheme";
import { CoreEmpty, CoreLoading } from "./CoreEmptyState";

type CoreBarLineComboProps = {
  data?: unknown[];
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  emptyHint?: string;
  isDark?: boolean;
  xKey?: string;
  barKey?: string;
  barName?: string;
  barColor?: string;
  lineKey?: string;
  lineName?: string;
  lineColor?: string;
  showLegend?: boolean;
  labelFormatter?: (label: unknown, payload: unknown[]) => string;
  className?: string;
};

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
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatNumberIT(val, 2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CoreBarLineCombo({
  data = [],
  height = 240,
  loading = false,
  empty = false,
  emptyLabel = "Nessun dato",
  emptyHint,
  isDark = true,

  xKey = "label",

  barKey = "bar",
  barName = "Bar",
  barColor,

  lineKey = "line",
  lineName = "Line",
  lineColor,

  showLegend = true,
  labelFormatter,
  className = "",
}: CoreBarLineComboProps) {
  const t = CORE_CHART_THEME;

  const computedEmpty = useMemo(() => {
    if (empty) return true;
    if (loading) return false;
    return !data || data.length === 0;
  }, [empty, loading, data]);

  if (loading) return <CoreLoading isDark={isDark} />;
  if (computedEmpty) return <CoreEmpty isDark={isDark} label={emptyLabel} hint={emptyHint} />;

  const axisTick = { fontSize: 10, fill: isDark ? t.subtext : "#64748b" };

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke={t.axisLine} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={axisTick}
            axisLine={{ stroke: t.axisLine }}
            tickLine={{ stroke: t.axisLine }}
          />
          <YAxis
            tick={axisTick}
            axisLine={{ stroke: t.axisLine }}
            tickLine={{ stroke: t.axisLine }}
            tickFormatter={(v) => formatNumberIT(v, 0)}
          />
          <Tooltip content={<TooltipContent labelFormatter={labelFormatter} />} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11, color: t.text }} /> : null}

          <Bar
            dataKey={barKey}
            name={barName}
            fill={barColor || t.danger}
            barSize={18}
            isAnimationActive
            animationDuration={t.animMs}
          />
          <Line
            type="monotone"
            dataKey={lineKey}
            name={lineName}
            stroke={lineColor || t.positive}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={t.animMs}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
