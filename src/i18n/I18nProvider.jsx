// /src/i18n/I18nProvider.jsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export const LANGS = ["it", "fr", "en"];

export function getInitialLang() {
  if (typeof window === "undefined") return "it";
  try {
    const saved = window.localStorage.getItem("core-lang");
    if (saved && LANGS.includes(saved)) return saved;
  } catch {}
  return "it";
}

export function setLangStorage(lang) {
  try {
    window.localStorage.setItem("core-lang", lang);
  } catch {}
}

const DICTS = {
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

    // CAPO — Ship selector
    CAPO_SHIP_KICKER: "Modulo Capo · Selezione nave",
    CAPO_SHIP_TITLE: "Seleziona la nave su cui stai lavorando",
    CAPO_SHIP_DESC: "Rapportini e dati INCA sono sempre legati alla nave selezionata.",
    CAPO_SHIP_CURRENT: "Nave attuale:",
    CAPO_SHIP_NONE_ASSIGNED: "Nessuna nave assegnata al tuo profilo.",
    CAPO_SHIP_ARIA_SELECT: "Seleziona nave",
    CAPO_SHIP_LABEL_SHIP: "NAVE",
    CAPO_SHIP_YARD: "Cantiere:",
    CAPO_SHIP_INCA_CONNECTED: "INCA connesso",
    CAPO_SHIP_INCA_NOT_AVAILABLE: "INCA non disponibile",
    CAPO_SHIP_INCA_TOOLTIP_CONNECTED: "INCA presente (cavi importati)",
    CAPO_SHIP_INCA_TOOLTIP_MISSING: "INCA non disponibile",
    CAPO_SHIP_DEADLINE_EST: "Deadline INCA (stima):",
    CAPO_SHIP_PROD_CALC: "Calcolo produzione…",
    CAPO_SHIP_METERS_REMAIN: "Rimanenti:",
    CAPO_SHIP_DELTA_7D: "Δ 7g:",
    CAPO_SHIP_PROD_NOT_AVAILABLE: "Produzione/INCA metri non disponibili",
    CAPO_SHIP_INCA_LOADING: "INCA…",
    CAPO_SHIP_CABLES_LABEL: "cavi",
    CAPO_SHIP_DB_ERROR:
      "Errore DB: impossibile caricare l’elenco navi (vista non disponibile o permessi).",
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

    // CAPO — Ship selector
    CAPO_SHIP_KICKER: "Module Capo · Sélection navire",
    CAPO_SHIP_TITLE: "Sélectionnez le navire sur lequel vous travaillez",
    CAPO_SHIP_DESC: "Les rapportini et les données INCA sont toujours liés au navire sélectionné.",
    CAPO_SHIP_CURRENT: "Navire actuel :",
    CAPO_SHIP_NONE_ASSIGNED: "Aucun navire affecté à votre profil.",
    CAPO_SHIP_ARIA_SELECT: "Sélectionner navire",
    CAPO_SHIP_LABEL_SHIP: "NAVE",
    CAPO_SHIP_YARD: "Chantier :",
    CAPO_SHIP_INCA_CONNECTED: "INCA connecté",
    CAPO_SHIP_INCA_NOT_AVAILABLE: "INCA indisponible",
    CAPO_SHIP_INCA_TOOLTIP_CONNECTED: "INCA présent (câbles importés)",
    CAPO_SHIP_INCA_TOOLTIP_MISSING: "INCA indisponible",
    CAPO_SHIP_DEADLINE_EST: "Échéance INCA (est.) :",
    CAPO_SHIP_PROD_CALC: "Calcul de production…",
    CAPO_SHIP_METERS_REMAIN: "Restant :",
    CAPO_SHIP_DELTA_7D: "Δ 7j :",
    CAPO_SHIP_PROD_NOT_AVAILABLE: "Production/INCA mètres indisponibles",
    CAPO_SHIP_INCA_LOADING: "INCA…",
    CAPO_SHIP_CABLES_LABEL: "câbles",
    CAPO_SHIP_DB_ERROR:
      "Erreur DB : impossible de charger la liste des navires (vue indisponible ou permissions).",
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

    // CAPO — Ship selector
    CAPO_SHIP_KICKER: "Capo Module · Ship selection",
    CAPO_SHIP_TITLE: "Select the ship you are working on",
    CAPO_SHIP_DESC: "Rapportini and INCA data are always linked to the selected ship.",
    CAPO_SHIP_CURRENT: "Current ship:",
    CAPO_SHIP_NONE_ASSIGNED: "No ships assigned to your profile.",
    CAPO_SHIP_ARIA_SELECT: "Select ship",
    CAPO_SHIP_LABEL_SHIP: "SHIP",
    CAPO_SHIP_YARD: "Yard:",
    CAPO_SHIP_INCA_CONNECTED: "INCA connected",
    CAPO_SHIP_INCA_NOT_AVAILABLE: "INCA not available",
    CAPO_SHIP_INCA_TOOLTIP_CONNECTED: "INCA available (cables imported)",
    CAPO_SHIP_INCA_TOOLTIP_MISSING: "INCA not available",
    CAPO_SHIP_DEADLINE_EST: "INCA deadline (est.):",
    CAPO_SHIP_PROD_CALC: "Computing production…",
    CAPO_SHIP_METERS_REMAIN: "Remaining:",
    CAPO_SHIP_DELTA_7D: "Δ 7d:",
    CAPO_SHIP_PROD_NOT_AVAILABLE: "Production/INCA meters not available",
    CAPO_SHIP_INCA_LOADING: "INCA…",
    CAPO_SHIP_CABLES_LABEL: "cables",
    CAPO_SHIP_DB_ERROR:
      "DB error: unable to load ships list (view unavailable or missing permissions).",
  },
};

