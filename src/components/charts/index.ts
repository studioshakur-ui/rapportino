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

// Existing JS chart wrappers (kept as-is)
export { default as CoreEChart } from "./CoreEChart";
export { default as CoreLineChart } from "./CoreLineChart";
export { default as CoreBarLineCombo } from "./CoreBarLineCombo";
export { CoreEmpty, CoreLoading } from "./CoreEmptyState";
