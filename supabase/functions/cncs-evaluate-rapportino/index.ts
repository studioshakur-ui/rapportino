/* eslint-disable no-console */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Scope = "CAPO_VALIDATION" | "UFFICIO_APPROVAL" | "MANUAL";
type Severity = "INFO" | "WARN" | "BLOCK";

type Signal = {
  code: string;
  severity: Severity;
  row_ids?: string[];
  payload: Record<string, unknown>;
};

type RawSignalHit = {
  code: string;
  severity: Severity;
  row_ids?: string[];
  payload: Record<string, unknown>;
};

type EvaluateReq = {
  rapportino_id: string;
  scope?: Scope;
  request_id?: string;
};

type EvaluateRes = {
  rapportino_id: string;
  scope: Scope;
  validated: boolean;
  warn_count: number;
  block_count: number;
  signals: Signal[];
  run_id?: string;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isEmptyText(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "string") return false;
  return v.trim().length === 0;
}

function normalizeNumberFromUnknown(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;

  const s = v.trim();

  // Time format HH:MM
  const mTime = s.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (mTime) {
    const hh = Number(mTime[1]);
    const mm = Number(mTime[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 48) return null;
    if (mm < 0 || mm > 59) return null;
    return hh + mm / 60;
  }

  // Extract first numeric token, accept comma decimal
  const m = s.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  if (!Number.isFinite(n)) return null;
  return n;
}

function severityRank(s: Severity): number {
  if (s === "BLOCK") return 3;
  if (s === "WARN") return 2;
  return 1;
}

function maxSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) >= severityRank(b) ? a : b;
}

function safeJsonStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Aggregate raw hits into 1 signal per code:
 * - severity = max severity across hits
 * - row_ids = union
 * - payload = summary + samples (bounded)
 */
