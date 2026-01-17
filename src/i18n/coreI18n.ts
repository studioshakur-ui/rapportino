// src/i18n/coreI18n.ts
//
// Compatibility layer (minimal-diff).
// Legacy modules still import:
//   - useCoreI18n()
//   - t(lang, key)
//   - LANGS, getInitialLang, setLangStorage
//
// Canonical source remains I18nProvider/useI18n,
// but this file must keep legacy exports to avoid breaking Direzione/Admin.

import { useI18n, LANGS, getInitialLang, setLangStorage } from "./I18nProvider";

export { LANGS, getInitialLang, setLangStorage };

export type Lang = (typeof LANGS)[number];

/**
 * Legacy hook still used by Direzione pages.
 * Maps directly to the canonical provider.
 */
export function useCoreI18n() {
  return useI18n();
}

/* ------------------------------------------------------------------ */
/* Legacy t(lang, key) export                                          */
/* ------------------------------------------------------------------ */

const LEGACY_DICT: Record<string, Record<string, string>> = {
  it: {
    LANG: "Lingua",
    LOGOUT: "Logout",
    APP_LOADING_PROFILE: "Caricamento profilo…",

    APP_RAPPORTINO: "Rapportino",
    APP_CORE_DRIVE: "CORE Drive",
    APP_KPI_OPERATORI: "KPI Operatori",

    NAV_DASHBOARD: "Dashboard",
    NAV_ASSIGNMENTS: "Assegnazioni",
    NAV_CORE_DRIVE: "CORE Drive",
    NAV_ANALYTICS: "Analytics",
  },
  fr: {
    LANG: "Langue",
    LOGOUT: "Déconnexion",
    APP_LOADING_PROFILE: "Chargement du profil…",

    APP_RAPPORTINO: "Rapportino",
    APP_CORE_DRIVE: "CORE Drive",
    APP_KPI_OPERATORI: "KPI Opérateurs",

    NAV_DASHBOARD: "Tableau de bord",
    NAV_ASSIGNMENTS: "Affectations",
    NAV_CORE_DRIVE: "CORE Drive",
    NAV_ANALYTICS: "Analytique",
  },
  en: {
    LANG: "Language",
    LOGOUT: "Logout",
    APP_LOADING_PROFILE: "Loading profile…",

    APP_RAPPORTINO: "Rapportino",
    APP_CORE_DRIVE: "CORE Drive",
    APP_KPI_OPERATORI: "Operator KPI",

    NAV_DASHBOARD: "Dashboard",
    NAV_ASSIGNMENTS: "Assignments",
    NAV_CORE_DRIVE: "CORE Drive",
    NAV_ANALYTICS: "Analytics",
  },
};

function safeStr(x: unknown): string {
  return (x ?? "").toString();
}

function prettifyKey(key: unknown): string {
  const s = safeStr(key).trim();
  if (!s) return "—";
  return s
    .replace(/[_]+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

/**
 * Legacy function signature used by Admin/Direzione:
 * t(lang, "KEY") -> string
 */
export function t(lang: string, key: string): string {
  const L = (LANGS as readonly string[]).includes(lang) ? lang : "it";
  const k = safeStr(key).trim();
  if (!k) return "—";

  const dict = LEGACY_DICT[L] || LEGACY_DICT.it;
  return dict[k] ?? (LEGACY_DICT.it[k] ?? prettifyKey(k));
}
