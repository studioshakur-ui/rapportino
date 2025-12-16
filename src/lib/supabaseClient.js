// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function safeStorage() {
  const memory = new Map();

  const memStore = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
    // utile pour debug/reset
    _keys: () => Array.from(memory.keys()),
  };

  try {
    const t = "__core_ls_test__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    try {
      const t = "__core_ss_test__";
      window.sessionStorage.setItem(t, "1");
      window.sessionStorage.removeItem(t);
      return window.sessionStorage;
    } catch {
      return memStore;
    }
  }
}

// IMPORTANT: on garde une référence au storage réellement utilisé par Supabase
export const authStorage = typeof window !== "undefined" ? safeStorage() : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "core-auth-v2",
    storage: authStorage,
  },
});

function getProjectRefFromUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname || "";
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

function scopedKeys(ref, key) {
  if (!key) return false;
  if (key === "core-auth-v2") return true;
  if (ref && key.startsWith(`sb-${ref}-`)) return true;
  if (key === "supabase.auth.token") return true;
  return false;
}

function isAuthResetAllowed() {
  try {
    const isDev = !!import.meta.env.DEV;
    if (isDev) return true;

    if (typeof window === "undefined") return false;

    if (window.__CORE_ALLOW_AUTH_RESET === true) return true;

    const sp = new URLSearchParams(window.location.search || "");
    if (sp.get("allowAuthReset") === "1") return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Reset ciblé :
 * - Nettoie TOUJOURS le storage réellement utilisé par Supabase (authStorage)
 * - Et en plus, par sécurité, scanne localStorage + sessionStorage
 */
export function resetSupabaseAuthStorage() {
  try {
    if (typeof window === "undefined") return;

    if (!isAuthResetAllowed()) {
      console.warn(
        "[Supabase] Reset auth storage BLOCKED (scoped) — set window.__CORE_ALLOW_AUTH_RESET=true or ?allowAuthReset=1 to enable."
      );
      return;
    }

    const ref = getProjectRefFromUrl(supabaseUrl);
    const removed = [];

    // 1) reset du storage utilisé par le client Supabase
    if (authStorage) {
      try {
        // localStorage / sessionStorage : Object.keys() marche
        // memStore : on expose _keys()
        const keys =
          typeof authStorage._keys === "function"
            ? authStorage._keys()
            : Object.keys(authStorage);

        keys.forEach((k) => {
          if (scopedKeys(ref, k)) {
            authStorage.removeItem(k);
            removed.push(`authStorage:${k}`);
          }
        });
      } catch (e) {
        console.warn("[Supabase] authStorage reset failed:", e);
      }
    }

    // 2) reset LS/SS (défense en profondeur)
    const ls = window.localStorage;
    const ss = window.sessionStorage;

    if (ls) {
      Object.keys(ls).forEach((k) => {
        if (scopedKeys(ref, k)) {
          ls.removeItem(k);
          removed.push(`local:${k}`);
        }
      });
    }

    if (ss) {
      Object.keys(ss).forEach((k) => {
        if (scopedKeys(ref, k)) {
          ss.removeItem(k);
          removed.push(`session:${k}`);
        }
      });
    }

    console.warn("[Supabase] Reset auth storage (scoped):", removed);
  } catch (e) {
    console.warn("[Supabase] Reset auth storage failed:", e);
  }
}
