// /src/components/charts/coreChartTheme.js
// CORE / CNCS — Chart Theme Tokens (single source of truth)
// No commercial deps. Designed for dark UI by default.

export const CORE_CHART_THEME = {
  mode: "dark",
  bg: "transparent",

  // surfaces / lines
  axisLine: "#1f2937",
  gridLine: "#111827",
  border: "rgba(148, 163, 184, 0.18)",

  // text
  text: "#e5e7eb",
  subtext: "#9ca3af",
  muted: "#64748b",

  // palette (keep stable across engines)
  accent: "#a78bfa", // purple
  positive: "#22c55e", // green
  info: "#38bdf8", // sky
  warning: "#f59e0b", // amber
  danger: "#f43f5e", // rose
  neutral: "#94a3b8",

  // typography
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
  fontSize: 11,

  // chart padding
  grid: { left: 40, right: 16, top: 28, bottom: 36 },

  // animation (Tesla-like: subtle, fast)
  animMs: 220,

  // number formatting
  locale: "it-IT",
  maxFrac: 2,
};

export function formatNumberIT(v, maxFrac = CORE_CHART_THEME.maxFrac) {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(CORE_CHART_THEME.locale, {
    maximumFractionDigits: maxFrac,
  }).format(Number(v));
}

export function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function safeText(x, fallback = "—") {
  const s = (x ?? "").toString().trim();
  return s || fallback;
}

export function coreTooltipStyle(theme = CORE_CHART_THEME) {
  return {
    backgroundColor: "#020617",
    border: `1px solid ${theme.axisLine}`,
    borderRadius: 12,
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    color: theme.text,
    fontSize: 12,
    padding: "10px 12px",
  };
}
