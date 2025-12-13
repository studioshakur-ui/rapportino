// src/inca/incaRapportinoLinkApi.js
import { supabase } from "../lib/supabaseClient";

/**
 * API lien Rapportino ↔ INCA (version % + RIPRESA)
 *
 * Tables:
 * - rapportino_inca_cavi:
 *    id, rapportino_id, inca_cavo_id,
 *    progress_percent, step_type,
 *    note,
 *    costr_cache, commessa_cache, codice_cache, report_date_cache,
 *    created_at
 *
 * - inca_cavi: id, costr, commessa, codice, situazione, ...
 * - rapportini: id, status, costr, commessa, report_date/data, ...
 */

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function toSafePercent(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  const p = Math.round(n);
  // valeurs autorisées
  if (![50, 70, 100].includes(p)) return null;
  return p;
}

function normalizeStepType(t) {
  const v = String(t || "POSA").toUpperCase().trim();
  return v === "RIPRESA" ? "RIPRESA" : "POSA";
}

// ------------------------------------------------------------
// FETCH
// ------------------------------------------------------------
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
      progress_percent,
      step_type,
      note,
      created_at,
      inca_cavo:inca_cavi(
        id,
        costr,
        commessa,
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
        zona_da,
        zona_a,
        descrizione_da,
        descrizione_a,
        apparato_da,
        apparato_a,
        rev_inca,
        wbs,
        tipo,
        sezione,
        livello,
        impianto
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

// ------------------------------------------------------------
// ADD
// ------------------------------------------------------------
export async function addRapportinoCavoRow(
  rapportinoId,
  incaCavoId,
  progressPercent = null,
  stepType = "POSA"
) {
  if (!rapportinoId || !incaCavoId) {
    throw new Error("addRapportinoCavoRow: rapportinoId o incaCavoId mancante");
  }

  const step_type = normalizeStepType(stepType);
  const progress_percent =
    step_type === "RIPRESA" ? 100 : toSafePercent(progressPercent);

  const { data, error } = await supabase
    .from("rapportino_inca_cavi")
    .insert({
      rapportino_id: rapportinoId,
      inca_cavo_id: incaCavoId,
      progress_percent,
      step_type,
    })
    .select(
      `
      id,
      rapportino_id,
      inca_cavo_id,
      progress_percent,
      step_type,
      note,
      created_at,
      inca_cavo:inca_cavi(
        id,
        costr,
        commessa,
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
        zona_da,
        zona_a,
        descrizione_da,
        descrizione_a,
        apparato_da,
        apparato_a,
        rev_inca,
        wbs,
        tipo,
        sezione,
        livello,
        impianto
      )
    `
    )
    .single();

  if (error) {
    console.error("[RapportinoIncaLink] addRapportinoCavoRow error", error);

    // ripresa unique (index) => message clair
    if (String(error.message || "").toLowerCase().includes("unique")) {
      throw new Error(
        "Ripresa già registrata per questo cavo (codice). Ripresa è unica e può essere fatta una sola volta."
      );
    }

    throw new Error(error.message || "Errore aggiunta cavo INCA al rapportino.");
  }

  return data;
}

// ------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------
export async function updateRapportinoCavoRow(rowId, patch) {
  if (!rowId) {
    throw new Error("updateRapportinoCavoRow: rowId mancante");
  }

  const payload = {};

  // step_type
  if (patch.step_type !== undefined) {
    payload.step_type = normalizeStepType(patch.step_type);

    // Hard rule: RIPRESA => 100
    if (payload.step_type === "RIPRESA") {
      payload.progress_percent = 100;
    }
  }

  // percent (si fourni)
  if (patch.progress_percent !== undefined) {
    // si le step est RIPRESA, on force 100
    const st = payload.step_type || normalizeStepType(patch.step_type);
    if (st === "RIPRESA") {
      payload.progress_percent = 100;
    } else {
      payload.progress_percent = toSafePercent(patch.progress_percent);
    }
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
      step_type,
      note,
      created_at,
      inca_cavo:inca_cavi(
        id,
        costr,
        commessa,
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
        zona_da,
        zona_a,
        descrizione_da,
        descrizione_a,
        apparato_da,
        apparato_a,
        rev_inca,
        wbs,
        tipo,
        sezione,
        livello,
        impianto
      )
    `
    )
    .single();

  if (error) {
    console.error("[RapportinoIncaLink] updateRapportinoCavoRow error", error);

    if (String(error.message || "").toLowerCase().includes("unique")) {
      throw new Error(
        "Ripresa già registrata per questo cavo (codice). Ripresa è unica e può essere fatta una sola volta."
      );
    }

    throw new Error(
      error.message || "Errore aggiornamento cavo INCA del rapportino."
    );
  }

  return data;
}

// ------------------------------------------------------------
// DELETE
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// SEARCH (picker)
// ------------------------------------------------------------
export async function searchIncaCaviForRapportino({
  shipCostr,
  search = "",
  excludeIncaIds = [],
  limit = 120,
}) {
  if (!shipCostr) {
    throw new Error("searchIncaCaviForRapportino: shipCostr mancante");
  }

  let query = supabase
    .from("inca_cavi")
    .select(
      `
      id,
      costr,
      commessa,
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
    query = query.not("id", "in", `(${excludeIncaIds.join(",")})`);
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

// ------------------------------------------------------------
// HISTORIQUE (par codice) — utile pour la modal RIPRESA
// ------------------------------------------------------------
export async function getCodiceHistorySummary({
  costr,
  commessa,
  codice,
  excludeRowId,
}) {
  if (!costr || !codice) {
    return { hasPartialPosa: false, hasRipresa: false, maxPosaPercent: 0 };
  }

  let q = supabase
    .from("rapportino_inca_cavi")
    .select(
      "id, step_type, progress_percent, report_date_cache, costr_cache, commessa_cache, codice_cache"
    )
    .eq("costr_cache", costr)
    .eq("codice_cache", codice);

  if (commessa) q = q.eq("commessa_cache", commessa);
  if (excludeRowId) q = q.neq("id", excludeRowId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data || [];
  let maxPosaPercent = 0;
  let hasPartialPosa = false;
  let hasRipresa = false;

  for (const r of rows) {
    if (r.step_type === "RIPRESA") hasRipresa = true;
    if (r.step_type === "POSA") {
      const p = Number(r.progress_percent || 0);
      if (p > maxPosaPercent) maxPosaPercent = p;
      if (p === 50 || p === 70) hasPartialPosa = true;
    }
  }

  return { hasPartialPosa, hasRipresa, maxPosaPercent };
}

// ------------------------------------------------------------
// APPLY rapportino -> INCA (export ufficio)
// Règle: INCA situation = 'P' dès POSA >= 50 ou RIPRESA 100
// MAIS seulement si rapportino VALIDATED_CAPO / APPROVED_UFFICIO
// ------------------------------------------------------------
export async function applyRapportinoToInca({ rapportinoId }) {
  if (!rapportinoId) {
    throw new Error("applyRapportinoToInca: rapportinoId mancante");
  }

  // 0) vérifier statut rapportino
  const { data: rap, error: rapError } = await supabase
    .from("rapportini")
    .select("id, status")
    .eq("id", rapportinoId)
    .maybeSingle();

  if (rapError) {
    console.error("[RapportinoIncaLink] applyRapportinoToInca rap error", rapError);
    throw new Error(rapError.message || "Errore lettura rapportino.");
  }

  const status = rap?.status || "DRAFT";
  const allowed = status === "VALIDATED_CAPO" || status === "APPROVED_UFFICIO";
  if (!allowed) {
    return {
      updated: 0,
      skipped: true,
      reason: `Rapportino status=${status} (apply consentito solo dopo validazione/approvazione).`,
    };
  }

  // 1) lignes de lien
  const { data: rows, error: rowsError } = await supabase
    .from("rapportino_inca_cavi")
    .select(
      `
      id,
      inca_cavo_id,
      progress_percent,
      step_type,
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
      rowsError.message || "Errore lettura cavi INCA collegati al rapportino."
    );
  }

  if (!rows || rows.length === 0) {
    return { updated: 0 };
  }

  // 2) Regroupement par cavo: si une POSA >= 50 OU RIPRESA 100 => mark P
  const markP = new Set();

  for (const row of rows) {
    if (!row.inca_cavo_id) continue;
    const st = normalizeStepType(row.step_type);
    const p = Number(row.progress_percent || 0) || 0;

    if (st === "RIPRESA" && p === 100) {
      markP.add(row.inca_cavo_id);
      continue;
    }
    if (st === "POSA" && p >= 50) {
      markP.add(row.inca_cavo_id);
      continue;
    }
  }

  if (markP.size === 0) {
    return { updated: 0 };
  }

  let updatedCount = 0;
  const errors = [];

  for (const cavoId of markP) {
    try {
      // si déjà P => skip
      const current = rows.find((r) => r.inca_cavo_id === cavoId)?.inca_cavo;
      if (current?.situazione === "P") continue;

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
