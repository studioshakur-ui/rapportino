// ------------------------------------------------------------
// DESIGN SYSTEM · CORE
// Style industriel, sobre, cohérent, utilisable partout
// ------------------------------------------------------------

// Palette principale
export const colors = {
  accent: {
    main: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
  },
  surface: "bg-slate-950",
  surfaceSubtle: "bg-slate-900/70",
  border: "border-slate-800",
  textPrimary: "text-slate-100",
  textSecondary: "text-slate-400",
};

// ------------------------------------------------------------
// CARTES / SURFACES
// ------------------------------------------------------------

export const cardSurface =
  "rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_0_15px_rgba(0,0,0,0.35)] p-4";

export const sectionBlock =
  "rounded-xl border border-slate-800 bg-slate-950/80 p-3 md:p-4 shadow-sm";

export const surfaceSubtle =
  "rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm";

export const sectionHeader =
  "text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-2";

// ------------------------------------------------------------
// TYPO
// ------------------------------------------------------------

export const cockpitSubtitle =
  "text-[11px] uppercase tracking-[0.18em] text-slate-400";

export const mutedText = "text-slate-400 text-[11px]";

// ------------------------------------------------------------
// INPUTS
// ------------------------------------------------------------

export const inputStyle =
  "w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export const inputLabel =
  "block text-[11px] font-medium text-slate-200 mb-1";

// ------------------------------------------------------------
// BOUTONS
// ------------------------------------------------------------

export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-[12px] font-medium px-3 py-1.5 text-slate-50 transition";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-900/70 hover:bg-slate-800 text-[12px] text-slate-200 px-3 py-1.5 transition";

export const btnGhost =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[12px] text-slate-300 hover:bg-slate-800/40 transition";

export const btnDanger =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 bg-rose-600 hover:bg-rose-700 border border-rose-500 text-[12px] text-slate-50 transition";

// ✅ AJOUT : petit bouton cockpit (utilisé dans AppShell)
export const btnSmall =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-600 bg-slate-900/80 text-[11px] text-slate-200 hover:bg-slate-800 hover:text-slate-50 transition";

// ✅ AJOUT : alias pour compatibilité éventuelle
export const buttonPrimary = btnPrimary;

// ------------------------------------------------------------
// BADGES / PILLS
// ------------------------------------------------------------

export const pillBadge =
  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-slate-700 bg-slate-900/70 text-slate-300";

// ------------------------------------------------------------
// ANIMATIONS / UTILS
// ------------------------------------------------------------

export const fadeIn =
  "animate-[fadeIn_0.3s_ease-out]";

// Pour Tailwind config si besoin :
// @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
// ------------------------------------------------------------
