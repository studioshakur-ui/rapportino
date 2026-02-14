import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // 🔒 CRITIQUE
    detectSessionInUrl: false,
    storageKey: "cncs-auth",
    storage: window.localStorage,
  },
});

/**
 * HARD RESET — utilisé UNIQUEMENT sur erreur refresh token
 */
export function resetSupabaseAuthStorage(opts?: { force?: boolean }) {
  try {
    if (opts?.force) {
      localStorage.removeItem("cncs-auth");
    }
  } catch {
    // silent
  }
}
