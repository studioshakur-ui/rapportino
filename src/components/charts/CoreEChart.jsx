// /src/components/charts/CoreEChart.jsx
// CORE / CNCS — ECharts wrapper (Apache-2.0) with unified theme & defaults

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { CORE_CHART_THEME } from "./coreChartTheme";
import { CoreEmpty, CoreLoading } from "./CoreEmptyState";

export default function CoreEChart({
  option,
  height = 240,
  loading = false,
  empty = false,
  emptyLabel = "Nessun dato",
  emptyHint,
  isDark = true,
  notMerge = true,
  lazyUpdate = true,
  className = "",
}) {
  const themedOption = useMemo(() => {
    const o = option || {};
    const t = CORE_CHART_THEME;

    // Merge minimal defaults without breaking caller overrides
    return {
      backgroundColor: "transparent",
      animationDuration: t.animMs,
      textStyle: {
        color: isDark ? t.text : "#111827",
        fontFamily: t.fontFamily,
        fontSize: t.fontSize,
      },
      grid: o.grid || t.grid,
      tooltip: o.tooltip || { trigger: "axis" },
      ...o,
    };
  }, [option, isDark]);

  if (loading) return <CoreLoading isDark={isDark} />;
  if (empty) return <CoreEmpty isDark={isDark} label={emptyLabel} hint={emptyHint} />;

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ReactECharts
        option={themedOption}
        style={{ width: "100%", height: "100%" }}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
      />
    </div>
  );
}
