// src/hooks/useCoreDriveEvents.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

export type CoreDriveEventRow = {
  id: string;
  created_at: string;
  event_type: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  cantiere_code: string | null;
  commessa: string | null;
  costr: string | null;
  ship_id: string | null;
  core_file_id: string | null;
  rapportino_id: string | null;
  inca_file_id: string | null;
  payload: Record<string, unknown> | null;
};

async function fetchCoreDriveEvents({ coreFileId, limit = 25 }: { coreFileId: string; limit?: number }): Promise<CoreDriveEventRow[]> {
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

  return (data ?? []) as CoreDriveEventRow[];
}

export function useCoreDriveEvents(coreFileId?: string | null, { limit = 25 }: { limit?: number } = {}) {
  return useQuery({
    queryKey: ["core_drive_events", coreFileId, limit],
    queryFn: () => fetchCoreDriveEvents({ coreFileId: String(coreFileId), limit }),
    enabled: !!coreFileId,
    staleTime: 30_000,
  });
}
