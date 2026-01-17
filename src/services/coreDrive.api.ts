// /src/services/coreDrive.api.ts
import { supabase } from "../lib/supabaseClient";

const CORE_DRIVE_BUCKET = "core-drive";

export type CoreFileCursor = {
  created_at: string;
  id: string;
};

export type CoreFileFilters = {
  cantiere?: string;
  categoria?: string;
  commessa?: string;
  origine?: string;
  stato_doc?: string;
  mimeGroup?: string;
  text?: string;
  dateFrom?: string;
  dateTo?: string;
  includeDeleted?: boolean;
};

export type UploadCoreFileMeta = {
  cantiere: string;
  categoria: string;
  commessa?: string | null;
  origine?: string | null;
  stato_doc?: string | null;
  rapportino_id?: string | null;
  inca_file_id?: string | null;
  inca_cavo_id?: string | null;
  operator_id?: string | null;
  note?: string | null;
};

export type CoreFileRecord = {
  id: string;
  created_at: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  cantiere: string;
  commessa: string | null;
  categoria: string;
  origine: string;
  stato_doc: string;
  storage_path: string;
  storage_bucket: string;
  note: string | null;
  rapportino_id: string | null;
  inca_file_id: string | null;
  inca_cavo_id: string | null;
  operator_id: string | null;
  frozen_at: string | null;
  deleted_at: string | null;
};