const KPI_OPPROD_FALLBACK_IT = {
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
  KPI_OPPROD_OPERATORS_HINT: "Seleziona operatori (multiselect) per calcolare i totali e la classifica.",
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
};

function safeStr(x) {
  return (x ?? "").toString();
}

function prettifyKey(key) {
  const s = safeStr(key).trim();
  if (!s) return "—";
  return s
    .replace(/[_]+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

function deepGet(obj, path) {
  const p = safeStr(path);
  if (!p) return undefined;
  if (!p.includes(".")) return obj ? obj[p] : undefined;
  return p.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function computeFallback(lang, key) {
  const k = safeStr(key).trim();
  if (!k) return "—";

  if (k.startsWith("KPI_OPPROD_")) {
    return KPI_OPPROD_FALLBACK_IT[k] || prettifyKey(k);
  }

  return prettifyKey(k);
}

const I18nContext = createContext(null);

export function I18nProvider({ children, defaultLang = "it", dictionaries = null }) {
  const external = dictionaries || {};
  const dicts = {
    it: { ...DICTS.it, ...(external.it || {}) },
    fr: { ...DICTS.fr, ...(external.fr || {}) },
    en: { ...DICTS.en, ...(external.en || {}) },
  };

  const [lang, setLangState] = useState(() => {
    const initial = getInitialLang();
    return LANGS.includes(initial) ? initial : (defaultLang || "it");
  });

  const setLang = useCallback((next) => {
    const v = LANGS.includes(next) ? next : "it";
    setLangState(v);
    setLangStorage(v);
  }, []);

  const t = useCallback(
    (key) => {
      const k = safeStr(key).trim();
      if (!k) return "—";

      const current = dicts?.[lang] || {};
      const it = dicts?.it || {};

      const v1 = deepGet(current, k);
      if (typeof v1 === "string" && v1.trim()) return v1;

      const v2 = deepGet(it, k);
      if (typeof v2 === "string" && v2.trim()) return v2;

      return computeFallback(lang, k);
    },
    [dicts, lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "it",
      setLang: () => {},
      t: (k) => computeFallback("it", k),
    };
  }
  return ctx;
}
