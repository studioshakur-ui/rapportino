// src/inca/incaRapportinoLinkApi.js
import { supabase } from "../lib/supabaseClient";

/**
 * API de lien Rapportino ↔ INCA
 *
 * Table attendue : rapportino_inca_cavi
 *
 * Colonnes minimales :
 *  - id (uuid, PK)
 *  - rapportino_id (uuid, NOT NULL)
 *  - inca_cavo_id (uuid, NOT NULL, FK → inca_cavi.id)
 *  - metri_posati (numeric)
 *  - note (text, optionnel)
 *  - created_at / updated_at (optionnels)
 */

/* ... toutes les fonctions fetch/add/update/delete/search restent IDENTIQUES ... */

/* -------------------------------------------------------------------------- */
/*                    APPLICATION DU RAPPORTINO SUR INCA_CAVI                 */
/* -------------------------------------------------------------------------- */

/**
 * Récupère toutes les lignes de lien pour un rapportino,
 * avec les détails du câble INCA.
 */
export async function fetchRapportinoIncaCavi(rapportinoId) {
  if (!rapportinoId) {
    throw new Error("fetchRapportinoIncaCavi: rapportinoId manquant");
  }

  // 1) lignes de lien pour ce rapportino
  const { data: rows, error: rowsError } = await supabase
    .from("rapportino_inca_cavi")
    .select(
      `
      id,
      inca_cavo_id,
      metri_posati,
      note,
      created_at,
      inca_cavo:inca_cavi(
        id,
        metri_previsti,
        metri_posati_teorici,
        situazione,
        stato_inca,
        stato_cantiere,
        zona_da,
        zona_a,
        descrizione_da,
        descrizione_a,
        rev_inca
      )
    `
    )
    .eq("rapportino_id", rapportinoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[RapportinoIncaLink] fetchRapportinoIncaCavi error", error);
    throw new Error(error.message || "Errore caricamento cavi INCA del rapportino.");
  }

  return data || [];
}

/**
 * Ajoute un câble INCA au rapportino, avec éventuellement un pourcentage.
 */
export async function addRapportinoCavoRow(
  rapportinoId,
  incaCavoId,
  progressPercent = null
) {
  if (!rapportinoId || !incaCavoId) {
    throw new Error("addRapportinoCavoRow: rapportinoId o incaCavoId mancante");
  }

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .insert({
      rapportino_id: rapportinoId,
      inca_cavo_id: incaCavoId,
      progress_percent: progressPercent,
    })
    .select(
      `
      id,
      rapportino_id,
      inca_cavo_id,
      progress_percent,
      note,
      created_at,
      inca_cavo:inca_cavi(
        id,
        marca_cavo,
        codice,
        livello_disturbo,
        tipo,
        sezione,
        wbs,
        descrizione,
        metri_teo,
        metri_totali,
        metri_previsti,
        metri_posati_teorici,
        situazione,
        stato_inca,
        stato_cantiere,
        zona_da,
        zona_a,
        descrizione_da,
        descrizione_a,
        rev_inca
      )
    `
    )
    .single();

  if (error) {
    console.error("[RapportinoIncaLink] addRapportinoCavoRow error", error);
    throw new Error(
      error.message || "Errore aggiunta cavo INCA al rapportino."
    );
  }

  return data;
}

/**
 * Met à jour une ligne de lien (pourcentage, note…).
 */
export async function updateRapportinoCavoRow(rowId, patch) {
  if (!rowId) {
    throw new Error("updateRapportinoCavoRow: rowId mancante");
  }

  const payload = {};
  if (patch.progress_percent !== undefined) {
    payload.progress_percent = patch.progress_percent;
  }
  if (patch.note !== undefined) {
    payload.note = patch.note;
  }

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .update(payload)
    .eq("id", rowId)
    .select(
      `
      id,
      rapportino_id,
      inca_cavo_id,
      progress_percent,
      note,
      created_at,
      inca_cavo:inca_cavi(
        id,
        marca_cavo,
        codice,
        livello_disturbo,
        tipo,
        sezione,
        wbs,
        descrizione,
        metri_teo,
        metri_totali,
        metri_previsti,
        metri_posati_teorici,
        situazione,
        stato_inca,
        stato_cantiere,
        zona_da,
        zona_a,
        descrizione_da,
        descrizione_a,
        rev_inca
      )
    `
    )
    .single();

  if (error) {
    console.error("[RapportinoIncaLink] updateRapportinoCavoRow error", error);
    throw new Error(
      error.message || "Errore aggiornamento cavo INCA del rapportino."
    );
  }

  return data;
}

/**
 * Supprime une ligne de lien.
 */