function safeTerm(input: unknown): string {
  const s = (input || "").toString().trim();
  return s.replace(/[,%]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMimeGroup(mimeGroup: unknown): string {
  const g = (mimeGroup || "").toString().toUpperCase().trim();
  if (!g) return "";
  if (g === "PDF") return "PDF";
  if (g === "IMG" || g === "IMAGE") return "IMG";
  if (g === "XLS" || g === "XLSX" || g === "EXCEL") return "XLSX";
  return g;
}

/**
 * Append-only registry: liste des events CORE Drive pour un fichier.
 */
export async function listCoreDriveEvents({ fileId, limit = 200 }: { fileId: string; limit?: number }) {
  if (!fileId) return [];
  const { data, error } = await supabase
    .from("core_drive_events")
    .select("id, created_at, created_by, file_id, event_type, payload, note")
    .eq("file_id", fileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * RPC: enregistre un event UPLOAD (optionnel mais recommandé).
 * Ne casse pas le flux si la RPC échoue (on laisse au caller gérer).
 */
export async function emitUploadEvent({ fileId, payload = {} }: { fileId: string; payload?: Record<string, unknown> }) {
  if (!fileId) throw new Error("Missing fileId");
  const { data, error } = await supabase.rpc("core_drive_emit_upload_event", {
    p_file_id: fileId,
    p_payload: payload || {},
  });
  if (error) throw error;
  return data; // event_id
}

/**
 * RPC: soft delete (DB only) + event append-only.
 * IMPORTANT: aucune suppression Storage.
 */
export async function softDeleteCoreFile({ fileId, reason = null }: { fileId: string; reason?: string | null }) {
  if (!fileId) throw new Error("Missing fileId");
  const { data, error } = await supabase.rpc("core_drive_soft_delete_file", {
    p_file_id: fileId,
    p_reason: reason,
  });
  if (error) throw error;
  return data; // event_id
}

/**
 * RPC: freeze inviolable (DB) + event append-only.
 */
export async function freezeCoreFile({ fileId, reason = null }: { fileId: string; reason?: string | null }) {
  if (!fileId) throw new Error("Missing fileId");
  const { data, error } = await supabase.rpc("core_drive_freeze_file", {
    p_file_id: fileId,
    p_reason: reason,
  });
  if (error) throw error;
  return data; // event_id
}

export async function uploadCoreFile({ file, meta }: { file: File; meta: UploadCoreFileMeta }): Promise<CoreFileRecord> {
  if (!file) throw new Error("Missing file");
  if (!meta?.cantiere) throw new Error("Missing meta.cantiere");
  if (!meta?.categoria) throw new Error("Missing meta.categoria");

  // Resolve current user (created_by is NOT NULL in core_files)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    throw userErr || new Error("Invalid session (auth.getUser failed)");
  }
  const createdBy = userData.user.id;

  const originalName = file.name || "documento";
  const parts = originalName.split(".");
  const fileExt = parts.length > 1 ? parts.pop() : "";
  const safeExt = (fileExt || "").toLowerCase();

  const fileName = safeExt ? `${crypto.randomUUID()}.${safeExt}` : `${crypto.randomUUID()}`;

  const storagePath = `${meta.cantiere}/${meta.categoria}/${fileName}`;

  // 1) Upload Storage (AUCUN remove dans ce module)
  const { error: uploadError } = await supabase.storage
    .from(CORE_DRIVE_BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  // 2) Insert metadata DB (core_files)
  const { data, error } = await supabase
    .from("core_files")
    .insert([
      {
        storage_bucket: CORE_DRIVE_BUCKET,
        created_by: createdBy,
        storage_path: storagePath,
        filename: originalName,
        mime_type: file.type || null,
        size_bytes: file.size || null,

        cantiere: meta.cantiere,
        commessa: meta.commessa || null,
        categoria: meta.categoria,
        origine: meta.origine || "UFFICIO",
        stato_doc: meta.stato_doc || "BOZZA",

        rapportino_id: meta.rapportino_id || null,
        inca_file_id: meta.inca_file_id || null,
        inca_cavo_id: meta.inca_cavo_id || null,
        operator_id: meta.operator_id || null,

        note: meta.note || null,
      },
    ])
    .select(
      "id, created_at, filename, mime_type, size_bytes, cantiere, commessa, categoria, origine, stato_doc, storage_path, storage_bucket, note, rapportino_id, inca_file_id, inca_cavo_id, operator_id, frozen_at, deleted_at"
    )
    .single();

  if (error) throw error;

  // 3) Event registry: UPLOAD (best-effort, ne doit pas casser l'upload)
  try {
    await emitUploadEvent({
      fileId: data.id,
      payload: {
        bucket: CORE_DRIVE_BUCKET,
        storage_path: storagePath,
        filename: originalName,
        mime_type: file.type || null,
        size_bytes: file.size || null,
        meta: {
          cantiere: meta.cantiere,
          commessa: meta.commessa || null,
          categoria: meta.categoria,
          origine: meta.origine || "UFFICIO",
          stato_doc: meta.stato_doc || "BOZZA",
        },
      },
    });
  } catch (e) {
    // Naval-grade: ne jamais bloquer l’upload si le registre est momentanément indisponible.
    console.warn("[CORE Drive] emit upload event failed:", e);
  }

  return data as CoreFileRecord;
}

export async function listCoreFiles({
  filters = {},
  pageSize = 60,
  cursor = null,
}: {
  filters?: CoreFileFilters;
  pageSize?: number;
  cursor?: CoreFileCursor | null;
}): Promise<{ items: CoreFileRecord[]; nextCursor: CoreFileCursor | null; hasMore: boolean }> {
  const { cantiere, categoria, commessa, origine, stato_doc, mimeGroup, text, dateFrom, dateTo, includeDeleted } =
    filters || {};

  let query = supabase
    .from("core_files")
    .select(
      "id, created_at, filename, mime_type, size_bytes, cantiere, commessa, categoria, origine, stato_doc, storage_path, storage_bucket, note, rapportino_id, inca_file_id, inca_cavo_id, operator_id, frozen_at, deleted_at"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);

  // Par défaut on EXCLUT les soft-deleted
  if (!includeDeleted) query = query.is("deleted_at", null);

  if (cantiere) query = query.eq("cantiere", cantiere);
  if (categoria) query = query.eq("categoria", categoria);
  if (commessa) query = query.eq("commessa", commessa);
  if (origine) query = query.eq("origine", origine);
  if (stato_doc) query = query.eq("stato_doc", stato_doc);

  if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("created_at", end.toISOString());
  }

  const mg = normalizeMimeGroup(mimeGroup);
  if (mg === "PDF") query = query.ilike("mime_type", "application/pdf%");
  if (mg === "IMG") query = query.or("mime_type.ilike.image/%");
  if (mg === "XLSX") {
    query = query.or(
      "mime_type.ilike.application/vnd.openxmlformats-officedocument.spreadsheetml.sheet%,mime_type.ilike.application/vnd.ms-excel%"
    );
  }

  const t = safeTerm(text);
  if (t) {
    const like = `%${t}%`;
    query = query.or(`filename.ilike.${like},note.ilike.${like},commessa.ilike.${like}`);
  }

  // Pagination cursor (created_at desc, id desc)
  if (cursor?.created_at && cursor?.id) {
    const cAt = cursor.created_at;
    const cId = cursor.id;
    query = query.or(`created_at.lt.${cAt},and(created_at.eq.${cAt},id.lt.${cId})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data || []) as CoreFileRecord[];
  const nextCursor =
    items.length > 0 ? { created_at: items[items.length - 1].created_at, id: items[items.length - 1].id } : null;

  return { items, nextCursor, hasMore: items.length === pageSize };
}

export async function getSignedUrl(coreFile: Pick<CoreFileRecord, "storage_path" | "storage_bucket">, expiresSeconds: number = 60 * 30): Promise<string> {
  if (!coreFile?.storage_path) throw new Error("Missing storage_path");

  const bucket = coreFile?.storage_bucket || CORE_DRIVE_BUCKET;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(coreFile.storage_path, expiresSeconds);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * IMPORTANT: deleteCoreFile() = SOFT DELETE ONLY.
 * - AUCUNE suppression Storage (preuve).
 * - AUCUN DELETE DB.
 * - Utilise RPC core_drive_soft_delete_file.
 *
 * Signature conservée pour compat UI : deleteCoreFile({ id, storage_path })
 * storage_path n'est plus utilisé (mais on le garde pour compat appelant).
 */
export async function deleteCoreFile({
  id,
  storage_path,
  reason = null,
}: {
  id: string;
  storage_path?: string;
  reason?: string | null;
}): Promise<boolean> {
  if (!id) throw new Error("Missing id");
  // storage_path conservé uniquement pour compat: on ne l'utilise pas.
  void storage_path;

  await softDeleteCoreFile({ fileId: id, reason: reason || null });
  return true;
}
