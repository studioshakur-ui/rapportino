// src/components/charts/coreChartTheme.ts

export type CoreChartTheme = {
  text: string;
  subtext: string;
  axisLine: string;
  gridLine: string;
  border: string;
  cardBg: string;
};

export const CORE_CHART_THEME: CoreChartTheme = {
  text: "#e5e7eb",
  subtext: "#94a3b8",
  axisLine: "rgba(148,163,184,0.28)",
  gridLine: "rgba(148,163,184,0.12)",
  border: "rgba(148,163,184,0.20)",
  cardBg: "rgba(2,6,23,0.60)",
};

export function coreTooltipStyle(theme: CoreChartTheme): { backgroundColor: string; border: string } {
  return {
    backgroundColor: "rgba(2,6,23,0.94)",
    border: theme.border,
  };
}

export function formatCompactNumber(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);

  // >= 1,000,000
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  // >= 1,000
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;

  // Keep one decimal if not integer
  const isInt = Math.round(v) === v;
  return isInt ? String(v) : v.toFixed(1);
}
