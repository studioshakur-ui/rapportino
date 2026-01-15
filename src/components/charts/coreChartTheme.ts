// src/components/charts/coreChartTheme.ts

export type CoreChartGrid = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  containLabel: boolean;
};

export type CoreChartTheme = {
  // text
  text: string;
  subtext: string;

  // lines
  axisLine: string;
  gridLine: string;
  border: string;

  // surfaces
  bg: string;
  cardBg: string;

  // semantic colors
  accent: string;
  positive: string;
  danger: string;
  warning: string;
  info: string;

  // charts
  grid: CoreChartGrid;
  animMs: number;
};

export const CORE_CHART_THEME: CoreChartTheme = {
  text: "#e5e7eb",
  subtext: "#94a3b8",
  axisLine: "rgba(148,163,184,0.28)",
  gridLine: "rgba(148,163,184,0.12)",
  border: "rgba(148,163,184,0.20)",

  // Surfaces (dark-first)
  bg: "rgba(2,6,23,0.60)",
  cardBg: "rgba(2,6,23,0.60)",

  // Semantic colors
  accent: "#a78bfa", // violet
  positive: "#34d399", // emerald
  danger: "#fb7185", // rose
  warning: "#fbbf24", // amber
  info: "#38bdf8", // sky

  grid: {
    left: 12,
    right: 12,
    top: 18,
    bottom: 28,
    containLabel: true,
  },

  animMs: 520,
};

/**
 * Tooltip base style
 * IMPORTANT:
 * - `border` is kept as a COLOR string because some callers use it as `borderColor`.
 */
export function coreTooltipStyle(theme: CoreChartTheme): {
  backgroundColor: string;
  border: string; // color
  color: string;
  borderRadius: number;
  padding: string;
  boxShadow: string;
} {
  return {
    backgroundColor: "rgba(2,6,23,0.94)",
    border: theme.border,
    color: theme.text,
    borderRadius: 12,
    padding: "10px 12px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
  };
}

/**
 * Coercion helpers (shared across chart wrappers)
 */
export function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeText(v: unknown, fallback = "—"): string {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

/**
 * Locale formatting (IT) for axes / tooltips.
 * decimals is clamped to [0..6] to avoid heavy formatting.
 */
export function formatNumberIT(v: unknown, decimals = 0): string {
  const n = toNumber(v, 0);
  const d = Math.max(0, Math.min(6, Math.trunc(Number(decimals) || 0)));
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);
}

/**
 * Compact formatting used in KPI cards.
 */
export function formatCompactNumber(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);

  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;

  const isInt = Math.round(v) === v;
  return isInt ? String(v) : v.toFixed(1);
}
