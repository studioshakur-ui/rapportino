// netlify/functions/navemaster-import.mjs
// SOLUTION B — Parsing côté backend “non-edge” (TRÈS PROPRE)
//
// Règles:
// - Zéro parsing XLSX côté front.
// - Le front upload le fichier dans Supabase Storage (bucket: navemaster) et passe bucket+path.
// - Cette function (Node / Netlify) télécharge, parse, renvoie DRY_RUN ou COMMIT.
// - Auth: JWT utilisateur (Authorization: Bearer <access_token>) + contrôle profiles.app_role.
// - Écritures DB + Storage download via SERVICE ROLE.
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
//   "note": "optional"
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
    "access-control-allow-headers":
      "authorization, content-type, apikey, x-client-info",
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

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin;

  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders(origin),
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed" }, origin);
    }

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = mustEnv("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader =
      event.headers?.authorization ||
      event.headers?.Authorization ||
      "";

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

    // Convert sheet to objects (first row used as header by default)
    // Ici on reste tolérant (NAVEMASTER est souvent propre).
  const rows = XLSX.utils.sheet_to_json(ws, {
  defval: null,
  raw: true,
  range: 1 // ⬅️ saute la première ligne (totaux)
});
if (rows.length && !("MARCACAVO" in rows[0])) {
  return json(400, {
    ok: false,
    error: "invalid_header_row",
    headers_detected: Object.keys(rows[0] || {})
  });
}

    const warnings = [];
    const out = [];
    const seen = new Set();
    const dup = new Set();

    for (const r of rows) {
      const marcacavo = safePick(r, ["MARCACAVO", "MARCA CAVO", "CODICE", "CAVO"]);
      if (!marcacavo) continue;

      if (seen.has(marcacavo)) dup.add(marcacavo);
      seen.add(marcacavo);

      out.push({
        marcacavo,
        descrizione: safePick(r, ["DESCRIZIONE", "DESC", "DESCR"]),
        stato_cavo: safePick(r, ["STATO CAVO", "STATO"]),
        situazione_cavo_conit: safePick(r, ["SITUAZIONE CAVO CONIT", "SITUAZIONE CONIT", "SITUAZIONE"]),
        livello: safePick(r, ["LIVELLO"]),
        sezione: safePick(r, ["SEZIONE"]),
        tipologia: safePick(r, ["TIPOLOGIA"]),
        zona_da: safePick(r, ["ZONA DA", "ZONA_DA"]),
        zona_a: safePick(r, ["ZONA A", "ZONA_A"]),
        apparato_da: safePick(r, ["APPARATO DA", "APPARATO_DA"]),
        apparato_a: safePick(r, ["APPARATO A", "APPARATO_A"]),
        impianto: safePick(r, ["IMPIANTO"]),
        payload: r,
      });
    }

    if (dup.size) {
      warnings.push(
        `Duplicated MARCACAVO values: ${Array.from(dup).slice(0, 10).join(", ")}${
          dup.size > 10 ? "…" : ""
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
            rows_importable: out.length,
          },
          warnings,
          sample: out.slice(0, 25),
        },
        origin
      );
    }

    // COMMIT
    // 1) Désactiver l'import actif précédent
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

    // 3) Bulk insert rows (chunks)
    const chunkSize = 500;
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
          tipologia: x.tipologia,
          zona_da: x.zona_da,
          zona_a: x.zona_a,
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
        meta: { ship_id, costr, commessa, bucket, path, file_name, sha256: sha },
        warnings,
      },
      origin
    );
  } catch (e) {
    return json(
      500,
      { ok: false, error: "unexpected", message: String(e?.message ?? e) },
      origin
    );
  }
}
