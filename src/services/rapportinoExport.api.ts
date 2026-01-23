// src/services/rapportinoExport.api.ts
import { supabase } from "../lib/supabaseClient";

export type ExportMode = "AUTO" | "DRAFT" | "OFFICIAL";

export type RapportinoExportResult = {
  ok: true;
  reused: boolean;
  core_file_id: string;
  version_num: number | null;
  sha256: string | null;
  claim_id: string;
  run_id?: string | null;
  download_url: string | null;
  storage_bucket: string;
  storage_path: string;
  is_official?: boolean;
};

export async function exportRapportinoPdf(params: {
  rapportinoId: string;
  mode?: ExportMode;
  force?: boolean;
}): Promise<RapportinoExportResult> {
  const rapportinoId = String(params.rapportinoId || "").trim();
  const mode: ExportMode = (String(params.mode ?? "AUTO").toUpperCase() as ExportMode) || "AUTO";
  const force = Boolean(params.force);

  const { data, error } = await supabase.functions.invoke("rapportino-export-pdf", {
    body: {
      rapportino_id: rapportinoId,
      mode,
      force,
    },
  });

  if (error) {
    const msg = (error as any)?.message || String(error);
    throw new Error(msg);
  }

  const d = data as any;
  if (!d?.ok) {
    throw new Error(d?.error ? String(d.error) : "Export failed");
  }

  return d as RapportinoExportResult;
}
