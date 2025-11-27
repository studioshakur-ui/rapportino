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

// Client Supabase usato in tutta l’app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
