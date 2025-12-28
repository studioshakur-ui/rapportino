// src/components/kpi/operatorProd/utils/kpiUi.js
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function formatNumber(v, maxFrac = 2) {
  if (v == null || Number.isNaN(v)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(Number(v));
}

export function toneByIndex(idx, isDark) {
  if (idx == null || Number.isNaN(idx)) return isDark ? "text-slate-300" : "text-slate-600";
  if (idx >= 1.2) return isDark ? "text-emerald-200" : "text-emerald-700";
  if (idx >= 1.0) return isDark ? "text-sky-200" : "text-sky-700";
  return isDark ? "text-rose-200" : "text-rose-700";
}

export function haloByIndex(idx) {
  if (idx == null || Number.isNaN(idx))
    return "shadow-[0_0_0_1px_rgba(148,163,184,0.22),0_10px_26px_rgba(0,0,0,0.35)]";
  if (idx >= 1.2)
    return "shadow-[0_0_0_1px_rgba(16,185,129,0.30),0_18px_46px_rgba(16,185,129,0.10)]";
  if (idx >= 1.0)
    return "shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_18px_46px_rgba(56,189,248,0.09)]";
  return "shadow-[0_0_0_1px_rgba(244,63,94,0.26),0_18px_46px_rgba(244,63,94,0.07)]";
}

export function pickAccent(idx) {
  if (idx == null || Number.isNaN(idx)) return "bg-slate-400/25";
  if (idx >= 1.2) return "bg-emerald-400/30";
  if (idx >= 1.0) return "bg-sky-400/30";
  return "bg-rose-400/30";
}
