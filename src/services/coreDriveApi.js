// src/services/coreDriveApi.js
import { supabase } from "../lib/supabaseClient";

/**
 * Upload d’un fichier dans le bucket core-drive +
 * insertion d’une ligne metadata dans core_files.
 */
export async function uploadCoreFile({ file, meta }) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const storagePath = `${meta.cantiere}/${meta.categoria}/${fileName}`;

  // 1) Upload physique
  const { error: uploadError } = await supabase.storage
    .from("core-drive")
    .upload(storagePath, file, {
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // 2) Metadata DB
  const { data, error } = await supabase
    .from("core_files")
    .insert([
      {
        storage_bucket: "core-drive",
        storage_path: storagePath,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,

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
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Liste des documents filtrés par cantiere & options.
 */
export async function listCoreFiles({ cantiere, categoria, search }) {
  let query = supabase.from("core_files").select("*").order("created_at", {
    ascending: false,
  });

  if (cantiere) query = query.eq("cantiere", cantiere);
  if (categoria) query = query.eq("categoria", categoria);
  if (search) query = query.ilike("filename", `%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * URL signée pour afficher un PDF ou une image.
 */
export async function getSignedUrl(coreFile) {
  const { data, error } = await supabase.storage
    .from("core-drive")
    .createSignedUrl(coreFile.storage_path, 60 * 30); // 30 minutes

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Suppression (DIREZIONE seulement normalement)
 */
export async function deleteCoreFile(id, storage_path) {
  const { error: delMetaErr } = await supabase
    .from("core_files")
    .delete()
    .eq("id", id);

  if (delMetaErr) throw delMetaErr;

  const { error: delFileErr } = await supabase.storage
    .from("core-drive")
    .remove([storage_path]);

  if (delFileErr) throw delFileErr;

  return true;
}
