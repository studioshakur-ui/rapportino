// src/ui/designSystem.js
//
// Design System CORE – High-tech Tesla / Blueprint DNA
// SHAKUR ENGINEERING · 2025

// ------------------------------
// 1. Gestion du thème
// ------------------------------
export function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem("core-theme");
    if (stored === "dark" || stored === "light") return stored;

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // ignore
  }
  return "dark";
}

// ------------------------------
// 2. Fond de page global
// ------------------------------
export function pageBg(isDark) {
  return isDark
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-100 text-slate-900";
}

// ------------------------------
// 3. Header Pill (petits labels supérieurs)
// ------------------------------
export function headerPill(isDark) {
  return [
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] border",
    isDark
      ? "bg-slate-900 border-slate-700 text-slate-400"
      : "bg-slate-50 border-slate-300 text-slate-600",
  ].join(" ");
}

// ------------------------------
// 4. Carte / Surface
// ------------------------------
export function cardSurface(isDark, extra = "") {
  return [
    "rounded-2xl border backdrop-blur",
    isDark
      ? "bg-slate-900/70 border-slate-800 text-slate-100 shadow-[0_0_32px_rgba(0,0,0,0.45)]"
      : "bg-white/80 border-slate-200 text-slate-900 shadow-sm",
    extra,
  ].join(" ");
}

// ------------------------------
// 5. Bouton primaire
// ------------------------------
export function buttonPrimary(isDark, extra = "") {
  return [
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-[14px] font-medium transition-all border",
    isDark
      ? "bg-sky-600 border-sky-500 text-white hover:bg-sky-500"
      : "bg-sky-500 border-sky-400 text-white hover:bg-sky-600",
    extra,
  ].join(" ");
}

// ==========================================================
// 6. corePills  (⭐ NOUVEAU – éléments de navigation / tags)
// ==========================================================
//
// Usage :
// <div className={corePills(isDark, "emerald")}>INCA</div>
//
// "tone" options : neutral | sky | emerald | amber | rose | violet
//
export function corePills(isDark, tone = "neutral", extra = "") {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all";

  const tones = {
    neutral: isDark
      ? "bg-slate-900 border-slate-700 text-slate-300"
      : "bg-slate-100 border-slate-300 text-slate-700",

    sky: isDark
      ? "bg-sky-900/30 border-sky-600/50 text-sky-300"
      : "bg-sky-100 border-sky-300 text-sky-700",

    emerald: isDark
      ? "bg-emerald-900/30 border-emerald-600/50 text-emerald-300"
      : "bg-emerald-100 border-emerald-300 text-emerald-700",

    amber: isDark
      ? "bg-amber-900/30 border-amber-600/50 text-amber-300"
      : "bg-amber-100 border-amber-300 text-amber-700",

    rose: isDark
      ? "bg-rose-900/30 border-rose-600/50 text-rose-300"
      : "bg-rose-100 border-rose-300 text-rose-700",

    violet: isDark
      ? "bg-violet-900/30 border-violet-600/50 text-violet-300"
      : "bg-violet-100 border-violet-300 text-violet-700",
  };

  return [base, tones[tone] || tones.neutral, extra].join(" ");
}

// ======================================================================
// 7. themeIconBg  (⭐ NOUVEAU – bulles pour icônes de thème et de statut)
// ======================================================================
//
// Usage :
// <span className={themeIconBg(isDark)}>🌑</span>
//
export function themeIconBg(isDark, tone = "neutral", extra = "") {
  const base =
    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] border transition-all";

  const tones = {
    neutral: isDark
      ? "bg-slate-800 border-slate-700 text-slate-300"
      : "bg-slate-200 border-slate-300 text-slate-700",

    sky: isDark
      ? "bg-sky-900/40 border-sky-700 text-sky-300"
      : "bg-sky-100 border-sky-300 text-sky-700",

    emerald: isDark
      ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
      : "bg-emerald-100 border-emerald-300 text-emerald-700",
  };

  return [base, tones[tone] || tones.neutral, extra].join(" ");
}