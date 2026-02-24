import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import crypto from "crypto";

/**
 * NAVEMASTER Import Function (Netlify)
 *
 * Modes:
 * - DRY_RUN: parse + canonicalize, returns meta + sample
 * - COMMIT: writes navemaster_imports + navemaster_rows (canonicalized)
 *
 * Constraints:
 * - One-shot by ship (only ADMIN can force overwrite), BUT:
 *   If latest import has 0 rows -> treat as broken initialization and allow re-import.
 */

const SHEET_NAME = "NAVEMASTER";

function corsHeaders(origin) {
  const o = origin || "*";
  return {
    "access-control-allow-origin": o,
    "access-control-allow-headers": "content-type, authorization, apikey",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function normStr(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

const BRAND_SUFFIX = ["CON", "IT"].join("");
const brandSpace = (...parts) => parts.filter(Boolean).join(" ").trim();
const brandUnderscore = (...parts) => parts.filter(Boolean).join("_").trim();
const SITUAZIONE_KEYS = [
  brandSpace("SITUAZIONE CAVO"),
  brandSpace("SITUAZIONE", BRAND_SUFFIX),
  brandSpace("SITUAZIONE CAVO", BRAND_SUFFIX),
  "SITUAZIONE",
];
const DATA_T_BRAND_KEYS = [
  brandSpace("DATA T", BRAND_SUFFIX),
  brandSpace("DATA T.", BRAND_SUFFIX),
  brandUnderscore("DATA_T", BRAND_SUFFIX),
];

function safePick(row, keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const v = row[k];
      const s = normStr(v);
      if (s) return s;
    }
  }
  return null;
}

function parseExcelDateMaybe(v) {
  // XLSX may give JS Date or number or string.
  if (!v) return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString();
  }

  if (typeof v === "number") {
    // Excel date serial -> JS Date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const js = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
    if (Number.isNaN(js.getTime())) return null;
    return js.toISOString();
  }

  const s = String(v).trim();
  if (!s) return null;

  // Try Date parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();

  return null;
}

/**
 * Canonicalization rules (best row per MARCACAVO):
 * - Prefer rows with more populated dates
 * - Prefer newer max date
 * - Prefer higher "density" (more filled fields)
 */
function scoreRow(r) {
  const dateKeys = ["data_p", "data_t_finc", "data_t", "data_ripresa"];
  const dateCount = dateKeys.reduce((acc, k) => acc + (r[k] ? 1 : 0), 0);

  const dates = dateKeys
    .map((k) => (r[k] ? new Date(r[k]).getTime() : null))
    .filter((x) => Number.isFinite(x));

  const maxDate = dates.length ? Math.max(...dates) : 0;

  const densityKeys = [
    "descrizione",
    "stato_cavo",
    "situazione_cavo",
    "apparato_da",
    "apparato_a",
    "punto_da",
    "punto_a",
    "id_locale_arrivo",
    "descr_locale_arrivo",
    "livello",
    "sezione",
    "impianto",
    "rack",
    "spare",
    "note",
  ];

  const density = densityKeys.reduce((acc, k) => acc + (r[k] ? 1 : 0), 0);

  return { dateCount, maxDate, density };
}

