// src/components/kpi/operatorProd/utils/kpiUi.js
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatNumber(v: unknown, maxFrac = 2): string {
  if (v == null || Number.isNaN(v)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(Number(v));
}

export function toneByIndex(idx: unknown, isDark: boolean): string {
  const n = typeof idx === "number" ? idx : Number(idx);
  void isDark;
  if (!Number.isFinite(n)) return "tone-neutral";
  if (n >= 1.2) return "tone-good";
  if (n >= 1.0) return "tone-ok";
  return "tone-bad";
}

export function haloByIndex(idx: unknown): string {
  const n = typeof idx === "number" ? idx : Number(idx);
  if (!Number.isFinite(n)) return "kpi-halo-neutral";
  if (n >= 1.2) return "kpi-halo-good";
  if (n >= 1.0) return "kpi-halo-ok";
  return "kpi-halo-bad";
}

export function pickAccent(idx: unknown): string {
  const n = typeof idx === "number" ? idx : Number(idx);
  if (!Number.isFinite(n)) return "dot-neutral";
  if (n >= 1.2) return "dot-good";
  if (n >= 1.0) return "dot-ok";
  return "dot-bad";
}
