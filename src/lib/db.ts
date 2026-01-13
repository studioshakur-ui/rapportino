// src/lib/db.ts
import { supabase } from "./supabaseClient";

export const dbPublic = supabase.schema("public");
export const dbArchive = supabase.schema("archive");
