// netlify/functions/navemaster-import.mjs
// SOLUTION B — NAVEMASTER one-shot + dédoublonnage canonique (1 ligne par MARCACAVO)
//
// Règles:
// - Zéro parsing XLSX côté front.
// - Le front upload le fichier dans Supabase Storage (bucket: navemaster) et passe bucket+path.
// - Cette function (Node / Netlify) télécharge, parse, renvoie DRY_RUN ou COMMIT.
// - Auth: JWT utilisateur (Authorization: Bearer <access_token>) + contrôle profiles.app_role.
// - Écritures DB + Storage download via SERVICE ROLE.
// - One-shot par ship: si déjà initialisé => COMMIT refusé (sauf ADMIN avec {force:true}).
// - Canonique: si MARCACAVO dupliqué dans le fichier => on garde UNE seule ligne (best-of) selon scoring.
//
// Contrat JSON (POST):
// {
//   "mode": "DRY_RUN" | "COMMIT",
//   "ship_id": "<uuid>",
//   "costr": "6368",
//   "commessa": "SDC",
//   "bucket": "navemaster",
//   "path": "ships/<ship_id>/navemaster/<file>.xlsx",
//   "file_name": "NAVEMASTER.xlsx",
//   "note": "optional",
//   "force": false // optional (ADMIN only) => overwrite
// }

import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import crypto from "crypto";

const SHEET_NAME = "NAVEMASTER";

// CORS: en prod Netlify -> même origine, mais on garde un CORS “clean” pour debug/local.
function corsHeaders(origin) {
  const allowOrigin = origin || "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
    "access-control-max-age": "86400",
    "content-type": "application/json; charset=utf-8",
  };
}

