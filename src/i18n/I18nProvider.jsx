// src/i18n/I18nProvider.jsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { dict } from "./dict";

const I18nContext = createContext(null);

const STORAGE_KEY = "core-lang";
const SUPPORTED = ["it", "fr", "en"];

function getInitialLang() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return "it"; // par défaut IT comme tu l’as décidé
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = (next) => {
    const v = SUPPORTED.includes(next) ? next : "it";
    setLangState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
  };

  const t = (key) => {
    const table = dict[lang] || dict.it;
    return table[key] || dict.it[key] || key;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      supportedLangs: SUPPORTED,
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
