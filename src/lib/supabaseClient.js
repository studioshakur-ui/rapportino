// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getProjectRefFromUrl(url) {
  try {
    const u = new URL(url);
    // ex: https://<ref>.supabase.co
    const host = u.hostname || "";
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

// Reset ciblé (projet courant) pour éviter de casser d'autres apps Supabase du navigateur.
export function resetSupabaseAuthStorage() {
  try {
    const ref = getProjectRefFromUrl(supabaseUrl);
    const keys = Object.keys(window.localStorage || {});

    const toRemove = keys.filter((k) => {
      if (!k) return false;

      // Clés Supabase v2: sb-<projectRef>-auth-token (+ variantes)
      if (ref && k.startsWith(`sb-${ref}-`)) return true;

      // Fallback (anciens patterns / extensions) mais on reste prudent
      if (k === "supabase.auth.token") return true;

      return false;
    });

    toRemove.forEach((k) => window.localStorage.removeItem(k));

    console.warn("[Supabase] Reset auth storage (scoped):", toRemove);
  } catch (e) {
    console.warn("[Supabase] Reset auth storage failed:", e);
  }
}
