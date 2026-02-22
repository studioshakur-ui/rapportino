import { supabase } from "../../lib/supabaseClient";

export type IncaUploadedFileRef = {
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

const DEFAULT_INCA_BUCKET = "core-drive";

function sanitizeSegment(input: string): string {
  return String(input || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "na";
}

function sanitizeFilename(input: string): string {
  const clean = String(input || "inca.xlsx")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "inca.xlsx";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function uploadIncaFileToStorage(args: {
  file: File;
  costr: string;
  commessa: string;
  bucket?: string;
}): Promise<IncaUploadedFileRef> {
  const file = args.file;
  if (!file) throw new Error("File mancante.");

  const bucket = String(args.bucket || DEFAULT_INCA_BUCKET).trim() || DEFAULT_INCA_BUCKET;
  const costr = sanitizeSegment(args.costr || "");
  const commessa = sanitizeSegment(args.commessa || "");
  const date = todayIsoDate();
  const safeName = sanitizeFilename(file.name || "inca.xlsx");
  const uid = crypto.randomUUID();
  const path = `inca/${costr}/${commessa}/${date}/${uid}-${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (error) {
    throw new Error(`Upload INCA fallito: ${error.message}`);
  }

  return {
    bucket,
    path,
    fileName: safeName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: Number(file.size || 0),
  };
}
