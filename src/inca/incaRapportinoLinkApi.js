import { supabase } from "../lib/supabaseClient";

/* -------------------------------------------------------------------------- */
/*                       LECTURE / CRUD RAPPORTINO-LINK                       */
/* -------------------------------------------------------------------------- */

export async function fetchRapportinoIncaCavi(rapportinoId) {
  if (!rapportinoId) {
    throw new Error("fetchRapportinoIncaCavi: rapportinoId manquant");
  }

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .select(`
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
        descrizione,
        metri_teo,
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
    `)
    .eq("rapportino_id", rapportinoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[RapportinoIncaLink] fetch error", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function addRapportinoCavoRow(rapportinoId, incaCavoId, metriPosati = 0) {
  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .insert({
      rapportino_id: rapportinoId,
      inca_cavo_id: incaCavoId,
      metri_posati: metriPosati
    })
    .select(`
      id,
      rapportino_id,
      inca_cavo_id,
      metri_posati,
      created_at,
      inca_cavo:inca_cavi(
        id,
        marca_cavo,
        codice,
        descrizione,
        metri_teo,
        metri_previsti,
        metri_posati_teorici,
        situazione,
        stato_inca,
        stato_cantiere,
        zona_a,
        descrizione_a
      )
    `)
    .single();

  if (error) {
    console.error("[RapportinoIncaLink] add error", error);
    throw new Error(error.message);
  }

  return data;
}

export async function updateRapportinoCavoRow(rowId, patch) {
  const payload = {};
  if (patch.metri_posati != null) payload.metri_posati = patch.metri_posati;
  if (patch.note !== undefined) payload.note = patch.note;

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .update(payload)
    .eq("id", rowId)
    .select(`
      id,
      rapportino_id,
      inca_cavo_id,
      metri_posati,
      created_at,
      inca_cavo:inca_cavi(
        id,
        marca_cavo,
        codice,
        descrizione,
        metri_teo,
        metri_previsti,
        metri_posati_teorici,
        situazione,
        stato_inca,
        stato_cantiere,
        zona_a,
        descrizione_a
      )
    `)
    .single();

  if (error) {
    console.error("[RapportinoIncaLink] update error", error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteRapportinoCavoRow(rowId) {
  const { error } = await supabase
    .from("rapportino_inca_cavi")
    .delete()
    .eq("id", rowId);

  if (error) throw new Error(error.message);
  return true;
}

/* -------------------------------------------------------------------------- */
/*                    ✅ APPLICATION DU RAPPORTINO SUR INCA_CAVI              */
/*              ✅ RÈGLE MÉTIER : 50% = P DIRECT                              */
/* -------------------------------------------------------------------------- */

export async function applyRapportinoToInca({ rapportinoId }) {
  if (!rapportinoId) {
    throw new Error("applyRapportinoToInca: rapportinoId manquant");
  }

  const { data: rows, error } = await supabase
    .from("rapportino_inca_cavi")
    .select(`
      id,
      inca_cavo_id,
      metri_posati,
      inca_cavo:inca_cavi(
        id,
        metri_previsti,
        metri_posati_teorici,
        situazione
      )
    `)
    .eq("rapportino_id", rapportinoId);

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return { updated: 0 };

  const map = new Map();

  for (const r of rows) {
    const perc = Number(r.metri_posati || 0);
    if (!map.has(r.inca_cavo_id)) {
      map.set(r.inca_cavo_id, {
        cavo: r.inca_cavo,
        percent: 0
      });
    }
    map.get(r.inca_cavo_id).percent += perc;
  }

  let updated = 0;

  for (const [cavoId, agg] of map) {
    const current = agg.cavo;
    const newPercent = agg.percent;
    const metriPrevisti = Number(current.metri_previsti || 0);
    const metriDelta = metriPrevisti * (newPercent / 100);
    const newPosati = (Number(current.metri_posati_teorici) || 0) + metriDelta;

    let nextSituazione = current.situazione;
    if (newPercent >= 50) nextSituazione = "P";

    const { error: updErr } = await supabase
      .from("inca_cavi")
      .update({
        metri_posati_teorici: newPosati,
        situazione: nextSituazione
      })
      .eq("id", cavoId);

    if (!updErr) updated++;
  }

  return { updated };
}
