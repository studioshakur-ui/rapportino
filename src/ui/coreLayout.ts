// /src/ui/coreLayout.ts
//
// CORE Layout helpers – commun à Capo, Ufficio, Direzione, Dashboard.
// SHAKUR ENGINEERING · 2025
//
// IMPORTANT (Option B):
// - On garde `coreLayout` (layout tokens).
// - On RÉ-EXPORTE `corePills` et `themeIconBg` depuis /src/ui/designSystem.ts
//   pour compatibilité avec les imports existants du type:
//     import { corePills } from "../ui/coreLayout";

export { corePills, themeIconBg } from "./designSystem";

export type KpiTone = "neutral" | "emerald" | "sky" | "amber" | "violet" | "rose";

export const coreLayout = {
  // Fond de la page (body des shells)
  pageShell(isDark: boolean): string {
    return isDark ? "bg-slate-950 text-slate-100" : "bg-[#EEF2F5] text-slate-900";
  },

  // Header cockpit (barre supérieure)
  header(isDark: boolean): string {
    return isDark ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-200 shadow-sm";
  },

  // Sidebar (colonne gauche : Capo / Ufficio / Direzione)
  sidebar(isDark: boolean): string {
    return isDark ? "bg-slate-950 border-slate-800" : "bg-[#F4F7FA] border-slate-200";
  },

  // Fond de la zone principale (derrière les panneaux)
  mainBg(isDark: boolean): string {
    return isDark ? "bg-slate-950" : "bg-[#EEF2F5]";
  },

  // Panneau principal (celui qui contient l’<Outlet />)
  primaryPanel(isDark: boolean): string {
    return isDark
      ? "border-slate-800 bg-slate-950/90 shadow-[0_20px_60px_rgba(15,23,42,0.9)]"
      : "border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]";
  },

  // Bouton toggle theme
  themeToggle(isDark: boolean): string {
    return isDark
      ? "border-slate-600 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
      : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100";
  },

  /**
   * Carte KPI (DirezioneDashboard, stats, etc.)
   * tone: 'neutral' | 'emerald' | 'sky' | 'amber' | 'violet' | 'rose'
   */
  kpiCard(isDark: boolean, tone: KpiTone = "neutral"): string {
    const base =
      "relative overflow-hidden rounded-2xl border px-4 py-3 flex flex-col gap-1.5 min-h-[96px]";

    const palettes: Record<KpiTone, { dark: string; light: string }> = {
      neutral: {
        dark: "bg-slate-950/80 border-slate-800 text-slate-100 shadow-[0_0_32px_rgba(15,23,42,0.85)]",
        light: "bg-white border-slate-200 text-slate-900 shadow-sm",
      },
      emerald: {
        dark: "bg-emerald-500/5 border-emerald-500/50 text-emerald-50 shadow-[0_0_32px_rgba(16,185,129,0.55)]",
        light: "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm",
      },
      sky: {
        dark: "bg-sky-500/5 border-sky-500/50 text-sky-50 shadow-[0_0_32px_rgba(56,189,248,0.55)]",
        light: "bg-sky-50 border-sky-300 text-sky-900 shadow-sm",
      },
      amber: {
        dark: "bg-amber-500/5 border-amber-500/50 text-amber-50 shadow-[0_0_32px_rgba(245,158,11,0.55)]",
        light: "bg-amber-50 border-amber-300 text-amber-900 shadow-sm",
      },
      violet: {
        dark: "bg-violet-500/5 border-violet-500/50 text-violet-50 shadow-[0_0_32px_rgba(139,92,246,0.55)]",
        light: "bg-violet-50 border-violet-300 text-violet-900 shadow-sm",
      },
      rose: {
        dark: "bg-rose-500/5 border-rose-500/50 text-rose-50 shadow-[0_0_32px_rgba(244,63,94,0.55)]",
        light: "bg-rose-50 border-rose-300 text-rose-900 shadow-sm",
      },
    };

    const palette = palettes[tone] || palettes.neutral;
    const modeClasses = isDark ? palette.dark : palette.light;

    return [base, modeClasses].join(" ");
  },
};
