// src/hooks/useTheme.ts
// NOTE: Global theme store (single source of truth) via ThemeProvider.

export type { ThemeChoice, ThemeEffective, ThemeMode } from "../theme/theme-utils";
export { initThemeFromStorage } from "../theme/theme-utils";

import { useThemeContext } from "../theme/ThemeProvider";

/**
 * Public hook used across the app (Shells, switcher, etc.).
 * Guaranteed to be consistent because ThemeProvider is global.
 */
export function useTheme() {
  return useThemeContext();
}