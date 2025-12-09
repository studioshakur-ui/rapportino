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
 *      ⚠️ Dans cette version, on interprète metri_posati comme un RATIO :
 *        0    → aucun avancement
 *        0.5  → 50% del cavo (per questo turno)
 *        0.7  → 70%
 *        1.0  → 100%
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
    throw new Error("fetchRapportinoIncaCavi: rapportinoId mancante");
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
 * Ajoute un câble INCA au rapportino, avec éventuellement un ratio déjà saisi.
 *
 * metriPosati est un RATIO 0–1 (ex: 0.5 = 50%).
 */
export async function addRapportinoCavoRow(
  rapportinoId,
  incaCavoId,
  metriPosati = 0
) {
  if (!rapportinoId || !incaCavoId) {
    throw new Error(
      "addRapportinoCavoRow: rapportinoId ou incaCavoId mancante"
    );
  }

  const ratio = Number(metriPosati || 0) || 0;

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .insert({
      rapportino_id: rapportinoId,
      inca_cavo_id: incaCavoId,
      metri_posati: ratio,
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
 * Met à jour une ligne de lien (ratio metri_posati, note…).
 *
 * patch.metri_posati = RATIO 0–1 (et non plus des mètres).
 */
export async function updateRapportinoCavoRow(rowId, patch) {
  if (!rowId) {
    throw new Error("updateRapportinoCavoRow: rowId mancante");
  }

  const payload = {};
  if (patch.metri_posati != null) {
    const ratio = Number(patch.metri_posati || 0) || 0;
    payload.metri_posati = ratio;
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
    console.error(
      "[RapportinoIncaLink] updateRapportinoCavoRow error",
      error
    );
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
 * Nouvelle logique (version pourcentage) :
 *  1) Lit toutes les lignes rapportino_inca_cavi pour ce rapportino.
 *  2) Pour chaque ligne :
 *       - metri_posati = ratio_turno (0–1, ex 0.5 = 50%)
 *  3) Regroupe par inca_cavo_id → somme des ratios (on peut avoir plus d'un tour
 *     sur le même câble, même si ce ne sera pas le cas le plus fréquent).
 *  4) Pour chaque cavo :
 *       - lit metri_previsti, metri_posati_teorici & situazione
 *       - calcule metriDelta = ratioTotale * metri_previsti
 *       - newPosati = metri_posati_teorici + metriDelta
 *       - ratioGlobale = newPosati / metri_previsti
 *       - si ratioGlobale >= 0.5 → situazione = 'P'
 *
 * ⚠️ Le cycle B → (vuoto) → R → T → P reste piloté
 *    par le cockpit CAPO. Ici on ne force que le passage à P
 *    quand on dépasse 50% de posa.
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
    // Rien à faire → mais ce n'est pas une erreur.
    return { updated: 0 };
  }

  // 2) Regroupement par inca_cavo_id (somme des ratios)
  const mapByCavo = new Map();

  for (const row of rows) {
    if (!row.inca_cavo_id) continue;
    const key = row.inca_cavo_id;
    const ratio = Number(row.metri_posati || 0) || 0;

    if (!mapByCavo.has(key)) {
      mapByCavo.set(key, {
        cavoId: key,
        totalRatio: 0,
        cavo: row.inca_cavo || null,
      });
    }
    const agg = mapByCavo.get(key);
    agg.totalRatio += ratio;
  }

  let updatedCount = 0;
  const errors = [];

  // 3) Pour chaque cavo, appliquer la mise à jour
  for (const [, agg] of mapByCavo) {
    const cavoId = agg.cavoId;
    const totalRatio = agg.totalRatio;
    let current = agg.cavo;

    try {
      // Si on n'a pas les infos du câble, on les recharge
      if (!current) {
        const { data: cavoRow, error: cavoError } = await supabase
          .from("inca_cavi")
          .select("id, metri_previsti, metri_posati_teorici, situazione")
          .eq("id", cavoId)
          .single();

        if (cavoError) throw cavoError;
        current = cavoRow;
      }

      const prevPrevisti = Number(current.metri_previsti || 0) || 0;
      const prevPosati = Number(current.metri_posati_teorici || 0) || 0;

      if (prevPrevisti <= 0 || totalRatio <= 0) {
        // rien à appliquer
        continue;
      }

      // mètres du tour = ratio * lunghezza prevista
      const metriDelta = totalRatio * prevPrevisti;
      const newPosati = prevPosati + metriDelta;

      const ratioGlobale = newPosati / prevPrevisti;

      let nextSituazione = current.situazione || null;

      // Passage à P dès qu'on atteint 50% de posa globale
      if (ratioGlobale >= 0.5) {
        nextSituazione = "P";
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
