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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "core-auth-v2",
    storage: typeof window !== "undefined" ? safeStorage() : undefined,
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

/**
 * Reset ciblé:
 * - Supabase v2: sb-<projectRef>-*
 * - CORE: core-auth-v2
 * Nettoie localStorage + sessionStorage (sans clear global)
 */
export function resetSupabaseAuthStorage() {
  try {
    const ref = getProjectRefFromUrl(supabaseUrl);

    const removed = [];

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
