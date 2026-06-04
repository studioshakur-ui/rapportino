// src/core/supabase.ts
// Single canonical Supabase client for CORE COMMAND.
// Re-exported from the legacy lib path so every module imports from one place.
export { supabase, resetSupabaseAuthStorage } from "../lib/supabaseClient";
