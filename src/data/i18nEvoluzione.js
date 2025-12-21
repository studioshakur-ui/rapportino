// src/data/i18nEvoluzione.js

export const SUPPORTED_LANGS = ["it", "fr", "en"];
export const DEFAULT_LANG = "it";
export const LANG_STORAGE_KEY = "core-lang";

export const I18N_EVOLUZIONE = {
  it: {
    pageKicker: "Evoluzione",
    pageTitle: "Versioni, decisioni e roadmap (CNCS)",
    pageSubtitle:
      "Riferimento unico per governare CORE, PERCORSO e AI-LAYER senza deriva di scope.",
    currentVersion: "Versione attuale",
    tabsAria: "Selettore versione",
    activeVersionTitleFallback: "Versione",
    statusLabel: "Stato",
    counters: "Contatori",
    entries: "Voci",
    critical: "Critico",
    db: "DB",
    journal: "Registro",
    journalSubtitle: "Voci ordinate per data decrescente.",
    empty: "Nessuna voce per questa versione.",
    note:
      "Nota CORE 1.0: registro statico (repo) per evitare dipendenze DB durante la fase bloccata.",
    language: "Lingua",
    scopeFrozenRule:
      "CORE 1.0 è bloccato: solo FIX / SECURITY / PERF / piccoli polish UI.",
  },
  fr: {
    pageKicker: "Suivi & Evoluzione",
    pageTitle: "Versions, décisions et roadmap (CNCS)",
    pageSubtitle:
      "Référence unique pour piloter CORE, PERCORSO et AI-LAYER sans dérive de scope.",
    currentVersion: "Version actuelle",
    tabsAria: "Sélecteur de version",
    activeVersionTitleFallback: "Version",
    statusLabel: "Statut",
    counters: "Compteurs",
    entries: "Entrées",
    critical: "Critique",
    db: "DB",
    journal: "Journal",
    journalSubtitle: "Entrées triées par date décroissante.",
    empty: "Aucune entrée pour cette version.",
    note:
      "Note CORE 1.0 : journal statique (repo) pour éviter toute dépendance DB pendant la phase gelée.",
    language: "Langue",
    scopeFrozenRule:
      "CORE 1.0 est gelé : uniquement FIX / SECURITY / PERF / petits polish UI.",
  },
  en: {
    pageKicker: "Tracking & Evolution",
    pageTitle: "Versions, decisions and roadmap (CNCS)",
    pageSubtitle:
      "Single source of truth to govern CORE, PERCORSO and AI-LAYER without scope drift.",
    currentVersion: "Current version",
    tabsAria: "Version selector",
    activeVersionTitleFallback: "Version",
    statusLabel: "Status",
    counters: "Counters",
    entries: "Entries",
    critical: "Critical",
    db: "DB",
    journal: "Log",
    journalSubtitle: "Entries sorted by descending date.",
    empty: "No entries for this version.",
    note:
      "CORE 1.0 note: static log (repo) to avoid DB dependencies during the frozen phase.",
    language: "Language",
    scopeFrozenRule:
      "CORE 1.0 is frozen: only FIX / SECURITY / PERF / minor UI polish.",
  },
};

export function normalizeLang(input) {
  const s = String(input || "").toLowerCase().trim();
  if (SUPPORTED_LANGS.includes(s)) return s;
  return DEFAULT_LANG;
}

export function getStoredLang() {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    return normalizeLang(v);
  } catch {
    return DEFAULT_LANG;
  }
}

export function storeLang(lang) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, normalizeLang(lang));
  } catch {}
}

export function t(lang) {
  const k = normalizeLang(lang);
  return I18N_EVOLUZIONE[k] || I18N_EVOLUZIONE[DEFAULT_LANG];
}