export async function deleteRapportinoCavoRow(rowId) {
  if (!rowId) {
    throw new Error("deleteRapportinoCavoRow: rowId mancante");
  }

  const { error } = await supabase
    .from("rapportino_inca_cavi")
    .delete()
    .eq("id", rowId);

  if (error) {
    console.error("[RapportinoIncaLink] deleteRapportinoCavoRow error", error);
    throw new Error(
      error.message || "Errore cancellazione cavo INCA dal rapportino."
    );
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/*                          RECHERCHE CAVI DISPONIBILI                        */
/* -------------------------------------------------------------------------- */

export async function searchIncaCaviForRapportino({
  shipCostr,
  search = "",
  excludeIncaIds = [],
  limit = 100,
}) {
  if (!shipCostr) {
    throw new Error("searchIncaCaviForRapportino: shipCostr mancante");
  }

  let query = supabase
    .from("inca_cavi")
    .select(
      `
      id,
      marca_cavo,
      codice,
      descrizione,
      metri_teo,
      metri_totali,
      metri_previsti,
      metri_posati_teorici,
      situazione,
      stato_inca,
      stato_cantiere,
      zona_a,
      descrizione_a
    `
    )
    .eq("costr", shipCostr)
    .order("marca_cavo", { ascending: true })
    .limit(limit);

  if (excludeIncaIds.length > 0) {
    query = query.not("id", "in", excludeIncaIds);
  }

  const s = search.trim();
  if (s) {
    const like = `%${s}%`;
    query = query.or(
      [
        `marca_cavo.ilike.${like}`,
        `codice.ilike.${like}`,
        `descrizione.ilike.${like}`,
        `descrizione_a.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "[RapportinoIncaLink] searchIncaCaviForRapportino error",
      error
    );
    throw new Error(
      error.message || "Errore ricerca cavi INCA per il rapportino."
    );
  }

  return data || [];
}

/* -------------------------------------------------------------------------- */
/*                    APPLICATION DU RAPPORTINO SUR INCA_CAVI                 */
/* -------------------------------------------------------------------------- */

/**
 * Applique la production du rapportino aux cavi INCA.
 *
 * Logique (version %):
 *  1) Lit toutes les lignes rapportino_inca_cavi pour ce rapportino.
 *  2) Regroupe par inca_cavo_id → max(progress_percent) pour ce tour.
 *  3) Pour chaque cavo :
 *     - si maxPercent >= 50 → situazione = 'P'
 *
 * ⚠️ Le cycle B → R → T reste géré par le cockpit CAPO.
 */
export async function applyRapportinoToInca({ rapportinoId }) {
  if (!rapportinoId) {
    throw new Error("applyRapportinoToInca: rapportinoId mancante");
  }

  // 1) lignes de lien pour ce rapportino
  const { data: rows, error: rowsError } = await supabase
    .from("rapportino_inca_cavi")
    .select(
      `
      id,
      inca_cavo_id,
      progress_percent,
      inca_cavo:inca_cavi(
        id,
        situazione
      )
    `
    )
    .eq("rapportino_id", rapportinoId);

  if (rowsError) {
    console.error(
      "[RapportinoIncaLink] applyRapportinoToInca rows error",
      rowsError
    );
    throw new Error(
      rowsError.message ||
        "Errore lettura cavi INCA collegati al rapportino."
    );
  }

  if (!rows || rows.length === 0) {
    return { updated: 0 };
  }

  // 2) Regroupement par cavo → max(progress_percent)
  const mapByCavo = new Map();

  for (const row of rows) {
    if (!row.inca_cavo_id) continue;
    const key = row.inca_cavo_id;
    const perc = Number(row.progress_percent || 0) || 0;

    if (!mapByCavo.has(key)) {
      mapByCavo.set(key, {
        cavoId: key,
        maxPercent: 0,
        cavo: row.inca_cavo || null,
      });
    }
    const agg = mapByCavo.get(key);
    if (perc > agg.maxPercent) agg.maxPercent = perc;
  }

  let updatedCount = 0;
  const errors = [];

  // 3) Pour chaque cavo, si maxPercent ≥ 50 → situazione = 'P'
  for (const [, agg] of mapByCavo) {
    const cavoId = agg.cavoId;
    const maxPercent = agg.maxPercent;
    const cavo = agg.cavo;

    if (maxPercent < 50) continue; // pas encore assez pour P

    try {
      let current = cavo;
      if (!current) {
        const { data: cavoRow, error: cavoError } = await supabase
          .from("inca_cavi")
          .select("id, situazione")
          .eq("id", cavoId)
          .single();

        if (cavoError) throw cavoError;
        current = cavoRow;
      }

      if (current.situazione === "P") {
        continue; // déjà posé
      }

      const { error: updError } = await supabase
        .from("inca_cavi")
        .update({ situazione: "P" })
        .eq("id", cavoId);

      if (updError) throw updError;

      updatedCount++;
    } catch (e) {
      console.error("[RapportinoIncaLink] apply single cavo error", e);
      errors.push({ cavoId, error: e.message || String(e) });
    }
  }

  return { updated: updatedCount, errors };
}
