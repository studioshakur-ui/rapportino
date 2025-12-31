// src/i18n/dictionaries.js
// Single source of truth for UI strings (IT default + FR/EN).
// Merges legacy dicts and adds CAPO + KPI operator productivity strings.

import { dict as loginDict } from "./dict";

// Legacy core dict (previously in coreI18n.js). Kept here to unify.
const coreDict = {
  it: {
    // Common shell
    LANG: "Lingua",
    LOGOUT: "Logout",
    SHELL_ROLE: "Ruolo",
    SHELL_EXPAND: "Espandi menu",
    SHELL_COLLAPSE: "Riduci menu",
    SHELL_CONNECTION: "Connessione",

    // App labels
    APP_RAPPORTINO: "Rapportino",
    APP_CORE_DRIVE: "CORE Drive",
    APP_KPI_OPERATORI: "KPI Operatori",
    APP_LOADING_PROFILE: "Caricamento profilo…",

    // CAPO – Today operators panel
    CAPO_TODAY_TITLE: "Operatori di oggi",
    CAPO_TODAY_SUB: "Assegnati dal Manager · Trascina nelle righe",
    CAPO_TODAY_RELOAD: "Ricarica",
    CAPO_TODAY_SEARCH: "Cerca…",
    CAPO_TODAY_LOADING: "Caricamento…",
    CAPO_TODAY_EMPTY: "Nessun operatore.",
    CAPO_TODAY_SESSION_START: "Sessione in avvio…",
    CAPO_TODAY_DRAG_HINT: "Trascina nel rapportino",
    CAPO_TODAY_LOAD_ERROR: "Impossibile caricare gli operatori di oggi.",

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

    // KPI Operatori (Produttività su previsto)
    KPI_OPPROD_TITLE: "KPI Operatori",
    KPI_OPPROD_KICKER: "Direzione · CNCS / CORE",
    KPI_OPPROD_DESC:
      "Produttività per operatore basata su previsto (Σrealizzato / Σprevisto_eff). Seleziona operatori e analizza il dettaglio.",

    KPI_OPPROD_KPI_SELECTED: "Selezionati",
    KPI_OPPROD_KPI_SELECTED_SUB: "Operatori selezionati nella finestra",
    KPI_OPPROD_KPI_HOURS: "Ore (indicizzate)",
    KPI_OPPROD_KPI_HOURS_SUB: "Somma ore indicizzate (tokens)",
    KPI_OPPROD_KPI_PREV: "Previsto eff",
    KPI_OPPROD_KPI_PREV_SUB: "Somma previsto effettivo",
    KPI_OPPROD_KPI_INDEX: "Indice",
    KPI_OPPROD_KPI_INDEX_SUB: "Σrealizzato / Σprevisto_eff",

    KPI_OPPROD_WINDOW: "Finestra",
    KPI_OPPROD_OPERATORS_HINT:
      "Seleziona operatori (multiselect) per calcolare i totali e la classifica.",
    KPI_OPPROD_OPERATORS_DERIVED: "Derivato dai rapportini nella finestra",
    KPI_OPPROD_SELECT_FILTERED: "Seleziona filtrati",
    KPI_OPPROD_CLEAR: "Azzera selezione",
    KPI_OPPROD_SCOPE_ACTIVE: "Scope attivo",
    KPI_OPPROD_SEARCH_PLACEHOLDER: "Cerca operatore…",

    KPI_OPPROD_RESULTS: "Risultati",
    KPI_OPPROD_RESULTS_SUB: "Indice e totali per operatore (su previsto).",

    KPI_OPPROD_TABLE_INDEX: "Indice",
    KPI_OPPROD_TABLE_HOURS: "Ore",
    KPI_OPPROD_TABLE_PREV: "Previsto",
    KPI_OPPROD_TABLE_REAL: "Realizzato",
    KPI_OPPROD_TABLE_DAYS: "Giorni",

    KPI_OPPROD_TOTAL_SELECTION: "Totale selezione",
    KPI_OPPROD_TOTAL_IN_RANGE: "Totale nella finestra",
  },

  fr: {
    LANG: "Langue",
    LOGOUT: "Déconnexion",
    SHELL_ROLE: "Rôle",
    SHELL_EXPAND: "Déployer le menu",
    SHELL_COLLAPSE: "Réduire le menu",
    SHELL_CONNECTION: "Connexion",

    APP_RAPPORTINO: "Rapportino",
    APP_CORE_DRIVE: "CORE Drive",
    APP_KPI_OPERATORI: "KPI Opérateurs",
    APP_LOADING_PROFILE: "Chargement du profil…",

    CAPO_TODAY_TITLE: "Opérateurs du jour",
    CAPO_TODAY_SUB: "Affectés par le Manager · Glisser-déposer dans les lignes",
    CAPO_TODAY_RELOAD: "Recharger",
    CAPO_TODAY_SEARCH: "Rechercher…",
    CAPO_TODAY_LOADING: "Chargement…",
    CAPO_TODAY_EMPTY: "Aucun opérateur.",
    CAPO_TODAY_SESSION_START: "Session en démarrage…",
    CAPO_TODAY_DRAG_HINT: "Glisser dans le rapport",
    CAPO_TODAY_LOAD_ERROR: "Impossible de charger les opérateurs du jour.",

    DIR_DASH_TITLE: "Dashboard Direction",
    DIR_WINDOW: "Fenêtre",
    DIR_RESET_FILTERS: "Réinitialiser filtres",
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

    KPI_OPPROD_TITLE: "KPI Opérateurs",
    KPI_OPPROD_KICKER: "Direction · CNCS / CORE",
    KPI_OPPROD_DESC:
      "Productivité par opérateur basée sur le prévu (Σréalisé / Σprévu_eff). Sélectionnez des opérateurs et analysez le détail.",

    KPI_OPPROD_KPI_SELECTED: "Sélectionnés",
    KPI_OPPROD_KPI_SELECTED_SUB: "Opérateurs sélectionnés sur la fenêtre",
    KPI_OPPROD_KPI_HOURS: "Heures (indexées)",
    KPI_OPPROD_KPI_HOURS_SUB: "Somme des heures indexées (tokens)",
    KPI_OPPROD_KPI_PREV: "Prévu eff",
    KPI_OPPROD_KPI_PREV_SUB: "Somme du prévu effectif",
    KPI_OPPROD_KPI_INDEX: "Indice",
    KPI_OPPROD_KPI_INDEX_SUB: "Σréalisé / Σprévu_eff",

    KPI_OPPROD_WINDOW: "Fenêtre",
    KPI_OPPROD_OPERATORS_HINT:
      "Sélectionnez des opérateurs (multi-sélection) pour calculer les totaux et le classement.",
    KPI_OPPROD_OPERATORS_DERIVED: "Dérivé des rapportini sur la fenêtre",
    KPI_OPPROD_SELECT_FILTERED: "Sélectionner filtrés",
    KPI_OPPROD_CLEAR: "Effacer sélection",
    KPI_OPPROD_SCOPE_ACTIVE: "Scope actif",
    KPI_OPPROD_SEARCH_PLACEHOLDER: "Rechercher opérateur…",

    KPI_OPPROD_RESULTS: "Résultats",
    KPI_OPPROD_RESULTS_SUB: "Indice et totaux par opérateur (sur prévu).",

    KPI_OPPROD_TABLE_INDEX: "Indice",
    KPI_OPPROD_TABLE_HOURS: "Heures",
    KPI_OPPROD_TABLE_PREV: "Prévu",
    KPI_OPPROD_TABLE_REAL: "Réalisé",
    KPI_OPPROD_TABLE_DAYS: "Jours",

    KPI_OPPROD_TOTAL_SELECTION: "Total sélection",
    KPI_OPPROD_TOTAL_IN_RANGE: "Total sur la fenêtre",
  },

  en: {
    LANG: "Language",
    LOGOUT: "Logout",
    SHELL_ROLE: "Role",
    SHELL_EXPAND: "Expand menu",
    SHELL_COLLAPSE: "Collapse menu",
    SHELL_CONNECTION: "Connection",

    APP_RAPPORTINO: "Rapportino",
    APP_CORE_DRIVE: "CORE Drive",
    APP_KPI_OPERATORI: "Operator KPIs",
    APP_LOADING_PROFILE: "Loading profile…",

    CAPO_TODAY_TITLE: "Today’s operators",
    CAPO_TODAY_SUB: "Assigned by Manager · Drag into rows",
    CAPO_TODAY_RELOAD: "Reload",
    CAPO_TODAY_SEARCH: "Search…",
    CAPO_TODAY_LOADING: "Loading…",
    CAPO_TODAY_EMPTY: "No operators.",
    CAPO_TODAY_SESSION_START: "Starting session…",
    CAPO_TODAY_DRAG_HINT: "Drag into report",
    CAPO_TODAY_LOAD_ERROR: "Unable to load today’s operators.",

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

    KPI_OPPROD_TITLE: "Operator KPIs",
    KPI_OPPROD_KICKER: "Direction · CNCS / CORE",
    KPI_OPPROD_DESC:
      "Per-operator productivity based on planned (Σrealized / Σplanned_eff). Select operators and inspect details.",

    KPI_OPPROD_KPI_SELECTED: "Selected",
    KPI_OPPROD_KPI_SELECTED_SUB: "Operators selected in window",
    KPI_OPPROD_KPI_HOURS: "Hours (indexed)",
    KPI_OPPROD_KPI_HOURS_SUB: "Sum of indexed hours (tokens)",
    KPI_OPPROD_KPI_PREV: "Planned eff",
    KPI_OPPROD_KPI_PREV_SUB: "Sum planned effective",
    KPI_OPPROD_KPI_INDEX: "Index",
    KPI_OPPROD_KPI_INDEX_SUB: "Σrealized / Σplanned_eff",

    KPI_OPPROD_WINDOW: "Window",
    KPI_OPPROD_OPERATORS_HINT:
      "Select operators (multi-select) to compute totals and ranking.",
    KPI_OPPROD_OPERATORS_DERIVED: "Derived from rapportini in window",
    KPI_OPPROD_SELECT_FILTERED: "Select filtered",
    KPI_OPPROD_CLEAR: "Clear selection",
    KPI_OPPROD_SCOPE_ACTIVE: "Active scope",
    KPI_OPPROD_SEARCH_PLACEHOLDER: "Search operator…",

    KPI_OPPROD_RESULTS: "Results",
    KPI_OPPROD_RESULTS_SUB: "Index and totals per operator (planned-based).",

    KPI_OPPROD_TABLE_INDEX: "Index",
    KPI_OPPROD_TABLE_HOURS: "Hours",
    KPI_OPPROD_TABLE_PREV: "Planned",
    KPI_OPPROD_TABLE_REAL: "Realized",
    KPI_OPPROD_TABLE_DAYS: "Days",

    KPI_OPPROD_TOTAL_SELECTION: "Selection total",
    KPI_OPPROD_TOTAL_IN_RANGE: "Window total",
  },
};

// Merge helper: shallow merge of key -> string
function mergeLang(a = {}, b = {}) {
  return { ...a, ...b };
}

export const dictionaries = {
  it: mergeLang(coreDict.it, loginDict.it),
  fr: mergeLang(coreDict.fr, loginDict.fr),
  en: mergeLang(coreDict.en, loginDict.en),
};
