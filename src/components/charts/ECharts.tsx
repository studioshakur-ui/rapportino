import ReactECharts from "echarts-for-react";
import type { CSSProperties } from "react";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export type EChartsProps = {
  option: EChartsOption;
  style?: CSSProperties;
  className?: string;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  isDark?: boolean;
  theme?: string;
};

export default function ECharts({
  option,
  style,
  className,
  notMerge = true,
  lazyUpdate = true,
  isDark = false,
  theme,
}: EChartsProps) {
  const resolvedTheme = theme ?? (isDark ? "dark" : undefined);

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      style={style}
      className={className}
      notMerge={notMerge}
      lazyUpdate={lazyUpdate}
      theme={resolvedTheme}
    />
  );
}
