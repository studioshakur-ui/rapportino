import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Options = {
  defaultValue?: string;
  /**
   * When true (default), writes to URL with replace=true to avoid history noise.
   */
  replace?: boolean;
};

function safeGetSession(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeSetSession(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Persistent param state:
 * - source of truth = internal state
 * - initial load priority: URL -> sessionStorage -> defaultValue
 * - sync: state -> sessionStorage + URL
 * - sync: URL (back/forward) -> state + sessionStorage
 *
 * IMPORTANT: returned setter is stable (useCallback) to avoid effect loops.
 */
export function usePersistedSearchParam(
  paramKey: string,
  storageKey: string,
  options: Options = {}
): readonly [string, (next: string) => void] {
  const { defaultValue = "", replace = true } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Avoid using the URLSearchParams object identity as a dependency elsewhere.
  // We only depend on its string representation.
  const searchString = useMemo(() => searchParams.toString(), [searchParams]);

  const urlValue = useMemo(() => {
    const sp = new URLSearchParams(searchString);
    return (sp.get(paramKey) ?? "").trim();
  }, [paramKey, searchString]);

  const [value, setValue] = useState<string>(() => {
    return urlValue || safeGetSession(storageKey) || defaultValue;
  });

  // Stable setter exposed to consumers
  const setPersistedValue = useCallback((next: string) => {
    setValue((prev) => {
      const n = (next ?? "").trim();
      return prev === n ? prev : n;
    });
  }, []);

  // URL -> state (back/forward)
  useEffect(() => {
    if (!urlValue) return;
    setValue((prev) => (prev === urlValue ? prev : urlValue));
    safeSetSession(storageKey, urlValue);
  }, [storageKey, urlValue]);

  // state -> session + URL
  useEffect(() => {
    safeSetSession(storageKey, value);

    const sp = new URLSearchParams(searchString);
    const current = (sp.get(paramKey) ?? "").trim();

    if (value === current) return;

    if (value) sp.set(paramKey, value);
    else sp.delete(paramKey);

    setSearchParams(sp, { replace });
  }, [paramKey, replace, searchString, setSearchParams, storageKey, value]);

  return [value, setPersistedValue] as const;
}
