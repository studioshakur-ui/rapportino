// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// IMPORTANT: keep auth storage scoped (avoid collisions if multiple apps share domain)
const STORAGE_KEY = "core.auth.v1";

/**
 * In production you might want to restrict destructive storage resets.
 * However, a forced reset is effectively a "hard logout" and is safe.
 */
function isAuthResetAllowed() {
  // Allow in dev by default
  if (import.meta.env.DEV) return true;

  // Optional env override for prod/staging
  const flag = String(import.meta.env.VITE_ALLOW_AUTH_RESET || "").toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Hard-clear Supabase auth storage (scoped).
 * - Use { force:true } to bypass environment gating.
 * - This is the canonical way to recover from "Invalid Refresh Token / Refresh Token Not Found".
 */
export function resetSupabaseAuthStorage(opts = {}) {
  const force = !!opts.force;

  if (!force && !isAuthResetAllowed()) {
    // Avoid breaking sessions unexpectedly in prod unless explicitly enabled
    console.warn("[Supabase] Auth storage reset blocked (set VITE_ALLOW_AUTH_RESET=true or use force:true).");
    return;
  }

  try {
    // LocalStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("[Supabase] localStorage removeItem warning:", e);
    }

    // SessionStorage (some setups use it)
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("[Supabase] sessionStorage removeItem warning:", e);
    }

    // Also clear legacy keys if you used them before (safe no-op if absent)
    try {
      localStorage.removeItem("supabase.auth.token");
    } catch {
      // ignore
    }

    console.info("[Supabase] Auth storage reset (scoped).");
  } catch (e) {
    console.error("[Supabase] resetSupabaseAuthStorage error:", e);
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
