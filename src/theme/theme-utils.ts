// src/theme/theme-utils.ts

export type ThemeMode = "auto" | "manual";
export type ThemeChoice = "dark" | "light";
export type ThemeEffective = ThemeChoice;

export type ThemeState = {
  mode: ThemeMode;
  theme: ThemeChoice;
};

export const THEME_STORAGE_KEY = "core-theme";

export function getSystemTheme(): ThemeEffective {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function readStoredTheme(): ThemeState {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { mode: "auto", theme: getSystemTheme() };

    // Legacy format: "dark" | "light" | "auto"
    if (raw === "dark" || raw === "light") return { mode: "manual", theme: raw };
    if (raw === "auto") return { mode: "auto", theme: getSystemTheme() };

    // JSON format: { mode, theme }
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.mode === "auto" || parsed.mode === "manual")) {
      const t: ThemeChoice = parsed.theme === "light" ? "light" : "dark";
      return { mode: parsed.mode, theme: t };
    }
  } catch {
    // ignore
  }
  return { mode: "auto", theme: getSystemTheme() };
}

export function persistTheme(state: ThemeState): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function applyTheme(effective: ThemeEffective): void {
  document.documentElement.setAttribute("data-theme", effective);
}

/**
 * Called once before React mounts, to avoid theme "flash".
 */
export function initThemeFromStorage(): void {
  try {
    const state = readStoredTheme();
    const effective = state.mode === "auto" ? getSystemTheme() : state.theme;
    applyTheme(effective);
  } catch {
    // ignore
  }
}