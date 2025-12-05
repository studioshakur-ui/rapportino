//
// CORE · SHAKUR Engineering
// Design System minimal pour unifier les styles du projet.
// ---------------------------------------------------------

// Palette principale (valeurs Tailwind-friendly)
export const colors = {
  primary: "#0ea5e9",      // sky-500
  primaryDark: "#0369a1",  // sky-700
  danger: "#dc2626",       // red-600
  success: "#16a34a",      // green-600
  warning: "#eab308",      // amber-500
  slateLight: "#f1f5f9",
  slateDark: "#0f172a",
};

// Surfaces standardisées
export const surfaces = {
  page: "bg-slate-950 text-slate-100",
  card: "bg-slate-900/80 border border-slate-700 shadow-sm rounded-lg",
  cardLight: "bg-white border border-slate-300 rounded-lg shadow",
};

// Typographies
export const typography = {
  title: "text-xl font-semibold tracking-wide",
  section: "text-sm font-medium text-slate-400 tracking-widest uppercase",
  label: "text-xs font-semibold text-slate-500",
};

// Boutons standards
export const buttons = {
  primary:
    "px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium",
  danger:
    "px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium",
  subtle:
    "px-3 py-1.5 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm",
};

// Utilitaires
export const utils = {
  cardPadding: "p-4 md:p-6",
  transition: "transition-all duration-150 ease-out",
};
