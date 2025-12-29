// src/i18n/coreI18n.js
import React, { createContext, useContext } from "react";

export const LANGS = ["it", "fr", "en"];

export function getInitialLang() {
  if (typeof window === "undefined") return "it";
  try {
    const saved = window.localStorage.getItem("core-lang");
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return "it";
}

export function setLangStorage(lang) {
  try {
    window.localStorage.setItem("core-lang", lang);
  } catch {
    // ignore
  }
}

const DICT = {
  it: {
    // Common shell
    LANG: "Lingua",
    LOGOUT: "Logout",
    SHELL_ROLE: "Ruolo",
    SHELL_EXPAND: "Espandi menu",
    SHELL_COLLAPSE: "Riduci menu",
    SHELL_CONNECTION: "Connessione",

    // Dashboard Direzione
    DIR_DASH_TITLE: "Dashboard Direzione",
    DIR_WINDOW: "Finestra",
    DIR_RESET_FILTERS: "Reset filtri",
    DIR_READONLY: "Sola lettura",
    DIR_COSTR: "COSTR",
    DIR_COMMESSA: "Commessa",

    KPI_RAPPORTINI: "Rapportini",
    KPI_RIGHE_ATTIVITA: "Righe attività",
    KPI_INDICE_PROD: "Indice produttività",
    KPI_INCA_PREV: "INCA PREV",
    KPI_INCA_REAL: "INCA REAL",
    KPI_RITARDI_CAPI: "Ritardi capi",

    KPI_HINT_CLICK: "Clicca per dettagli",
    KPI_DETAILS_TITLE: "Dettaglio KPI",
    KPI_DETAILS_CLOSE: "Chiudi",

    // Charts
    CHARTS_TITLE: "Andamento e confronto",
    CHART_TREND_TITLE: "Trend · Produttività giornaliera",
    CHART_TREND_SUB: "Mostra derivazioni e miglioramento nel periodo.",
    CHART_INCA_TITLE: "INCA · Previsti vs Realizzati",
    CHART_INCA_SUB: "Top file/commesse per volume previsto (lettura rapida).",

    // Modal sections
    MODAL_SECTION_SUMMARY: "Sintesi",
    MODAL_SECTION_RULES: "Regole",
    MODAL_SECTION_BREAKDOWN: "Dettaglio",
    MODAL_SECTION_NOTES: "Note",

    // Generic
    SEARCH: "Cerca",
    RESET: "Reset",
    CLEAR: "Clear",
  },

  fr: {
    LANG: "Langue",
    LOGOUT: "Déconnexion",
    SHELL_ROLE: "Rôle",
    SHELL_EXPAND: "Déployer le menu",
    SHELL_COLLAPSE: "Réduire le menu",
    SHELL_CONNECTION: "Connexion",

    DIR_DASH_TITLE: "Dashboard Direction",
    DIR_WINDOW: "Fenêtre",
    DIR_RESET_FILTERS: "Reset filtres",
    DIR_READONLY: "Lecture seule",
    DIR_COSTR: "COSTR",
    DIR_COMMESSA: "Commessa",

    KPI_RAPPORTINI: "Rapportini",
    KPI_RIGHE_ATTIVITA: "Lignes activités",
    KPI_INDICE_PROD: "Indice productivité",
    KPI_INCA_PREV: "INCA PREV",
    KPI_INCA_REAL: "INCA REAL",
    KPI_RITARDI_CAPI: "Retards capi",

    KPI_HINT_CLICK: "Cliquer pour détails",
    KPI_DETAILS_TITLE: "Détail KPI",
    KPI_DETAILS_CLOSE: "Fermer",

    CHARTS_TITLE: "Tendance et comparaison",
    CHART_TREND_TITLE: "Tendance · Productivité journalière",
    CHART_TREND_SUB: "Montre dérive et amélioration sur la période.",
    CHART_INCA_TITLE: "INCA · Prévu vs Réalisé",
    CHART_INCA_SUB: "Top fichiers/commesse par volume prévu (lecture rapide).",

    MODAL_SECTION_SUMMARY: "Synthèse",
    MODAL_SECTION_RULES: "Règles",
    MODAL_SECTION_BREAKDOWN: "Détail",
    MODAL_SECTION_NOTES: "Notes",

    SEARCH: "Rechercher",
    RESET: "Reset",
    CLEAR: "Clear",
  },

  en: {
    LANG: "Language",
    LOGOUT: "Logout",
    SHELL_ROLE: "Role",
    SHELL_EXPAND: "Expand menu",
    SHELL_COLLAPSE: "Collapse menu",
    SHELL_CONNECTION: "Connection",

    DIR_DASH_TITLE: "Direction Dashboard",
    DIR_WINDOW: "Window",
    DIR_RESET_FILTERS: "Reset filters",
    DIR_READONLY: "Read-only",
    DIR_COSTR: "COSTR",
    DIR_COMMESSA: "Commessa",

    KPI_RAPPORTINI: "Rapportini",
    KPI_RIGHE_ATTIVITA: "Activity rows",
    KPI_INDICE_PROD: "Productivity index",
    KPI_INCA_PREV: "INCA PREV",
    KPI_INCA_REAL: "INCA REAL",
    KPI_RITARDI_CAPI: "Capo delays",

    KPI_HINT_CLICK: "Click for details",
    KPI_DETAILS_TITLE: "KPI details",
    KPI_DETAILS_CLOSE: "Close",

    CHARTS_TITLE: "Trend and comparison",
    CHART_TREND_TITLE: "Trend · Daily productivity",
    CHART_TREND_SUB: "Shows drift and improvement over time.",
    CHART_INCA_TITLE: "INCA · Planned vs Realized",
    CHART_INCA_SUB: "Top files/commesse by planned volume (quick read).",

    MODAL_SECTION_SUMMARY: "Summary",
    MODAL_SECTION_RULES: "Rules",
    MODAL_SECTION_BREAKDOWN: "Breakdown",
    MODAL_SECTION_NOTES: "Notes",

    SEARCH: "Search",
    RESET: "Reset",
    CLEAR: "Clear",
  },
};

export function t(lang, key) {
  const dict = DICT[lang] || DICT.it;
  return dict[key] ?? (DICT.it[key] ?? key);
}

/**
 * I18n Context (hook attendu par ton code)
 * Fix direct de l'erreur:
 * "does not provide an export named 'useCoreI18n'"
 */
export const CoreI18nContext = createContext({
  lang: "it",
  setLang: () => {},
  t: (key) => key,
});

export function useCoreI18n() {
  return useContext(CoreI18nContext);
}
