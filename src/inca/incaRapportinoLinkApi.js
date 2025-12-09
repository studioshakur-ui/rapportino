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
 *
 * Les SELECT utilisent un join vers inca_cavi pour avoir les infos câble.
 */

/* -------------------------------------------------------------------------- */
/*                       LECTURE / CRUD RAPPORTINO-LINK                       */
/* -------------------------------------------------------------------------- */

/**
 * Récupère toutes les lignes de lien pour un rapportino,
 * avec les détails du câble INCA.
 */
export async function fetchRapportinoIncaCavi(rapportinoId) {
  if (!rapportinoId) {
    throw new Error("fetchRapportinoIncaCavi: rapportinoId manquant");
  }

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .select(
      `
      id,
      rapportino_id,
      inca_cavo_id,
      metri_posati,
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
    .eq("rapportino_id", rapportinoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[RapportinoIncaLink] fetchRapportinoIncaCavi error", error);
    throw new Error(
      error.message || "Errore caricamento cavi INCA del rapportino."
    );
  }

  return data || [];
}

/**
 * Ajoute un câble INCA au rapportino, avec éventuellement des mètres déjà posés.
 */
export async function addRapportinoCavoRow(
  rapportinoId,
  incaCavoId,
  metriPosati = 0
) {
  if (!rapportinoId || !incaCavoId) {
    throw new Error(
      "addRapportinoCavoRow: rapportinoId ou incaCavoId manquant"
    );
  }

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .insert({
      rapportino_id: rapportinoId,
      inca_cavo_id: incaCavoId,
      metri_posati: metriPosati || 0,
    })
    .select(
      `
      id,
      rapportino_id,
      inca_cavo_id,
      metri_posati,
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
 * Met à jour une ligne de lien (mètres posés, note…).
 */
export async function updateRapportinoCavoRow(rowId, patch) {
  if (!rowId) {
    throw new Error("updateRapportinoCavoRow: rowId manquant");
  }

  const payload = {};
  if (patch.metri_posati != null) {
    payload.metri_posati = patch.metri_posati;
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
      metri_posati,
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
    throw new Error("deleteRapportinoCavoRow: rowId manquant");
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

/**
 * Retourne une liste de cavi INCA pour un COSTR donné,
 * filtrés par recherche texte, en excluant ceux déjà utilisés.
 *
 * Utilisé dans le picker "Aggiungi da INCA".
 */
export async function searchIncaCaviForRapportino({
  shipCostr,
  search = "",
  excludeIncaIds = [],
  limit = 100,
}) {
  if (!shipCostr) {
    throw new Error("searchIncaCaviForRapportino: shipCostr mancant");
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
 * Logique :
 *  1) Lit tutte le righe rapportino_inca_cavi per questo rapportino.
 *  2) Raggruppa per inca_cavo_id → somma metri_posati (calcolati da %).
 *  3) Per ogni cavo:
 *     - legge metri_posati_teorici & metri_previsti
 *     - aggiunge la somma a metri_posati_teorici
 *     - ⚠️ Se new_posati >= 50% di metri_previsti → situazione = 'P'
 *
 * Il ciclo B → R → T → P resta guidato dal Cockpit CAPO,
 * qui ci limitiamo ad aggiornare metri_posati_teorici e, se serve, passare a P.
 */
export async function applyRapportinoToInca({ rapportinoId }) {
  if (!rapportinoId) {
    throw new Error("applyRapportinoToInca: rapportinoId mancant");
  }

  // 1) lignes de lien pour ce rapportino
  const { data: rows, error: rowsError } = await supabase
    .from("rapportino_inca_cavi")
    .select(
      `
      id,
      inca_cavo_id,
      metri_posati,
      inca_cavo:inca_cavi(
        id,
        metri_previsti,
        metri_posati_teorici,
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
    // Rien à faire
    return { updated: 0 };
  }

  // 2) Regroupement par inca_cavo_id
  const mapByCavo = new Map();

  for (const row of rows) {
    if (!row.inca_cavo_id) continue;
    const key = row.inca_cavo_id;
    const metri = Number(row.metri_posati || 0) || 0;

    if (!mapByCavo.has(key)) {
      mapByCavo.set(key, {
        cavoId: key,
        totalMetriRapportino: 0,
        cavo: row.inca_cavo || null,
      });
    }
    const agg = mapByCavo.get(key);
    agg.totalMetriRapportino += metri;
  }

  let updatedCount = 0;
  const errors = [];

  // 3) Pour chaque cavo, appliquer la mise à jour
  for (const [, agg] of mapByCavo) {
    const cavoId = agg.cavoId;
    const metriDelta = agg.totalMetriRapportino;
    const cavo = agg.cavo;

    try {
      // Si on n'a pas les infos du câble, on les recharge
      let current = cavo;
      if (!current) {
        const { data: cavoRow, error: cavoError } = await supabase
          .from("inca_cavi")
          .select("id, metri_previsti, metri_posati_teorici, situazione")
          .eq("id", cavoId)
          .single();

        if (cavoError) throw cavoError;
        current = cavoRow;
      }

      const prevPosati = Number(current.metri_posati_teorici || 0) || 0;
      const prevPrevisti = Number(current.metri_previsti || 0) || 0;

      const newPosati = prevPosati + metriDelta;

      let nextSituazione = current.situazione || null;
      if (prevPrevisti > 0) {
        // ⚠️ PASSAGE A P DES 50% DI AVANZAMENTO
        if (newPosati >= prevPrevisti * 0.5) {
          nextSituazione = "P";
        }
      }

      const payload = {
        metri_posati_teorici: newPosati,
      };

      if (nextSituazione !== current.situazione) {
        payload.situazione = nextSituazione;
      }

      const { error: updError } = await supabase
        .from("inca_cavi")
        .update(payload)
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
