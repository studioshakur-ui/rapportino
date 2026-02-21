// src/theme/ThemeProvider.tsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

import {
  applyTheme,
  getSystemTheme,
  persistTheme,
  readStoredTheme,
  ThemeChoice,
  ThemeEffective,
  ThemeMode,
  ThemeState,
  THEME_STORAGE_KEY,
} from "./theme-utils";

export type ThemeContextValue = {
  mode: ThemeMode;
  theme: ThemeChoice;
  effective: ThemeEffective;
  setAuto: () => void;
  setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, setState] = useState<ThemeState>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ThemeEffective>(() => getSystemTheme());

  const effective: ThemeEffective = useMemo(() => {
    return state.mode === "auto" ? systemTheme : state.theme;
  }, [state.mode, state.theme, systemTheme]);

  // Apply to <html data-theme="...">
  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  // Persist to localStorage
  useEffect(() => {
    persistTheme(state);
  }, [state]);

  // Keep system theme in sync when in auto
  useEffect(() => {
    if (state.mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemTheme(getSystemTheme());

    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // Legacy Safari
    // @ts-expect-error legacy API
    mq.addListener(onChange);
    // @ts-expect-error legacy API
    return () => mq.removeListener(onChange);
  }, [state.mode]);

  // Cross-tab sync (and defensive: if another part writes to storage)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      // Re-read from storage and update state.
      setState(readStoredTheme());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAuto = useCallback((): void => {
    setState({ mode: "auto", theme: getSystemTheme() });
  }, []);

  const setTheme = useCallback((theme: ThemeChoice): void => {
    setState({ mode: "manual", theme });
  }, []);

  const value: ThemeContextValue = useMemo(
    () => ({
      mode: state.mode,
      theme: state.theme,
      effective,
      setAuto,
      setTheme,
    }),
    [state.mode, state.theme, effective, setAuto, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}