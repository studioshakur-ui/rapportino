// src/services/rapportinoExport.api.ts
import { supabase } from "../lib/supabaseClient";

export type RapportinoExportResult = {
  ok: true;
  file_id: string;
  bucket: string;
  storage_path: string;
  filename: string;
  download_url: string | null;
};

function normalizeEdgeError(err: unknown): Error {
  if (!err) return new Error("Errore sconosciuto.");
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(String(err));
  }
}

export async function exportRapportinoPdf(params: {
  rapportinoId: string;
  origine?: "CAPO" | "UFFICIO" | "DIREZIONE" | "SYSTEM" | "ADMIN";
}): Promise<RapportinoExportResult> {
  const rapportinoId = String(params.rapportinoId || "").trim();
  if (!rapportinoId) throw new Error("rapportinoId mancante");

  const { data, error } = await supabase.functions.invoke("rapportino-export-pdf", {
    body: {
      rapportino_id: rapportinoId,
      origine: params.origine || "CAPO",
    },
  });

  if (error) throw normalizeEdgeError(error);
  if (!data?.ok) throw new Error(data?.error || "Export PDF fallito");

  return data as RapportinoExportResult;
}
