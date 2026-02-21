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

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Dark-first baseline (keeps existing look).
 * Light values are derived from CSS tokens (var --text/--border/--panel/--panel2).
 */
const DARK_THEME: CoreChartTheme = {
  text: "#e5e7eb",
  subtext: "#94a3b8",
  axisLine: "rgba(148,163,184,0.28)",
  gridLine: "rgba(148,163,184,0.12)",
  border: "rgba(148,163,184,0.20)",

  // Surfaces (dark)
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
 * Backward-compatible named export expected by several KPI/Direzione chart modules.
 *
 * NOTE:
 * - Historically charts imported { CORE_CHART_THEME } as a dark-first baseline.
 * - We keep it as the dark theme to preserve existing visuals and avoid refactor churn.
 */
export const CORE_CHART_THEME: CoreChartTheme = DARK_THEME;

export function getCoreChartTheme(isDark: boolean): CoreChartTheme {
  if (isDark) return DARK_THEME;

  // Pull from Warm Metal tokens (core-colors.css)
  const text = cssVar("--text", "#1c1c1a");
  const subtext = cssVar("--textMuted", "#4e4b45");
  const border = cssVar("--border", "rgba(28,24,20,0.10)");
  const borderStrong = cssVar("--borderStrong", "rgba(28,24,20,0.16)");
  const panel = cssVar("--panel", "#ece9e4");
  const panel2 = cssVar("--panel2", "#f8f6f3");

  // Executive light: airy grid, not “dark chart”
  return {
    text,
    subtext,
    axisLine: borderStrong,
    gridLine: border,
    border: borderStrong,

    // Surfaces
    bg: "transparent",
    cardBg: panel2,

    // Keep semantic colors (same hues, less “toy”)
    accent: "#6d5efc",
    positive: "#16a34a",
    danger: "#e11d48",
    warning: "#d97706",
    info: "#0284c7",

    grid: {
      left: 12,
      right: 12,
      top: 18,
      bottom: 28,
      containLabel: true,
    },

    animMs: 520,
  };
}

/**
 * Tooltip base style
 * IMPORTANT:
 * - `border` is kept as a COLOR string because some callers use it as `borderColor`.
 */
export function coreTooltipStyle(theme: CoreChartTheme, isDark: boolean = true): {
  backgroundColor: string;
  border: string; // color
  color: string;
  borderRadius: number;
  padding: string;
  boxShadow: string;
} {
  if (isDark) {
    return {
      backgroundColor: "rgba(2,6,23,0.94)",
      border: theme.border,
      color: theme.text,
      borderRadius: 12,
      padding: "10px 12px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    };
  }

  // Light tooltip uses warm surfaces (panel2-like)
  return {
    backgroundColor: "rgba(248,246,243,0.96)",
    border: theme.border,
    color: theme.text,
    borderRadius: 12,
    padding: "10px 12px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
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
 * Compact formatting (e.g. 1.2k, 3.4M) with IT locale decimal separator.
 * Used in KPI small cards / axes.
 */
export function formatCompactNumber(v: unknown, decimals = 1): string {
  const n = toNumber(v, 0);
  const abs = Math.abs(n);

  const d = Math.max(0, Math.min(2, Math.trunc(Number(decimals) || 0)));

  const fmt = (x: number) =>
    new Intl.NumberFormat("it-IT", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(x);

  if (abs >= 1_000_000_000) return `${fmt(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${fmt(n / 1_000)}k`;
  return fmt(n);
}