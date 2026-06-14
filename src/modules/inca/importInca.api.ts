import { supabase } from "../../lib/supabaseClient";

export interface ActiveIncaHead {
  id: string;
  file_name: string;
  file_path: string;
  costr: string;
  commessa: string;
  project_code: string | null;
  ship_id: string;
  uploaded_at: string;
}

export interface IncaSyncSummary {
  total: number;
  counts?: Record<string, number>;
  diff?: {
    addedCount: number;
    removedCount: number;
    changedCount: number;
  };
  error?: string;
  detail?: string;
}

const INCA_STORAGE_BUCKET = "core-drive";

function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").trim() || "inca.xlsx";
}

export async function loadActiveIncaHead(): Promise<ActiveIncaHead | null> {
  const { data, error } = await supabase
    .from("inca_files")
    .select("id,file_name,file_path,costr,commessa,project_code,ship_id,uploaded_at")
    .eq("file_type", "XLSX")
    .is("previous_inca_file_id", null)
    .not("file_path", "is", null)
    .not("ship_id", "is", null)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.file_path || !data.costr || !data.commessa || !data.ship_id) return null;

  return {
    id: data.id,
    file_name: data.file_name,
    file_path: data.file_path,
    costr: data.costr,
    commessa: data.commessa,
    project_code: data.project_code,
    ship_id: data.ship_id,
    uploaded_at: data.uploaded_at,
  };
}

export function inferIncaBucket(activeHead: ActiveIncaHead): string {
  if (!activeHead.file_path.startsWith("inca/")) {
    throw new Error(`Percorso INCA inatteso: ${activeHead.file_path}`);
  }
  return INCA_STORAGE_BUCKET;
}

export function buildIncaUploadPath(activeHead: ActiveIncaHead, fileName: string): string {
  return `inca/${activeHead.costr}/${activeHead.commessa}/${todayKey()}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
}

export async function uploadIncaFile(bucket: string, path: string, file: File): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (error) throw error;
}

export async function syncIncaFile(activeHead: ActiveIncaHead, bucket: string, path: string, file: File): Promise<IncaSyncSummary> {
  const payload = {
    storage_bucket: bucket,
    storage_path: path,
    costr: activeHead.costr,
    commessa: activeHead.commessa,
    projectCode: activeHead.project_code ?? "",
    shipId: activeHead.ship_id,
    file_name: file.name,
  };

  const { data, error } = await supabase.functions.invoke<IncaSyncSummary>("inca-sync", { body: payload });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Risposta vuota da inca-sync");
  if (data?.error) throw new Error(data.detail ? `${data.error} — ${data.detail}` : data.error);
  return data;
}
