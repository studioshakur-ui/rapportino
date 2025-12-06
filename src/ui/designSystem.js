// ======================================================================
// DESIGN SYSTEM — CORE (Cognitive Naval Control System)
// Identité : Dark Industrial · Naval Engineering · SpaceX Inspired
// ======================================================================

// -----------------------------
// PALETTE
// -----------------------------
export const colors = {
  primary: "text-sky-300",
  primaryBg: "bg-sky-500/10",
  danger: "text-rose-400",
  success: "text-emerald-300",
  border: "border-slate-700",
  surfaceDark: "bg-slate-950",
  surfaceMid: "bg-slate-900/90",
  surfaceLight: "bg-slate-100",
};

// -----------------------------
// SURFACES (cards, panels, sections)
// -----------------------------

// Surface principale — cartes premium (Login, RoleSelect, panneaux Ufficio/Direzione)
export const cardSurface = `
  bg-slate-950/90
  border border-slate-800
  rounded-2xl
  shadow-[0px_0px_25px_rgba(0,0,0,0.35)]
  backdrop-blur-sm
  p-6
`;

// Surface panneau cockpit (moins arrondi, plus "engineering")
export const panelSurface = `
  bg-slate-900/80
  border border-slate-800
  rounded-xl
  shadow-[0px_0px_15px_rgba(0,0,0,0.25)]
  backdrop-blur-sm
  p-4
`;

// Surface light (rarement utilisée mais utile)
export const surfaceLight = `
  bg-white
  border border-slate-300
  rounded-xl
  shadow-sm
  p-4
`;

// -----------------------------
// TITLES & TEXT STYLES
// -----------------------------

export const sectionTitle = `
  text-slate-200 
  text-lg 
  font-semibold 
  tracking-wide 
  mb-3
`;

export const cockpitSubtitle = `
  text-[11px] 
  uppercase 
  tracking-[0.18em] 
  text-slate-400
`;

export const mutedText = `
  text-[12px] 
  text-slate-400
`;

// -----------------------------
// BUTTONS
// -----------------------------

// Bouton principal (actions majeures)
export const btnPrimary = `
  px-4 py-2 
  rounded-md 
  bg-sky-600 
  hover:bg-sky-700 
  text-white 
  text-sm 
  font-medium 
  shadow-sm 
  transition-colors
`;

// Bouton secondaire (ghost)
export const btnSecondary = `
  px-4 py-2 
  rounded-md 
  border border-slate-600 
  bg-slate-900/60 
  hover:bg-slate-800 
  text-slate-200 
  text-sm 
  transition-all
`;

// Bouton danger
export const btnDanger = `
  px-4 py-2 
  rounded-md 
  border border-rose-600 
  bg-rose-600/20 
  hover:bg-rose-600 
  hover:text-white 
  text-rose-300 
  text-sm 
  transition-all
`;

// Petit bouton (pour header, options)
export const btnSmall = `
  px-2.5 py-1 
  rounded-md 
  border border-slate-600 
  bg-slate-900/80 
  hover:bg-slate-800 
  text-[11px] 
  text-slate-100
`;

// -----------------------------
// INPUTS
// -----------------------------

export const inputStyle = `
  w-full
  px-3 py-2
  rounded-md
  bg-slate-900/60
  border border-slate-700
  text-slate-100
  text-sm
  placeholder-slate-500
  focus:outline-none
  focus:ring-1
  focus:ring-sky-500
`;

// Input clair (rarement utilisé)
export const inputLight = `
  w-full
  px-3 py-2
  rounded-md
  border border-slate-300
  text-slate-900
  focus:outline-none
  focus:ring-1
  focus:ring-sky-400
`;

// -----------------------------
// BADGES & TAGS
// -----------------------------

export const badge = {
  success: `
    inline-flex items-center px-2 py-0.5
    rounded-full text-[11px]
    bg-emerald-500/10 text-emerald-300
    border border-emerald-700
  `,
  info: `
    inline-flex items-center px-2 py-0.5
    rounded-full text-[11px]
    bg-sky-500/10 text-sky-300
    border border-sky-700
  `,
  warning: `
    inline-flex items-center px-2 py-0.5
    rounded-full text-[11px]
    bg-amber-500/10 text-amber-300
    border border-amber-700
  `,
  danger: `
    inline-flex items-center px-2 py-0.5
    rounded-full text-[11px]
    bg-rose-500/10 text-rose-300
    border border-rose-700
  `,
};

// -----------------------------
// DIVIDERS
// -----------------------------

export const divider = `
  border-t border-slate-800 my-4
`;

// -----------------------------
// ANIMATIONS
// -----------------------------

export const fadeIn = `
  animate-[fadeIn_0.4s_ease-out]
`;

/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
*/

// ======================================================================
// FIN DU DESIGN SYSTEM CORE
// ======================================================================
