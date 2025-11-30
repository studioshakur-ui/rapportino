
// src/inca/incaApi.js
// API utilitaires pour le module INCA (accès Supabase)
import { supabase } from "../lib/supabaseClient";

/**
 * Crée un enregistrement inca_files + insère les câbles / percorsi associés.
 *
 * @param {Object} params
 * @param {string} params.costr      - Code nave / costruttore (ex: "6368")
 * @param {string} params.commessa   - Commessa (ex: "SDC")
 * @param {string} [params.projectCode]
 * @param {string} params.fileName
 * @param {string} params.fileType   - "XLSX" | "CSV" | "PDF" | "IMAGE"
 * @param {string} [params.note]
 * @param {Array<Object>} params.cavi - Liste des câbles parsés
 * @param {Object<string, Array<string>>} [params.percorsiByCodice] - Map codice -> [support1, support2, ...]
 */
export async function createIncaDataset({
  costr,
  commessa,
  projectCode,
  fileName,
  fileType,
  note,
  cavi,
  percorsiByCodice = {},
}) {
  if (!cavi || cavi.length === 0) {
    throw new Error("Nessun cavo trovato nel file INCA.");
  }

  // 1) Création du fichier INCA (meta)
  const { data: fileRow, error: fileError } = await supabase
    .from("inca_files")
    .insert({
      costr: costr || null,
      commessa: commessa || null,
      project_code: projectCode || null,
      file_name: fileName,
      file_type: fileType,
      note: note || null,
    })
    .select("*")
    .single();

  if (fileError) {
    console.error("Errore inserimento inca_files:", fileError);
    throw fileError;
  }

  const incaFileId = fileRow.id;

  // 2) Préparation des lignes inca_cavi
  const caviPayload = cavi.map((c) => ({
    inca_file_id: incaFileId,
    costr: costr || null,
    commessa: commessa || null,
    codice: c.codice,
    descrizione: c.descrizione || null,
    impianto: c.impianto || null,
    tipo: c.tipo || null,
    sezione: c.sezione || null,
    zona_da: c.zona_da || null,
    zona_a: c.zona_a || null,
    apparato_da: c.apparato_da || null,
    apparato_a: c.apparato_a || null,
    descrizione_da: c.descrizione_da || null,
    descrizione_a: c.descrizione_a || null,
    metri_teo: safeNumeric(c.metri_teo),
    metri_dis: safeNumeric(c.metri_dis),
    metri_sit_cavo: safeNumeric(c.metri_sit_cavo),
    metri_sit_tec: safeNumeric(c.metri_sit_tec),
    pagina_pdf: c.pagina_pdf ?? null,
    rev_inca: c.rev_inca ?? null,
    stato_inca: c.stato_inca ?? null,
  }));

  const { data: insertedCavi, error: caviError } = await supabase
    .from("inca_cavi")
    .insert(caviPayload)
    .select("*");

  if (caviError) {
    console.error("Errore inserimento inca_cavi:", caviError);
    throw caviError;
  }

  // 3) Insertion des percorsi (si fournis)
  const percorsiPayload = [];
  if (insertedCavi && insertedCavi.length > 0) {
    const byCodice = new Map(
      insertedCavi.map((c) => [c.codice, c])
    );

    for (const [codice, supports] of Object.entries(percorsiByCodice)) {
      const cavo = byCodice.get(codice);
      if (!cavo) continue;
      if (!Array.isArray(supports)) continue;

      supports.forEach((supporto, index) => {
        if (!supporto) return;
        percorsiPayload.push({
          cavo_id: cavo.id,
          ordine: index + 1,
          codice_supporto: supporto,
        });
      });
    }
  }

  if (percorsiPayload.length > 0) {
    const { error: percorsiError } = await supabase
      .from("inca_percorsi")
      .insert(percorsiPayload);

    if (percorsiError) {
      console.error("Errore inserimento inca_percorsi:", percorsiError);
      throw percorsiError;
    }
  }

  return {
    file: fileRow,
    cavi: insertedCavi,
    percorsiCount: percorsiPayload.length,
  };
}

function safeNumeric(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

/**
 * Liste tous les fichiers INCA (les plus récents d'abord)
 */
export async function listIncaFiles({ costr, commessa } = {}) {
  let query = supabase
    .from("inca_files")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (costr) query = query.eq("costr", costr);
  if (commessa) query = query.eq("commessa", commessa);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Liste des câbles INCA, avec filtrage optionnel.
 */
export async function listIncaCavi({
  fileId,
  search,
  costr,
  commessa,
  limit = 500,
} = {}) {
  let query = supabase
    .from("inca_cavi")
    .select("*")
    .order("codice", { ascending: true })
    .limit(limit);

  if (fileId) query = query.eq("inca_file_id", fileId);
  if (costr) query = query.eq("costr", costr);
  if (commessa) query = query.eq("commessa", commessa);

  if (search && search.trim() !== "") {
    const s = search.trim();
    query = query.or(
      `codice.ilike.%${s}%,descrizione.ilike.%${s}%,impianto.ilike.%${s}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Récupère le percorso complet d'un câble à partir de la vue helper.
 */
export async function getIncaCavoWithPath(cavoId) {
  const { data, error } = await supabase
    .from("inca_cavi_with_path")
    .select("*")
    .eq("id", cavoId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}
