import { createClient } from "@supabase/supabase-js";

// Valeurs publiques par défaut (déjà présentes dans .env.example, commitées).
// La clé `anon` est publique par design (rôle anon, protégée par RLS) — elle
// est destinée au bundle client. Les variables VITE_* gardent la priorité si
// elles sont injectées au build (Vercel / .env local) ; sinon on retombe sur
// ces défauts pour que le build soit toujours fonctionnel (pas d'écran blanc).
const DEFAULT_SUPABASE_URL = "https://hzbiqnupswoqnyztxpvr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YmlxbnVwc3dvcW55enR4cHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4Nzk0NDQsImV4cCI6MjA3OTQ1NTQ0NH0.HoE04xO5M-u00cXAgXCsTSeZomddcEsV8RRei96wRM4";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE_ANON_KEY;

if (import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL) {
  console.warn(`[supabase] VITE_SUPABASE_URL non défini en dev → cible la PROD par défaut (${SUPABASE_URL})`);
}

// Toujours configuré : on dispose au minimum des défauts publics ci-dessus.
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    // CNCS-grade: MUST keep Admin sessions stable.
    // If disabled, JWT expiry produces DB-side auth.uid() = null → require_admin() fails (28000).
    autoRefreshToken: true,
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
