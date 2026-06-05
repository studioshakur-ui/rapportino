import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// True seulement si les deux variables VITE_* sont injectées au build.
// Permet d'afficher un écran de config clair au lieu d'un écran blanc
// (createClient(undefined, …) jetterait « supabaseUrl is required » au chargement).
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!supabaseConfigured) {
  console.error(
    "Config Supabase manquante : définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY " +
      "dans les variables d'environnement du build (ex: Vercel → Settings → Environment Variables)."
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? "http://localhost:54321",
  SUPABASE_ANON_KEY ?? "anon-key-missing",
  {
    auth: {
      persistSession: true,
      // CNCS-grade: MUST keep Admin sessions stable.
      // If disabled, JWT expiry produces DB-side auth.uid() = null → require_admin() fails (28000).
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "cncs-auth",
      storage: window.localStorage,
    },
  }
);

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