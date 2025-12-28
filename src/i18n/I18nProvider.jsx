// src/i18n/I18nProvider.jsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LANGS, createTranslator, getInitialLang, setLangStorage } from "./coreI18n";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  const setLanguage = useCallback((next) => {
    const v = (next || "it").toString().toLowerCase().trim();
    const safe = LANGS.includes(v) ? v : "it";
    setLang(safe);
    setLangStorage(safe);
  }, []);

  const tr = useMemo(() => {
    return createTranslator({ lang, warnMissing: true });
  }, [lang]);

  const value = useMemo(() => {
    return {
      lang,
      setLang: setLanguage,
      t: (key, params) => tr(key, params),
      langs: LANGS,
    };
  }, [lang, setLanguage, tr]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "it",
      setLang: () => {},
      langs: LANGS,
      t: (k) => k,
    };
  }
  return ctx;
}