function json(status, body, origin) {
  return {
    statusCode: status,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function asText(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function safePick(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const s = asText(obj[k]);
      if (s) return s;
    }
  }
  return null;
}

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function asDateMs(v) {
  if (!v) return null;
  // XLSX peut fournir Date, nombre Excel, ou string
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime();
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel date serial -> JS date via XLSX.SSF.parse_date_code
    const dc = XLSX.SSF.parse_date_code(v);
    if (dc && dc.y && dc.m && dc.d) {
      const dt = new Date(Date.UTC(dc.y, dc.m - 1, dc.d, dc.H || 0, dc.M || 0, dc.S || 0));
      const ms = dt.getTime();
      return Number.isNaN(ms) ? null : ms;
    }
  }
  const s = String(v).trim();
  if (!s) return null;
  const dt = new Date(s);
  const ms = dt.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Scoring canonique:
 * - privilégier lignes avec dates présentes (DATA_P, DATA_T*, DATA RIPRESA)
 * - privilégier lignes avec endpoints renseignés (APP/ PT / locale)
 * - privilégier présence de STATO/SITUAZIONE
 * - tie-break: date la plus récente (parmi dates pertinentes), sinon nombre de champs non vides
 */
function scoreRow(parsed) {
  const dateKeys = ["data_p_ms", "data_t_finc_ms", "data_t_conit_ms", "data_ripresa_ms"];
  const datesPresent = dateKeys.reduce((acc, k) => acc + (parsed[k] ? 1 : 0), 0);

  const endpointsPresent =
    (parsed.apparato_da ? 1 : 0) +
    (parsed.apparato_a ? 1 : 0) +
    (parsed.punto_da ? 1 : 0) +
    (parsed.punto_a ? 1 : 0) +
    (parsed.descr_locale_arrivo ? 1 : 0) +
    (parsed.id_locale_arrivo ? 1 : 0);

  const statusPresent = (parsed.stato_cavo ? 1 : 0) + (parsed.situazione_cavo_conit ? 1 : 0);

  // date la plus récente parmi les clés
  const maxDate = Math.max(
    0,
    parsed.data_p_ms || 0,
    parsed.data_t_finc_ms || 0,
    parsed.data_t_conit_ms || 0,
    parsed.data_ripresa_ms || 0
  );

  // densité de champs
  const density =
    (parsed.descrizione ? 1 : 0) +
    (parsed.livello ? 1 : 0) +
    (parsed.sezione ? 1 : 0) +
    (parsed.impianto ? 1 : 0) +
    (parsed.rack ? 1 : 0) +
    (parsed.spare ? 1 : 0) +
    (parsed.note ? 1 : 0);

  // Pondération simple, stable, explicable
  const score =
    datesPresent * 1000 +
    statusPresent * 200 +
    endpointsPresent * 150 +
    density * 25 +
    (maxDate > 0 ? 10 : 0);

  return { score, maxDate, density };
}

function pickBest(currentBest, candidate) {
  if (!currentBest) return candidate;
  if (candidate._score.score !== currentBest._score.score) {
    return candidate._score.score > currentBest._score.score ? candidate : currentBest;
  }
  if (candidate._score.maxDate !== currentBest._score.maxDate) {
    return candidate._score.maxDate > currentBest._score.maxDate ? candidate : currentBest;
  }
  if (candidate._score.density !== currentBest._score.density) {
    return candidate._score.density > currentBest._score.density ? candidate : currentBest;
  }
  // stable fallback: garder le premier (déterministe)
  return currentBest;
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin;

  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders(origin), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" }, origin);
    }

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = mustEnv("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = event.headers?.authorization || event.headers?.Authorization || "";

    // Client “user” (RLS + auth.getUser())
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "not_authenticated" }, origin);
    }

    const { data: profile, error: profErr } = await userClient
      .from("profiles")
      .select("id, app_role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profErr) {
      return json(
        500,
        { ok: false, error: "profile_lookup_failed", details: profErr.message },
        origin
      );
    }

    const role = String(profile?.app_role ?? "");
    if (!["ADMIN", "DIREZIONE", "UFFICIO", "MANAGER"].includes(role)) {
      return json(403, { ok: false, error: "forbidden_role", role }, origin);
    }

    let body = null;
    try {
      body = event.body ? JSON.parse(event.body) : null;
    } catch {
      body = null;
    }
    if (!body) return json(400, { ok: false, error: "invalid_json" }, origin);

    const mode = String(body.mode ?? "");
    const ship_id = String(body.ship_id ?? "");
    const costr = body.costr ? String(body.costr) : null;
    const commessa = body.commessa ? String(body.commessa) : null;
    const bucket = String(body.bucket ?? "navemaster");
    const path = String(body.path ?? "");
    const file_name = String(body.file_name ?? "NAVEMASTER.xlsx");
    const note = body.note ? String(body.note) : null;
    const force = !!body.force;

    if (mode !== "DRY_RUN" && mode !== "COMMIT") {
      return json(400, { ok: false, error: "invalid_mode" }, origin);
    }
    if (!ship_id || !path) {
      return json(
        400,
        {
          ok: false,
          error: "missing_required_fields",
          required: ["ship_id", "path"],
        },
        origin
      );
    }

    // Client “admin” (SERVICE ROLE) pour download storage + écritures DB
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // One-shot guard (COMMIT only)
    if (mode === "COMMIT") {
      const { data: existing, error: exErr } = await adminClient
        .from("navemaster_imports")
        .select("id, imported_at, is_active")
        .eq("ship_id", ship_id)
        .order("imported_at", { ascending: false })
        .limit(1);

      if (exErr) {
        return json(500, { ok: false, error: "one_shot_check_failed", details: exErr.message }, origin);
      }

      const already = (existing || [])[0] || null;
      if (already && !(role === "ADMIN" && force)) {
        return json(
          409,
          {
            ok: false,
            error: "navemaster_already_initialized",
            message: "NAVEMASTER est one-shot pour ce navire. Import refusé.",
            hint: "ADMIN peut forcer avec {force:true}.",
            existing_import_id: already.id,
            existing_imported_at: already.imported_at,
          },
          origin
        );
      }

      // Si ADMIN force, on fera un overwrite propre: désactiver imports + supprimer rows liées
      if (already && role === "ADMIN" && force) {
        // désactiver tous imports actifs
        const { error: deAllErr } = await adminClient
          .from("navemaster_imports")
          .update({ is_active: false })
          .eq("ship_id", ship_id);

        if (deAllErr) {
          return json(500, { ok: false, error: "force_deactivate_failed", details: deAllErr.message }, origin);
        }

        // supprimer toutes rows des imports de ce ship
        // NOTE: on suppose navemaster_rows.navemaster_import_id FK -> navemaster_imports.id
        // donc on supprime les imports (cascade) si cascade existe; sinon on supprime rows via join logique (2 étapes).
        // On tente d'abord delete imports; si contrainte empêche, on renvoie erreur explicite.
        const { error: delImpErr } = await adminClient
          .from("navemaster_imports")
          .delete()
          .eq("ship_id", ship_id);

        if (delImpErr) {
          return json(
            500,
            {
              ok: false,
              error: "force_cleanup_failed",
              message:
                "Impossible de nettoyer les imports existants. Vérifiez FK navemaster_rows(navemaster_import_id) ON DELETE CASCADE ou supprimez rows avant imports.",
              details: delImpErr.message,
            },
            origin
          );
        }
      }
    }

    // Download file from storage
    const dl = await adminClient.storage.from(bucket).download(path);
    if (dl.error || !dl.data) {
      return json(
        400,
        {
          ok: false,
          error: "storage_download_failed",
          details: dl.error?.message,
          bucket,
          path,
        },
        origin
      );
    }

    const arrayBuf = await dl.data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const sha = sha256Hex(buf);

    // Parse workbook
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) {
      return json(
        400,
        {
          ok: false,
          error: "missing_sheet",
          sheet: SHEET_NAME,
          sheets: wb.SheetNames,
        },
        origin
      );
    }

    // NAVEMASTER: ligne 1 = totaux, ligne 2 = headers, données dès ligne 3
    // sheet_to_json range=1 => saute la ligne 1 (0-index rows), prend la ligne 2 comme header
    const rows = XLSX.utils.sheet_to_json(ws, {
      defval: null,
      raw: true,
      range: 1,
    });

    if (rows.length && !("MARCACAVO" in rows[0])) {
      return json(
        400,
        {
          ok: false,
          error: "invalid_header_row",
          expected: "MARCACAVO",
          headers_detected: Object.keys(rows[0] || {}),
        },
        origin
      );
    }

    const warnings = [];

    // Canonical dedup
    const bestBy = new Map(); // marcacavo -> parsed row
    const dupCount = new Map(); // marcacavo -> occurrences
    let importableSeen = 0;

    for (const r of rows) {
      const marcacavo = safePick(r, ["MARCACAVO", "MARCA CAVO", "CODICE", "CAVO"]);
      if (!marcacavo) continue;
      importableSeen += 1;

      dupCount.set(marcacavo, (dupCount.get(marcacavo) || 0) + 1);

      const parsed = {
        marcacavo,

        // Champs “UI” / cockpit: alignés sur les headers réels de ce NAVEMASTER
        descrizione: safePick(r, ["DESCR. LOCALE APP. ARRIVO", "DESCRIZIONE", "DESC", "DESCR"]),
        stato_cavo: safePick(r, ["STATO CAVO", "STATO"]),
        situazione_cavo_conit: safePick(r, ["SITUAZIONE CAVO CONIT", "SITUAZIONE CONIT", "SITUAZIONE"]),

        // Endpoints
        apparato_da: safePick(r, ["APP. PART", "APP. PART OLD", "APPARATO DA", "APPARATO_DA"]),
        apparato_a: safePick(r, ["APP. ARR", "APP. ARR OLD", "APPARATO A", "APPARATO_A"]),
        punto_da: safePick(r, ["PT. PART", "PT. PART OLD", "ZONA DA", "ZONA_DA"]),
        punto_a: safePick(r, ["PT. ARR", "PT. ARR OLD", "ZONA A", "ZONA_A"]),
        id_locale_arrivo: safePick(r, ["ID LOCALE ARRIVO"]),
        descr_locale_arrivo: safePick(r, ["DESCR. LOCALE APP. ARRIVO"]),

        // Autres (souvent présents)
        livello: safePick(r, ["LIVELLO"]),
        sezione: safePick(r, ["SEZIONE"]),
        impianto: safePick(r, ["IMPIANTO"]),
        rack: safePick(r, ["RACK"]),
        spare: safePick(r, ["SPARE"]),
        note: safePick(r, ["NOTE", "NOTE 1", "NOTE 2", "NOTE 3"]),

        // Dates pour scoring
        data_p_ms: asDateMs(r["DATA_P"]),
        data_t_finc_ms: asDateMs(r["DATA_T FINCANTIERI"]),
        data_t_conit_ms: asDateMs(r["DATA_T CONIT"]),
        data_ripresa_ms: asDateMs(r["DATA RIPRESA"]),

        payload: r,
      };

      parsed._score = scoreRow(parsed);

      const current = bestBy.get(marcacavo) || null;
      bestBy.set(marcacavo, pickBest(current, parsed));
    }

    const out = Array.from(bestBy.values()).map((x) => {
      // nettoyer champs internes
      const { _score, data_p_ms, data_t_finc_ms, data_t_conit_ms, data_ripresa_ms, ...rest } = x;
      return rest;
    });

    // Duplicates summary
    const dups = [];
    let totalDupRows = 0;
    for (const [k, n] of dupCount.entries()) {
      if (n > 1) {
        dups.push({ marcacavo: k, count: n });
        totalDupRows += n;
      }
    }
    dups.sort((a, b) => b.count - a.count || String(a.marcacavo).localeCompare(String(b.marcacavo)));

    if (dups.length) {
      const sample = dups.slice(0, 10).map((d) => `${d.marcacavo}×${d.count}`).join(", ");
      warnings.push(
        `MARCACAVO dupliqués: ${dups.length} codes. Canonique appliqué => 1 ligne conservée par code. Exemples: ${sample}${
          dups.length > 10 ? "…" : ""
        }`
      );
    }
    if (out.length === 0) warnings.push("No importable rows found (missing MARCACAVO/CODICE).");

    if (mode === "DRY_RUN") {
      return json(
        200,
        {
          ok: true,
          mode,
          meta: {
            ship_id,
            costr,
            commessa,
            bucket,
            path,
            file_name,
            sha256: sha,
            rows_in_sheet: rows.length,
            rows_with_marcacavo: importableSeen,
            rows_canonical: out.length,
            duplicated_codes: dups.length,
          },
          warnings,
          sample: out.slice(0, 25),
          duplicates_sample: dups.slice(0, 25),
        },
        origin
      );
    }

    // COMMIT
    // 1) Désactiver l'import actif précédent (si existait, mais one-shot => normalement aucun sauf ADMIN force)
    const { error: deErr } = await adminClient
      .from("navemaster_imports")
      .update({ is_active: false })
      .eq("ship_id", ship_id)
      .eq("is_active", true);

    if (deErr) {
      return json(500, { ok: false, error: "deactivate_failed", details: deErr.message }, origin);
    }

    // 2) Créer le nouvel import
    const { data: imp, error: impErr } = await adminClient
      .from("navemaster_imports")
      .insert({
        ship_id,
        costr,
        commessa,
        file_name,
        file_bucket: bucket,
        file_path: path,
        source_sha256: sha,
        note,
        imported_by: userData.user.id,
        is_active: true,
      })
      .select("id")
      .single();

    if (impErr || !imp?.id) {
      return json(500, { ok: false, error: "import_insert_failed", details: impErr?.message }, origin);
    }

    const import_id = imp.id;

    // 3) Bulk insert rows (chunks) — canonical, donc unique sur marcacavo OK
    const chunkSize = 1000;
    let inserted = 0;

    try {
      for (let i = 0; i < out.length; i += chunkSize) {
        const chunk = out.slice(i, i + chunkSize).map((x) => ({
          navemaster_import_id: import_id,
          marcacavo: x.marcacavo,
          descrizione: x.descrizione,
          stato_cavo: x.stato_cavo,
          situazione_cavo_conit: x.situazione_cavo_conit,
          livello: x.livello,
          sezione: x.sezione,
          tipologia: x.tipologia, // si absent => null OK
          zona_da: x.punto_da || x.zona_da || null, // compat
          zona_a: x.punto_a || x.zona_a || null,
          apparato_da: x.apparato_da,
          apparato_a: x.apparato_a,
          impianto: x.impianto,
          payload: x.payload,
        }));

        const { error: insErr } = await adminClient.from("navemaster_rows").insert(chunk);
        if (insErr) throw new Error(insErr.message);

        inserted += chunk.length;
      }
    } catch (e) {
      // Rollback “soft”: supprimer l'import si échec
      await adminClient.from("navemaster_imports").delete().eq("id", import_id);
      return json(500, { ok: false, error: "bulk_insert_failed", message: String(e) }, origin);
    }

    return json(
      200,
      {
        ok: true,
        mode,
        import_id,
        inserted_rows: inserted,
        meta: {
          ship_id,
          costr,
          commessa,
          bucket,
          path,
          file_name,
          sha256: sha,
          rows_in_sheet: rows.length,
          rows_with_marcacavo: importableSeen,
          rows_canonical: out.length,
          duplicated_codes: dups.length,
        },
        warnings,
      },
      origin
    );
  } catch (e) {
    return json(500, { ok: false, error: "unexpected", message: String(e?.message ?? e) }, origin);
  }
}