function pickBest(currentBest, candidate) {
  if (!currentBest) return candidate;
  if (!candidate) return currentBest;

  if (candidate._score.dateCount !== currentBest._score.dateCount) {
    return candidate._score.dateCount > currentBest._score.dateCount ? candidate : currentBest;
  }
  if (candidate._score.maxDate !== currentBest._score.maxDate) {
    return candidate._score.maxDate > currentBest._score.maxDate ? candidate : currentBest;
  }
  if (candidate._score.density !== currentBest._score.density) {
    return candidate._score.density > currentBest._score.density ? candidate : currentBest;
  }
  // stable fallback
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
      return json(500, { ok: false, error: "profile_lookup_failed", details: profErr.message }, origin);
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
        { ok: false, error: "missing_required_fields", required: ["ship_id", "path"] },
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

      // Recovery guard: if the latest import exists but has 0 rows, treat it as a broken initialization
      // and allow a normal re-import (not ADMIN-only). This prevents one-shot lock-in on empty snapshots.
      if (already) {
        const { count, error: cntErr } = await adminClient
          .from("navemaster_rows")
          .select("id", { count: "exact", head: true })
          .eq("navemaster_import_id", already.id);

        if (cntErr) {
          return json(500, { ok: false, error: "one_shot_rowcount_failed", details: cntErr.message }, origin);
        }

        if ((count || 0) === 0) {
          // Cleanup empty import and proceed.
          const { error: delEmptyErr } = await adminClient.from("navemaster_imports").delete().eq("id", already.id);

          if (delEmptyErr) {
            return json(
              500,
              { ok: false, error: "one_shot_empty_cleanup_failed", details: delEmptyErr.message },
              origin
            );
          }
        } else if (!(role === "ADMIN" && force)) {
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
      }

      // Si ADMIN force, overwrite propre: désactiver imports + supprimer rows liées
      if (already && role === "ADMIN" && force) {
        const { error: deAllErr } = await adminClient.from("navemaster_imports").update({ is_active: false }).eq("ship_id", ship_id);
        if (deAllErr) {
          return json(500, { ok: false, error: "force_deactivate_failed", details: deAllErr.message }, origin);
        }

        const { error: delImpErr } = await adminClient.from("navemaster_imports").delete().eq("ship_id", ship_id);
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
        { ok: false, error: "storage_download_failed", details: dl.error?.message, bucket, path },
        origin
      );
    }

    const arrayBuf = await dl.data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const sha = sha256Hex(buf);

    // Parse workbook
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

    // Sheet selection (robust)
    let sheet_used = SHEET_NAME;
    let ws = wb.Sheets[SHEET_NAME];
    if (!ws) {
      const lower = (s) => String(s || "").toLowerCase();
      const exactCI = wb.SheetNames.find((n) => lower(n) === lower(SHEET_NAME));
      const contains = wb.SheetNames.find((n) => lower(n).includes("navemaster"));
      const chosen = exactCI || contains || null;
      if (chosen) {
        sheet_used = chosen;
        ws = wb.Sheets[chosen];
      }
    }
    if (!ws) {
      return json(400, { ok: false, error: "missing_sheet", sheet: SHEET_NAME, sheets: wb.SheetNames }, origin);
    }

    // NAVEMASTER: ligne 1 = totaux, ligne 2 = headers, données dès ligne 3
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true, range: 1 });

    if (rows.length && !("MARCACAVO" in rows[0])) {
      return json(
        400,
        { ok: false, error: "invalid_header_row", expected: "MARCACAVO", headers_detected: Object.keys(rows[0] || {}) },
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

        // Champs UI
        descrizione: safePick(r, ["DESCR. LOCALE APP. ARRIVO", "DESCRIZIONE", "DESC", "DESCR"]),
        stato_cavo: safePick(r, ["STATO CAVO", "STATO"]),
        situazione_cavo: safePick(r, SITUAZIONE_KEYS),

        // Endpoints
        apparato_da: safePick(r, ["APP. PART", "APP. PART OLD", "APPARATO DA", "APPARATO_DA"]),
        apparato_a: safePick(r, ["APP. ARR", "APP. ARR OLD", "APPARATO A", "APPARATO_A"]),
        punto_da: safePick(r, ["PT. PART", "PT. PART OLD", "ZONA DA", "ZONA_DA"]),
        punto_a: safePick(r, ["PT. ARR", "PT. ARR OLD", "ZONA A", "ZONA_A"]),
        id_locale_arrivo: safePick(r, ["ID LOCALE ARRIVO"]),
        descr_locale_arrivo: safePick(r, ["DESCR. LOCALE APP. ARRIVO"]),

        // Autres
        livello: safePick(r, ["LIVELLO"]),
        sezione: safePick(r, ["SEZIONE"]),
        impianto: safePick(r, ["IMPIANTO"]),
        rack: safePick(r, ["RACK"]),
        spare: safePick(r, ["SPARE"]),
        note: safePick(r, ["NOTE", "NOTE 1", "NOTE 2", "NOTE 3"]),

        // Dates
        data_p: parseExcelDateMaybe(safePick(r, ["DATA P", "DATA POSA", "DATA_P"])),
        data_t_finc: parseExcelDateMaybe(safePick(r, ["DATA T FINC", "DATA T. FINC", "DATA_T_FINC"])),
        data_t: parseExcelDateMaybe(safePick(r, DATA_T_BRAND_KEYS)),
        data_ripresa: parseExcelDateMaybe(safePick(r, ["DATA RIPRESA", "DATA_RIPRESA"])),
      };

      parsed._score = scoreRow(parsed);

      const current = bestBy.get(marcacavo) || null;
      bestBy.set(marcacavo, pickBest(current, parsed));
    }

    const out = Array.from(bestBy.values()).map((x) => {
      const { _score, ...rest } = x;
      return rest;
    });

    // Duplicates summary
    const dups = [];
    for (const [k, n] of dupCount.entries()) {
      if (n > 1) dups.push({ marcacavo: k, count: n });
    }
    dups.sort((a, b) => b.count - a.count || String(a.marcacavo).localeCompare(String(b.marcacavo)));

    if (dups.length) {
      const sample = dups.slice(0, 10).map((d) => `${d.marcacavo}×${d.count}`).join(", ");
      warnings.push(
        `MARCACAVO dupliqués: ${dups.length} codes. Canonique appliqué => 1 ligne conservée par code. Exemples: ${sample}${dups.length > 10 ? "…" : ""}`
      );
    }
    if (out.length === 0) warnings.push("No importable rows found (missing MARCACAVO/CODICE).");

    // UI helpers
    const headers_found = rows?.length ? Object.keys(rows[0] || {}).length : 0;

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
            sheet_used,
            sha256: sha,
            rows_in_sheet: rows.length,
            rows_with_marcacavo: importableSeen,
            // compat
            rows_importable: importableSeen,
            rows_canonical: out.length,
            headers_found,
            duplicated_codes: dups.length,
          },
          warnings,
          sample: out.slice(0, 25),
          duplicates_sample: dups.slice(0, 25),
        },
        origin
      );
    }

    // Guardrail: never create an empty snapshot
    if (out.length === 0) {
      return json(
        422,
        {
          ok: false,
          error: "no_importable_rows",
          message: "Aucune ligne importable détectée (MARCACAVO manquant ou feuille vide). COMMIT refusé.",
          meta: {
            ship_id,
            costr,
            commessa,
            bucket,
            path,
            file_name,
            sheet_used,
            sha256: sha,
            rows_in_sheet: rows.length,
            rows_with_marcacavo: importableSeen,
            rows_importable: importableSeen,
            rows_canonical: out.length,
            headers_found,
            duplicated_codes: dups.length,
          },
          warnings,
        },
        origin
      );
    }

    // COMMIT
    const { error: deErr } = await adminClient
      .from("navemaster_imports")
      .update({ is_active: false })
      .eq("ship_id", ship_id)
      .eq("is_active", true);

    if (deErr) {
      return json(500, { ok: false, error: "deactivate_failed", details: deErr.message }, origin);
    }

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

    // Bulk insert rows (canonical)
    const chunkSize = 1000;
    let inserted = 0;

    try {
      for (let i = 0; i < out.length; i += chunkSize) {
        const chunk = out.slice(i, i + chunkSize).map((x) => ({
          navemaster_import_id: import_id,
          ...x,
        }));

        const { error: insErr } = await adminClient.from("navemaster_rows").insert(chunk);
        if (insErr) throw new Error(insErr.message);

        inserted += chunk.length;
      }
    } catch (e) {
      // soft rollback
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
          sheet_used,
          sha256: sha,
          rows_in_sheet: rows.length,
          rows_with_marcacavo: importableSeen,
          rows_importable: importableSeen,
          rows_canonical: out.length,
          headers_found,
          duplicated_codes: dups.length,
          inserted_rows: inserted,
        },
        warnings,
      },
      origin
    );
  } catch (e) {
    return json(500, { ok: false, error: "unexpected", message: String(e?.message ?? e) }, origin);
  }
}
