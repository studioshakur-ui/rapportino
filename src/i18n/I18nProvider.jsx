// src/i18n/I18nProvider.jsx
import React, { useCallback, useMemo, useState } from "react";
import { CoreI18nContext, getInitialLang, setLangStorage, t as tRaw, useCoreI18n } from "./coreI18n";

/**
 * Provider I18n global
 * - it par défaut
 * - persistance localStorage "core-lang"
 * - exports: I18nProvider + useI18n (compat legacy) + useCoreI18n (si utilisé ailleurs)
 */
export function I18nProvider({ children }) {
  const [lang, _setLang] = useState(getInitialLang);

  const setLang = useCallback((next) => {
    const v = (next || "it").toLowerCase();
    _setLang(v);
    setLangStorage(v);
  }, []);

  const value = useMemo(() => {
    return {
      lang,
      setLang,
      t: (key) => tRaw(lang, key),
    };
  }, [lang, setLang]);

  return <CoreI18nContext.Provider value={value}>{children}</CoreI18nContext.Provider>;
}

/**
 * ✅ Hook attendu par LangSwitcher.jsx
 * Alias volontaire vers le hook canonique.
 */
export function useI18n() {
  return useCoreI18n();
}

/**
 * Optionnel: re-export pour usage direct.
 * (Si certains fichiers font: import { useCoreI18n } from "../i18n/I18nProvider")
 */
export { useCoreI18n };
