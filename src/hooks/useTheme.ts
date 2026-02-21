// src/hooks/useTheme.ts
import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "auto" | "manual";
export type ThemeChoice = "dark" | "light";
export type ThemeEffective = ThemeChoice;

type ThemeState = {
  mode: ThemeMode;
  theme: ThemeChoice;
};

const STORAGE_KEY = "core-theme";

function getSystemTheme(): ThemeEffective {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStoredTheme(): ThemeState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "auto", theme: getSystemTheme() };

    // Legacy format: "dark" | "light" | "auto"
    if (raw === "dark" || raw === "light") return { mode: "manual", theme: raw };
    if (raw === "auto") return { mode: "auto", theme: getSystemTheme() };

    // JSON format: { mode, theme }
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.mode === "auto" || parsed.mode === "manual")) {
      const t = parsed.theme === "light" ? "light" : "dark";
      return { mode: parsed.mode, theme: t };
    }
  } catch {
    // ignore
  }
  return { mode: "auto", theme: getSystemTheme() };
}

function persistTheme(state: ThemeState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function applyTheme(effective: ThemeEffective): void {
  document.documentElement.setAttribute("data-theme", effective);
}

export function initThemeFromStorage(): void {
  try {
    const state = readStoredTheme();
    const effective = state.mode === "auto" ? getSystemTheme() : state.theme;
    applyTheme(effective);
  } catch {
    // ignore
  }
}

export function useTheme() {
  const [state, setState] = useState<ThemeState>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ThemeEffective>(() => getSystemTheme());

  const effective: ThemeEffective = useMemo(() => {
    return state.mode === "auto" ? systemTheme : state.theme;
  }, [state.mode, state.theme, systemTheme]);

  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  useEffect(() => {
    persistTheme(state);
  }, [state]);

  useEffect(() => {
    if (state.mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemTheme(getSystemTheme());

    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [state.mode]);

  const setAuto = (): void => {
    setState({ mode: "auto", theme: getSystemTheme() });
  };

  const setTheme = (theme: ThemeChoice): void => {
    setState({ mode: "manual", theme });
  };

  return {
    mode: state.mode,
    theme: state.theme,
    effective,
    setAuto,
    setTheme,
  };
}
