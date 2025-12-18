// /src/services/rapportiniArchive.api.js
import { supabase } from "../lib/supabaseClient";

/**
 * Storico Rapportini v1: archive_rapportini_v1
 * Nota: V1 legacy read-only. On garde limit 2000 pour cockpit (perf).
 */
export async function loadRapportiniArchiveV1({ capoId = null, limit = 2000 } = {}) {
  let query = supabase
    .from("archive_rapportini_v1")
    .select("*")
    .order("data", { ascending: false })
    .limit(limit);

  if (capoId) query = query.eq("capo_id", capoId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
