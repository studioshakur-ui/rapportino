// /src/i18n/I18nProvider.jsx
//
// PATCH: safe translations fallback to avoid showing raw keys like "KPI_OPPROD_TABLE_INDEX".
// - If a translation key is missing, we return a human fallback (especially for KPI_OPPROD_*).
// - This prevents UI "looking broken" when some keys are not yet defined.
// - Does NOT change your existing dictionaries structure: it only adds a robust fallback layer.
//
// Notes:
// - If you already have dictionaries imported elsewhere, keep them: this provider supports external dictionaries.
// - If your project already had this file, replace it entirely with this version (full content).
//
// Behavior:
// - t(key): returns translation if found
// - else: returns a KPI_OPPROD_* Italian fallback if known
// - else: returns a prettified label (KEY_NAME -> "Key name") so UI stays readable

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// -------------------------------------------------------------------------------------
// 1) OPTIONAL: put your dictionaries here OR import them.
// If you already had dictionaries in another file, you can import them and plug into DICTS.
// The important part of this patch is the fallback logic in `t()`.
// -------------------------------------------------------------------------------------

const DICTS = {
  it: {
    // Keep your existing keys here if you want (optional).
  },
  fr: {
    // optional
  },
  en: {
    // optional
  },
};

// -------------------------------------------------------------------------------------
// 2) Domain-specific fallbacks for Operator Productivity KPI (Direzione / KPI Operatori)
// These are the keys we see in your screenshots.
// -------------------------------------------------------------------------------------

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

// -------------------------------------------------------------------------------------
// 3) Helpers
// -------------------------------------------------------------------------------------

function safeStr(x) {
  return (x ?? "").toString();
}

function prettifyKey(key) {
  // KEY_NAME_EXAMPLE -> "Key name example"
  const s = safeStr(key).trim();
  if (!s) return "—";
  return s
    .replace(/[_]+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

function deepGet(obj, path) {
  // supports dotted path keys if you use them, otherwise direct key lookup
  const p = safeStr(path);
  if (!p) return undefined;
  if (!p.includes(".")) return obj ? obj[p] : undefined;
  return p.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

function computeFallback(lang, key) {
  const k = safeStr(key).trim();
  if (!k) return "—";

  // KPI Operatori fallbacks (IT-first)
  if (k.startsWith("KPI_OPPROD_")) {
    // we return IT fallback even if lang != it, because it is better than raw keys
    return KPI_OPPROD_FALLBACK_IT[k] || prettifyKey(k);
  }

  // Generic fallback for anything else
  return prettifyKey(k);
}

// -------------------------------------------------------------------------------------
// 4) Context + Provider
// -------------------------------------------------------------------------------------

const I18nContext = createContext(null);

export function I18nProvider({ children, defaultLang = "it", dictionaries = null }) {
  // dictionaries param lets you keep your existing dicts elsewhere:
  // <I18nProvider dictionaries={{it: {...}, fr: {...}, en: {...}}} />
  const dicts = dictionaries || DICTS;

  const [lang, setLang] = useState(defaultLang);

  const t = useCallback(
    (key) => {
      const k = safeStr(key).trim();
      if (!k) return "—";

      const current = dicts?.[lang] || {};
      const it = dicts?.it || {};

      // Try current language
      const v1 = deepGet(current, k);
      if (typeof v1 === "string" && v1.trim()) return v1;

      // Try Italian as global fallback (project default)
      const v2 = deepGet(it, k);
      if (typeof v2 === "string" && v2.trim()) return v2;

      // Domain-specific / generic fallback
      return computeFallback(lang, k);
    },
    [dicts, lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Keep app resilient even if provider missing in some route
    return {
      lang: "it",
      setLang: () => {},
      t: (k) => computeFallback("it", k),
    };
  }
  return ctx;
}
