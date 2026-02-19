// src/i18n/coreI18n.ts
//
// CORE canonical i18n entrypoint.
//
// In this repo, the real implementation is in:
// - I18nProvider.tsx (react context + useI18n)
// - dictionaries.ts (main dictionaries for app strings)
// - dict.ts (login-specific dictionary)
//
// IMPORTANT:
// - Netlify (Linux) is case-sensitive.
// - Avoid ANY circular re-export between CoreI18n.ts and coreI18n.ts.

import type { Lang as LangT } from "./I18nProvider";
import { dictionaries } from "./dictionaries";

export type { Lang } from "./I18nProvider";

export {
  I18nProvider,
  LANGS,
  getInitialLang,
  setLangStorage,
  useI18n,
} from "./I18nProvider";

// Back-compat hook name expected by Direzione/KPI components
// (must return the same shape as useI18n()).
export { useI18n as useCoreI18n } from "./I18nProvider";

// Re-export dictionaries for places that need direct access (rare, but sometimes useful)
export { dictionaries };

// Re-export login dictionary (if some pages import it through CoreI18n)
export { dict as loginDict } from "./dict";
export type { LoginKey } from "./dict";

/**
 * Stateless translator helper.
 * Useful in non-react contexts (rare) or legacy admin pages.
 *
 * Notes:
 * - It uses dictionaries.ts as source of truth.
 * - It falls back to Italian if key missing in target language.
 */
export function t(lang: LangT | string, key: string, fallback = "—"): string {
  const safeLang = (["it", "fr", "en"] as const).includes(lang as any)
    ? (lang as LangT)
    : ("it" as LangT);
  const dictByLang = dictionaries as Record<LangT, Record<string, string>>;

  const k = String(key || "").trim();
  if (!k) return fallback;

  const fromLang = dictByLang?.[safeLang]?.[k];
  if (typeof fromLang === "string" && fromLang.trim()) return fromLang;

  const fromIt = dictByLang?.it?.[k];
  if (typeof fromIt === "string" && fromIt.trim()) return fromIt;

  return fallback;
}