function aggregateSignals(raw: RawSignalHit[]): Signal[] {
  type Agg = {
    code: string;
    severity: Severity;
    rowIds: Set<string>;
    rowIndexes: Set<number>;
    hitCount: number;
    samples: Record<string, unknown>[];
  };

  const map = new Map<string, Agg>();

  for (const hit of raw) {
    const code = hit.code;

    if (!map.has(code)) {
      map.set(code, {
        code,
        severity: hit.severity,
        rowIds: new Set<string>(),
        rowIndexes: new Set<number>(),
        hitCount: 0,
        samples: [],
      });
    }

    const agg = map.get(code)!;
    agg.severity = maxSeverity(agg.severity, hit.severity);
    agg.hitCount += 1;

    if (hit.row_ids) for (const id of hit.row_ids) agg.rowIds.add(id);

    // Extract row_index sample if present
    const ri = (hit.payload as Record<string, unknown>)?.row_index;
    if (typeof ri === "number" && Number.isFinite(ri)) agg.rowIndexes.add(ri);

    // Keep bounded samples (evidence micro-snapshots)
    if (agg.samples.length < 20) {
      agg.samples.push(hit.payload ?? {});
    }
  }

  const out: Signal[] = [];
  for (const agg of map.values()) {
    const row_ids = Array.from(agg.rowIds);
    const row_indexes = Array.from(agg.rowIndexes).sort((a, b) => a - b);

    out.push({
      code: agg.code,
      severity: agg.severity,
      row_ids: row_ids.length > 0 ? row_ids : undefined,
      payload: {
        hit_count: agg.hitCount,
        affected_rows: row_ids.length,
        row_indexes,
        samples: agg.samples,
      },
    });
  }

  // Stable ordering: BLOCK first, then WARN, then INFO; then by code.
  out.sort((a, b) => {
    const dr = severityRank(b.severity) - severityRank(a.severity);
    if (dr !== 0) return dr;
    return a.code.localeCompare(b.code);
  });

  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const body = (await req.json()) as Partial<EvaluateReq>;
    const rapportino_id = (body.rapportino_id || "").trim();
    if (!rapportino_id) return jsonResponse(400, { error: "rapportino_id required" });

    const scope: Scope = body.scope ?? "MANUAL";
    const request_id = body.request_id ?? null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Load rapportino (public, live)
    const { data: rap, error: rapErr } = await sb
      .from("rapportini")
      .select(
        [
          "id",
          "status",
          "data",
          "report_date",
          "capo_id",
          "capo_name",
          "crew_role",
          "costr",
          "commessa",
          "cost",
          "prodotto_totale",
          "prodotto_tot",
          "note_ufficio",
          "ufficio_note",
          "validated_by_capo_at",
          "approved_by_ufficio_at",
          "returned_by_ufficio_at",
        ].join(",")
      )
      .eq("id", rapportino_id)
      .maybeSingle();

    if (rapErr) return jsonResponse(500, { error: "Failed to load rapportino", details: rapErr.message });
    if (!rap) return jsonResponse(404, { error: "rapportino not found" });

    // Load rows (public)
    const { data: rows, error: rowsErr } = await sb
      .from("rapportino_rows")
      .select(
        [
          "id",
          "row_index",
          "categoria",
          "descrizione",
          "operatori",
          "tempo",
          "previsto",
          "prodotto",
          "note",
          "activity_id",
          "position",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("rapportino_id", rapportino_id)
      .order("row_index", { ascending: true });

    if (rowsErr) return jsonResponse(500, { error: "Failed to load rapportino_rows", details: rowsErr.message });

    // Load cavi rows (public)
    const { data: cavi, error: caviErr } = await sb
      .from("rapportino_cavi")
      .select("id, rapportino_id, inca_cavo_id, metri_previsti, metri_posati, nota, created_at, created_by")
      .eq("rapportino_id", rapportino_id);

    if (caviErr) return jsonResponse(500, { error: "Failed to load rapportino_cavi", details: caviErr.message });

    // Archive presence check (meaningful for UFFICIO_APPROVAL)
    let archivePresent: boolean | null = null;
    if (scope === "UFFICIO_APPROVAL") {
      const { data: ar, error: arErr } = await sb
        .schema("archive")
        .from("rapportini")
        .select("id")
        .eq("id", rapportino_id)
        .maybeSingle();

      if (arErr) return jsonResponse(500, { error: "Failed to check archive.rapportini", details: arErr.message });
      archivePresent = !!ar;
    }

    // Audit-ready: core_files existence for rapportino
    const { data: files, error: filesErr } = await sb
      .from("core_files")
      .select("id, mime_type, filename, frozen_at, deleted_at, created_at")
      .eq("rapportino_id", rapportino_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filesErr) return jsonResponse(500, { error: "Failed to load core_files", details: filesErr.message });

    // Collect raw hits (row-level)
    const rawHits: RawSignalHit[] = [];

    // ---- Raw Signals (SAFE V1) ----

    // S-01 previsto=0 and prodotto>0
    for (const r of rows ?? []) {
      const previsto = typeof r.previsto === "number" ? r.previsto : null;
      const prodotto = typeof r.prodotto === "number" ? r.prodotto : null;
      if (previsto !== null && prodotto !== null && previsto === 0 && prodotto > 0) {
        rawHits.push({
          code: "MISMATCH_PREVISTO0_PRODOTTO_POS",
          severity: "WARN",
          row_ids: [r.id],
          payload: { previsto, prodotto, row_index: r.row_index ?? null },
        });
      }
    }

    // S-02 previsto>0 and prodotto=0/null
    for (const r of rows ?? []) {
      const previsto = typeof r.previsto === "number" ? r.previsto : null;
      const prodotto = typeof r.prodotto === "number" ? r.prodotto : null;
      if (previsto !== null && previsto > 0 && (prodotto === null || prodotto === 0)) {
        rawHits.push({
          code: "MISMATCH_PREVISTO_POS_PRODOTTO0",
          severity: "WARN",
          row_ids: [r.id],
          payload: { previsto, prodotto, row_index: r.row_index ?? null },
        });
      }
    }

    // S-03 tempo missing/unparseable when descrizione non-empty
    for (const r of rows ?? []) {
      const hasDesc = !isEmptyText(r.descrizione);
      const tempoVal = normalizeNumberFromUnknown(r.tempo);
      const tempoMissing = r.tempo === null || isEmptyText(r.tempo) || tempoVal === null;

      if (hasDesc && tempoMissing) {
        rawHits.push({
          code: "TIME_MISSING_OR_UNPARSEABLE",
          severity: "WARN",
          row_ids: [r.id],
          payload: { tempo: r.tempo ?? null, row_index: r.row_index ?? null },
        });
      }
    }

    // S-04 tempo out of range (negative or > 24h)
    for (const r of rows ?? []) {
      const tempoVal = normalizeNumberFromUnknown(r.tempo);
      if (tempoVal === null) continue;
      if (tempoVal < 0 || tempoVal > 24) {
        rawHits.push({
          code: "TIME_OUT_OF_RANGE",
          severity: "BLOCK",
          row_ids: [r.id],
          payload: { tempo_hours: tempoVal, tempo_raw: r.tempo ?? null, row_index: r.row_index ?? null },
        });
      }
    }

    // S-05 row has category/desc but operatori empty
    for (const r of rows ?? []) {
      const hasSomething = !isEmptyText(r.categoria) || !isEmptyText(r.descrizione);
      if (hasSomething && isEmptyText(r.operatori)) {
        rawHits.push({
          code: "ROW_NO_OPERATORI_TEXT",
          severity: "WARN",
          row_ids: [r.id],
          payload: { row_index: r.row_index ?? null },
        });
      }
    }

    // S-06 anomaly without note (computed after we know which rows have anomalies)
    // We'll add these hits later (after rawHits aggregation input assembled).

    // S-07 duplicate rows (fingerprint)
    // NOTE: we still emit row-level hits per duplicated row; aggregation will collapse to one code with union row_ids.
    const fpMap = new Map<string, { ids: string[]; rowIndexes: number[] }>();
    for (const r of rows ?? []) {
      const fp = [
        (r.categoria ?? "").trim().toLowerCase(),
        (r.descrizione ?? "").trim().toLowerCase(),
        String(r.previsto ?? ""),
        String(r.prodotto ?? ""),
        (r.tempo ?? "").trim().toLowerCase(),
        (r.operatori ?? "").trim().toLowerCase(),
      ].join("|");
      if (!fpMap.has(fp)) fpMap.set(fp, { ids: [], rowIndexes: [] });
      fpMap.get(fp)!.ids.push(r.id);
      fpMap.get(fp)!.rowIndexes.push(typeof r.row_index === "number" ? r.row_index : -1);
    }
    for (const [fp, grp] of fpMap.entries()) {
      if (!fp || grp.ids.length < 2) continue;

      // Emit one hit that already represents a group (aggregation will keep it as a sample entry)
      rawHits.push({
        code: "POSSIBLE_DUP_ROW",
        severity: "INFO",
        row_ids: grp.ids,
        payload: {
          count: grp.ids.length,
          row_indexes: grp.rowIndexes.filter((x) => x >= 0).sort((a, b) => a - b),
          fingerprint: fp, // keep for forensic; UI can ignore
        },
      });
    }

    // S-08 scope/status mismatch (header-level, no rows)
    if (scope === "CAPO_VALIDATION" && rap.status !== "VALIDATED_CAPO") {
      rawHits.push({
        code: "SCOPE_STATUS_MISMATCH",
        severity: "INFO",
        payload: { scope, status: rap.status },
      });
    }
    if (scope === "UFFICIO_APPROVAL" && rap.status !== "APPROVED_UFFICIO") {
      rawHits.push({
        code: "SCOPE_STATUS_MISMATCH",
        severity: "INFO",
        payload: { scope, status: rap.status },
      });
    }

    // S-09 approved scope must have archive presence
    if (scope === "UFFICIO_APPROVAL" && archivePresent === false) {
      rawHits.push({
        code: "ARCHIVE_MISSING_AFTER_APPROVAL",
        severity: "WARN",
        payload: { rapportino_id },
      });
    }

    // S-10 audit files missing for approval scope
    if (scope === "UFFICIO_APPROVAL") {
      const hasAnyFile = (files ?? []).length > 0;
      if (!hasAnyFile) {
        rawHits.push({
          code: "AUDIT_FILES_MISSING",
          severity: "WARN",
          payload: { rapportino_id },
        });
      }
    }

    // S-11 cable meters sanity: metri_posati > metri_previsti
    for (const c of cavi ?? []) {
      const mp = typeof c.metri_previsti === "number" ? c.metri_previsti : null;
      const mpos = typeof c.metri_posati === "number" ? c.metri_posati : null;
      if (mp !== null && mpos !== null && mpos > mp) {
        rawHits.push({
          code: "CAVI_METERS_EXCEED_PREVISTI",
          severity: "WARN",
          payload: {
            inca_cavo_id: c.inca_cavo_id,
            metri_previsti: mp,
            metri_posati: mpos,
            cavo_id: c.id,
          },
        });
      }
    }

    // S-12 returned status should have returned_by_ufficio_at
    if (rap.status === "RETURNED" && !rap.returned_by_ufficio_at) {
      rawHits.push({
        code: "RETURNED_MISSING_TIMESTAMP",
        severity: "WARN",
        payload: { rapportino_id },
      });
    }

    // S-06 (post) missing note for anomaly rows:
    // Determine anomaly rows based on raw hits with row_ids and severity WARN/BLOCK.
    const anomalyRowIds = new Set<string>();
    for (const h of rawHits) {
      if (!h.row_ids) continue;
      if (h.severity !== "WARN" && h.severity !== "BLOCK") continue;
      for (const id of h.row_ids) anomalyRowIds.add(id);
    }
    for (const r of rows ?? []) {
      if (!anomalyRowIds.has(r.id)) continue;
      if (isEmptyText(r.note)) {
        rawHits.push({
          code: "MISSING_NOTE_FOR_ANOMALY",
          severity: "WARN",
          row_ids: [r.id],
          payload: { row_index: r.row_index ?? null },
        });
      }
    }

    // Aggregate: 1 signal per code
    const signals = aggregateSignals(rawHits);

    // Summary counts by UNIQUE codes
    const block_count = signals.filter((s) => s.severity === "BLOCK").length;
    const warn_count = signals.filter((s) => s.severity === "WARN").length;
    const validated = block_count === 0;

    // Persist run + aggregated signals (server-side)
    const { data: runRow, error: runErr } = await sb
      .from("cncs_signal_runs")
      .insert({
        rapportino_id,
        scope,
        request_id,
        validated,
        warn_count,
        block_count,
      })
      .select("id")
      .single();

    if (runErr) return jsonResponse(500, { error: "Failed to insert cncs_signal_runs", details: runErr.message });

    const run_id = runRow?.id as string;

    if (signals.length > 0) {
      const signalRows = signals.map((s) => ({
        run_id,
        rapportino_id,
        scope,
        code: s.code,
        severity: s.severity,
        row_ids: s.row_ids ?? null,
        payload: s.payload ?? {},
      }));

      const { error: sigErr } = await sb.from("cncs_signals").insert(signalRows);
      if (sigErr) return jsonResponse(500, { error: "Failed to insert cncs_signals", details: sigErr.message });
    }

    // Optional mirroring to core_drive_events WHEN a core_file exists (file-centric policies)
    const mirrorFileId = (files ?? [])[0]?.id ?? null;
    if (mirrorFileId) {
      const payload = {
        rapportino_id,
        scope,
        validated,
        warn_count,
        block_count,
        signals: signals.map((s) => ({ code: s.code, severity: s.severity })),
        run_id,
      };

      const { error: evErr } = await sb.rpc("core_drive_append_event", {
        p_file_id: mirrorFileId,
        p_event_type: "cncs.run",
        p_payload: payload,
        p_note: null,
        p_prev_event_id: null,
      });

      if (evErr) {
        // Non-fatal: cncs_* tables remain the source of truth for CNCS.
        console.error("Mirror core_drive_append_event failed:", evErr.message);
      }
    }

    const res: EvaluateRes = {
      rapportino_id,
      scope,
      validated,
      warn_count,
      block_count,
      signals,
      run_id,
    };

    // Helpful debug (safe)
    console.log(
      "CNCS run",
      safeJsonStringify({
        rapportino_id,
        scope,
        validated,
        warn_count,
        block_count,
        run_id,
      })
    );

    return jsonResponse(200, res);
  } catch (e) {
    console.error(e);
    return jsonResponse(500, { error: "Unhandled error", details: String(e) });
  }
});
