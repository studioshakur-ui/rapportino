// /src/services/coreDrive.api.js
import { supabase } from "../lib/supabaseClient";

/* =========================
   Helpers
========================= */
function safeTerm(input) {
  const s = (input || "").toString().trim();
  return s.replace(/[,%]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeMimeGroup(mimeGroup) {
  const g = (mimeGroup || "").toString().toUpperCase().trim();
  if (!g) return "";
  if (g === "PDF") return "PDF";
  if (g === "IMG" || g === "IMAGE") return "IMG";
  if (g === "XLS" || g === "XLSX" || g === "EXCEL") return "XLSX";
  return g;
}

/* =========================
   Upload
========================= */
export async function uploadCoreFile({ file, meta }) {
  if (!file) throw new Error("Missing file");
  if (!meta?.cantiere) throw new Error("Missing meta.cantiere");
  if (!meta?.categoria) throw new Error("Missing meta.categoria");

  const originalName = file.name || "documento";
  const parts = originalName.split(".");
  const fileExt = parts.length > 1 ? parts.pop() : "";
  const safeExt = (fileExt || "").toLowerCase();

  const fileName = safeExt ? `${crypto.randomUUID()}.${safeExt}` : `${crypto.randomUUID()}`;
  const storagePath = `${meta.cantiere}/${meta.categoria}/${fileName}`;

  // 1) Upload Storage
  const { error: uploadError } = await supabase.storage
    .from("core-drive")
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  // 2) Insert metadata DB
  const { data, error } = await supabase
    .from("core_files")
    .insert([
      {
        storage_bucket: "core-drive",
        storage_path: storagePath,
        filename: originalName,
        mime_type: file.type || null,
        size_bytes: file.size || null,

        cantiere: meta.cantiere,
        commessa: meta.commessa || null,
        categoria: meta.categoria,
        origine: meta.origine || "CAPO",
        stato_doc: meta.stato_doc || "BOZZA",

        rapportino_id: meta.rapportino_id || null,
        inca_file_id: meta.inca_file_id || null,
        inca_cavo_id: meta.inca_cavo_id || null,
        operator_id: meta.operator_id || null,

        note: meta.note || null,
      },
    ])
    .select(
      "id, created_at, filename, mime_type, size_bytes, cantiere, commessa, categoria, origine, stato_doc, storage_path, storage_bucket, note, rapportino_id, inca_file_id, inca_cavo_id, operator_id"
    )
    .single();

  if (error) throw error;

  return data;
}

/* =========================
   Listing (cursor pagination)
========================= */
/**
 * Cursor stable: order created_at desc, id desc
 * cursor = { created_at: ISOstring, id: uuid }
 */
export async function listCoreFiles({ filters = {}, pageSize = 60, cursor = null }) {
  const {
    cantiere,
    categoria,
    commessa,
    origine,
    stato_doc,
    mimeGroup,
    text,
    dateFrom,
    dateTo,
  } = filters || {};

  let query = supabase
    .from("core_files")
    .select(
      "id, created_at, filename, mime_type, size_bytes, cantiere, commessa, categoria, origine, stato_doc, storage_path, storage_bucket, note, rapportino_id, inca_file_id, inca_cavo_id, operator_id"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);

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
    query = query.or(
      `filename.ilike.${like},note.ilike.${like},commessa.ilike.${like},categoria.ilike.${like}`
    );
  }

  if (cursor?.created_at && cursor?.id) {
    const cAt = cursor.created_at;
    const cId = cursor.id;
    query = query.or(`created_at.lt.${cAt},and(created_at.eq.${cAt},id.lt.${cId})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = data || [];
  const nextCursor =
    items.length > 0
      ? { created_at: items[items.length - 1].created_at, id: items[items.length - 1].id }
      : null;

  return {
    items,
    nextCursor,
    hasMore: items.length === pageSize,
  };
}

/* =========================
   Signed URL (preview)
========================= */
export async function getSignedUrl(coreFile, expiresSeconds = 60 * 30) {
  if (!coreFile?.storage_path) throw new Error("Missing storage_path");

  const { data, error } = await supabase.storage
    .from("core-drive")
    .createSignedUrl(coreFile.storage_path, expiresSeconds);

  if (error) throw error;
  return data.signedUrl;
}

/* =========================
   Delete (safe order)
========================= */
export async function deleteCoreFile({ id, storage_path }) {
  if (!id || !storage_path) throw new Error("Missing delete args");

  // 1) Storage first (avoid orphans)
  const { error: delFileErr } = await supabase.storage.from("core-drive").remove([storage_path]);
  if (delFileErr) throw delFileErr;

  // 2) DB after
  const { error: delMetaErr } = await supabase.from("core_files").delete().eq("id", id);
  if (delMetaErr) throw delMetaErr;

  return true;
}
