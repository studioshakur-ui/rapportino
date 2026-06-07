// src/components/charts/index.ts
// TS-first barrel (overrides index.js). Keeps the public API stable.

export {
  CORE_CHART_THEME,
  coreTooltipStyle,
  formatCompactNumber,
  formatNumberIT,
  safeText,
  toNumber,
} from "./coreChartTheme";

export { default as CoreChartCard } from "./CoreChartCard";

// ECharts wrappers kept for métier charts
export { default as CoreEChart } from "./CoreEChart";
export { CoreEmpty, CoreLoading } from "./CoreEmptyState";
