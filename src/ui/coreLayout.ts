// src/ui/coreLayout.ts
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
  pageShell(_isDark: boolean): string {
    return "theme-scope theme-bg";
  },

  // Header cockpit (barre supérieure)
  header(_isDark: boolean): string {
    return "theme-scope theme-topbar";
  },

  // Sidebar (colonne gauche : Capo / Ufficio / Direzione)
  sidebar(_isDark: boolean): string {
    return "theme-scope theme-bg theme-border";
  },

  // Fond de la zone principale (derrière les panneaux)
  mainBg(_isDark: boolean): string {
    return "theme-scope theme-bg";
  },

  // Panneau principal (celui qui contient l’<Outlet />)
  primaryPanel(_isDark: boolean): string {
    return "theme-scope theme-panel";
  },

  // Bouton toggle theme
  themeToggle(_isDark: boolean): string {
    return "theme-scope theme-panel-2 theme-border hover:opacity-95";
  },

  /**
   * Carte KPI (DirezioneDashboard, stats, etc.)
   * tone: 'neutral' | 'emerald' | 'sky' | 'amber' | 'violet' | 'rose'
   */
  kpiCard(isDark: boolean, tone: KpiTone = "neutral"): string {
    const base =
      "relative overflow-hidden rounded-2xl border px-4 py-3 flex flex-col gap-1.5 min-h-[96px] theme-scope";

    // Neutral becomes token-based (removes bg-white / dark hardcode)
    if (tone === "neutral") {
      return [base, isDark ? "theme-panel" : "theme-panel-2", "theme-border"].join(" ");
    }

    // Colored cards keep Tailwind tints for now (B scope),
    // but remain inside .theme-scope for consistent text/border in light.
    const palettes: Record<KpiTone, { dark: string; light: string }> = {
      neutral: { dark: "theme-panel", light: "theme-panel-2" },
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