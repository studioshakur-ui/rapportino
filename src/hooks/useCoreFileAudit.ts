// src/hooks/useCoreFileAudit.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

export type CoreFileAuditRow = Record<string, unknown> & {
  id?: string;
  core_file_id?: string;
  performed_at?: string;
};

async function fetchCoreFileAudit(coreFileId: string): Promise<CoreFileAuditRow[]> {
  if (!coreFileId) return [];

  const { data, error } = await supabase
    .from("core_file_audit")
    .select("*")
    .eq("core_file_id", coreFileId)
    .order("performed_at", { ascending: false });

  if (error) {
    console.error("Error fetching core_file_audit", error);
    throw error;
  }

  return (data ?? []) as CoreFileAuditRow[];
}

export function useCoreFileAudit(coreFileId?: string | null) {
  return useQuery({
    queryKey: ["core_file_audit", coreFileId],
    queryFn: () => fetchCoreFileAudit(String(coreFileId)),
    enabled: !!coreFileId,
    staleTime: 60_000,
  });
}
