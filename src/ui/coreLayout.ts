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
  pageShell(_isDark: boolean): string {
    return "theme-scope theme-bg";
  },

  header(_isDark: boolean): string {
    return "theme-scope theme-topbar";
  },

  sidebar(_isDark: boolean): string {
    return "theme-scope theme-bg theme-border";
  },

  mainBg(_isDark: boolean): string {
    return "theme-scope theme-bg";
  },

  primaryPanel(_isDark: boolean): string {
    return "theme-scope theme-panel";
  },

  themeToggle(_isDark: boolean): string {
    return "theme-scope theme-panel-2 theme-border hover:opacity-95";
  },

  /**
   * KPI Card (Executive)
   * - Dark: keep the existing “war room” look (tinted panels are OK).
   * - Light: NEVER pastel fills (banal). Use neutral surface + accent stripe only.
   */
  kpiCard(isDark: boolean, tone: KpiTone = "neutral"): string {
    const base =
      "relative overflow-hidden rounded-2xl border px-4 py-3 flex flex-col gap-1.5 min-h-[96px] theme-scope kpi-card";

    if (!isDark) {
      // Accent-only in light
      const toneCls = `kpi-tone-${tone}`;
      return [base, "theme-panel-2 theme-border", "kpi-light", toneCls].join(" ");
    }

    // Dark behavior: keep your existing tinted cards (premium dark OK)
    if (tone === "neutral") {
      return [base, "theme-panel theme-border"].join(" ");
    }

    const palettes: Record<KpiTone, string> = {
      neutral: "theme-panel theme-border",
      emerald: "bg-emerald-500/5 border-emerald-500/45 text-emerald-50 shadow-[0_0_32px_rgba(16,185,129,0.45)]",
      sky: "bg-sky-500/5 border-sky-500/45 text-sky-50 shadow-[0_0_32px_rgba(56,189,248,0.45)]",
      amber: "bg-amber-500/5 border-amber-500/45 text-amber-50 shadow-[0_0_32px_rgba(245,158,11,0.45)]",
      violet: "bg-violet-500/5 border-violet-500/45 text-violet-50 shadow-[0_0_32px_rgba(139,92,246,0.45)]",
      rose: "bg-rose-500/5 border-rose-500/45 text-rose-50 shadow-[0_0_32px_rgba(244,63,94,0.45)]",
    };

    return [base, palettes[tone] || palettes.neutral].join(" ");
  },
};