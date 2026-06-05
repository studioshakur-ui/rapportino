// src/supabase.ts — client Supabase avec service role (server-side only)
import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "./config.js";

// Service role = bypasse RLS — uniquement côté bridge, jamais exposé client
export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
