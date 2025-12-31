// src/i18n/I18nProvider.jsx
// Single i18n provider for CORE (IT default + FR/EN).
//
// Canonical behavior:
// - default language: IT
// - persistence: localStorage "core-lang"
// - t(key):
//   1) current lang
//   2) IT fallback
//   3) prettified fallback (never show raw keys in UI)

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { dictionaries } from "./dictionaries";

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
  const p = safeStr(path).trim();
  if (!p) return undefined;
  if (!p.includes(".")) return obj ? obj[p] : undefined;
  return p.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}

const I18nContext = createContext(null);

export function I18nProvider({ children, defaultLang }) {
  const initial = defaultLang || getInitialLang();
  const [lang, _setLang] = useState(initial);

  const setLang = useCallback((next) => {
    const n = safeStr(next).trim().toLowerCase();
    const normalized = LANGS.includes(n) ? n : "it";
    _setLang(normalized);
    setLangStorage(normalized);
  }, []);

  const t = useCallback(
    (key) => {
      const k = safeStr(key).trim();
      if (!k) return "—";

      const current = dictionaries?.[lang] || {};
      const it = dictionaries?.it || {};

      const v1 = deepGet(current, k);
      if (typeof v1 === "string" && v1.trim()) return v1;

      const v2 = deepGet(it, k);
      if (typeof v2 === "string" && v2.trim()) return v2;

      return prettifyKey(k);
    },
    [lang]
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
      t: (k) => prettifyKey(k),
    };
  }
  return ctx;
}
