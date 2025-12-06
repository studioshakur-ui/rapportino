// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Le URL e la chiave anonima arrivano dalle variabili d’ambiente Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Piccolo controllo in console per debug se manca qualcosa
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase non è configurato correttamente. " +
      "Controlla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nelle variabili d'ambiente."
  );
}

// 🔧 Helper: pulizia delle chiavi di sessione Supabase nel browser
// Utile quando, dopo tanti login/logout nello stesso browser, il client si "incastra".
export function resetSupabaseAuthStorage() {
  if (typeof window === "undefined") return;

  try {
    const ls = window.localStorage;
    const keys = Object.keys(ls);

    // Le chiavi Supabase iniziano in genere per "sb-"
    const supabaseKeys = keys.filter(
      (k) => k.startsWith("sb-") || k.toLowerCase().includes("supabase")
    );

    if (supabaseKeys.length > 0) {
      console.warn("[Supabase] Reset auth storage:", supabaseKeys);
      supabaseKeys.forEach((k) => ls.removeItem(k));
    }
  } catch (err) {
    console.error("[Supabase] Errore nel reset dello storage auth:", err);
  }
}

// Client Supabase usato in tutta l’app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
