// src/i18n/CoreI18n.ts
// Canonical i18n entrypoint for CORE.
//
// IMPORTANT:
// - Netlify runs on Linux (case-sensitive FS). Avoid CoreI18n/coreI18n circular re-exports.
// - This file is the single source of truth. `coreI18n.ts` is only a compatibility shim.

import type { Lang } from "./I18nProvider";
import { I18nProvider, LANGS, getInitialLang, setLangStorage, useI18n } from "./I18nProvider";
import { dictionaries } from "./dictionaries";

export type { Lang };

export { I18nProvider, LANGS, getInitialLang, setLangStorage, useI18n };

// Back-compat hook name used across Direzione/KPI components.
export const useCoreI18n = useI18n;

/**
 * Back-compat stateless translator used by some Admin pages.
 *
 * Contract:
 * - t(lang, key, fallback?) -> string
 * - lang can be 'it' | 'fr' | 'en' or any string (defaults to 'it')
 */
export function t(lang: Lang | string, key: string, fallback = "—"): string {
  const l = (LANGS as readonly string[]).includes(String(lang)) ? (String(lang) as Lang) : ("it" as Lang);
  const k = String(key || "").trim();
  if (!k) return fallback;

  const v = (dictionaries as Record<Lang, Record<string, string>>)?.[l]?.[k];
  if (typeof v === "string" && v.trim()) return v;

  const vIt = (dictionaries as Record<Lang, Record<string, string>>)?.it?.[k];
  if (typeof vIt === "string" && vIt.trim()) return vIt;

  return fallback;
}
