// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string {
  const v = import.meta.env[name] as string | undefined;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const SUPABASE_URL: string = requiredEnv("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY: string = requiredEnv("VITE_SUPABASE_ANON_KEY");

// IMPORTANT: keep auth storage scoped (avoid collisions if multiple apps share domain)
const STORAGE_KEY = "core.auth.v1";

type ResetAuthStorageOptions = {
  force?: boolean;
};

function isAuthResetAllowed(): boolean {
  if (import.meta.env.DEV) return true;
  const flag = String(import.meta.env.VITE_ALLOW_AUTH_RESET || "").toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function removeKeySafe(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Hard-clear Supabase auth storage (scoped).
 * Canon recovery for "Invalid Refresh Token / Refresh Token Not Found".
 */
export function resetSupabaseAuthStorage(opts: ResetAuthStorageOptions = {}): void {
  const force = !!opts.force;

  if (!force && !isAuthResetAllowed()) {
    console.warn("[Supabase] Auth storage reset blocked (set VITE_ALLOW_AUTH_RESET=true or use force:true).");
    return;
  }

  try {
    removeKeySafe(window.localStorage, STORAGE_KEY);
    removeKeySafe(window.sessionStorage, STORAGE_KEY);

    // legacy keys (safe no-op)
    removeKeySafe(window.localStorage, "supabase.auth.token");
    removeKeySafe(window.sessionStorage, "supabase.auth.token");

    console.info("[Supabase] Auth storage reset (scoped).");
  } catch (e) {
    console.error("[Supabase] resetSupabaseAuthStorage error:", e);
  }
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Schema-scoped helpers (non-breaking, optional usage).
 * Use dbPublic for canonical writes/reads; dbArchive for archive-only reads.
 */
export const dbPublic = supabase.schema("public");
export const dbArchive = supabase.schema("archive");
