// src/hooks/useCoreDriveEvents.js
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

async function fetchCoreDriveEvents({ coreFileId, limit = 25 }) {
  if (!coreFileId) return [];

  const { data, error } = await supabase
    .from("core_drive_events")
    .select(
      "id, created_at, event_type, actor_profile_id, actor_role, cantiere_code, commessa, costr, ship_id, core_file_id, rapportino_id, inca_file_id, payload"
    )
    .eq("core_file_id", coreFileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching core_drive_events", error);
    throw error;
  }

  return data ?? [];
}

export function useCoreDriveEvents(coreFileId, { limit = 25 } = {}) {
  return useQuery({
    queryKey: ["core_drive_events", coreFileId, limit],
    queryFn: () => fetchCoreDriveEvents({ coreFileId, limit }),
    enabled: !!coreFileId,
    staleTime: 30_000,
  });
}
