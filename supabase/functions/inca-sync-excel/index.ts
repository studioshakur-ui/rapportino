// supabase/functions/inca-sync-excel/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { readSheetRowsFromXlsx } from "../_shared/readXlsx.ts";
import { chunk, sha256Hex } from "../_shared/batch.ts";
import {
  classifyDisappearance,
  classifySituazioneTransition,
  IncaEvent,
  isSituazione,
  mapStatoCantiereToSituazione,
  Situazione,
} from "../_shared/incaRules.ts";

type ReqBody = {
  // Identify the logical INCA dataset scope
  inca_file_id?: string;

  // Where to read the XLSX from:
  // Option A: provide bucket + path for Supabase Storage (recommended)
  storage_bucket?: string;
  storage_path?: string;

  // Option B: provide base64 directly
  xlsx_base64?: string;

  // Optional metadata
  file_name?: string;
  note?: string;

  // Sheet name (default DATI)
  sheet_name?: string;
};

type ParsedCable = {
  codice: string; // MARCA CAVO cleaned from *
  flagged: boolean; // had *
  situazione: Situazione; // L/R/T/B/P/E
  metri_teo: number | null;
  metri_dis: number | null;
  raw: Record<string, unknown>;
};

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

function json(resBody: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(resBody, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function parseMarcaCavo(raw: unknown): { codice: string; flagged: boolean } {
  const s = String(raw ?? "").trim();
  if (!s) return { codice: "", flagged: false };
  const flagged = s.includes("*");
  const codice = s.replaceAll("*", "").trim();
  return { codice, flagged };
}

function parseNumberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pickFirstKey(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    if (key in row) return row[key];
  }
  return undefined;
}

function parseCablesFromRows(rows: Record<string, unknown>[]): ParsedCable[] {
  const out: ParsedCable[] = [];
  for (const r of rows) {
    const marca = pickFirstKey(r, ["MARCA CAVO", "MARCA_CAVO", "MARCA", "CODICE", "CAVO"]);
    const { codice, flagged } = parseMarcaCavo(marca);
    if (!codice) continue;

    const stato = pickFirstKey(r, ["STATO CANTIERE", "STATO_CANTIERE", "SITUAZIONE", "STATO"]);
    const situazione = mapStatoCantiereToSituazione(stato);

    const metri_teo = parseNumberOrNull(pickFirstKey(r, ["LUNGHEZZA DI DISEGNO", "LUNGHEZZA_DI_DISEGNO", "METRI_TEO", "LUNGHEZZA TEORICA"]));
    const metri_dis = parseNumberOrNull(pickFirstKey(r, ["LUNGHEZZA DI POSA", "LUNGHEZZA_DI_POSA", "METRI_DIS", "LUNGHEZZA POSATA"]));

    out.push({ codice, flagged, situazione, metri_teo, metri_dis, raw: r });
  }
  return out;
}

async function downloadXlsxFromStorage(args: {
  supabase: ReturnType<typeof createClient>;
  bucket: string;
  path: string;
}): Promise<Uint8Array> {
  const { data, error } = await args.supabase.storage.from(args.bucket).download(args.path);
  if (error) throw error;
  const ab = await data.arrayBuffer();
  return new Uint8Array(ab);
}

async function getPrevImportId(args: {
  supabase: ReturnType<typeof createClient>;
  incaFileId?: string;
}): Promise<string | null> {
  let q = args.supabase.from("inca_imports").select("id, imported_at").order("imported_at", { ascending: false }).limit(1);
  if (args.incaFileId) q = q.eq("inca_file_id", args.incaFileId);
  const { data, error } = await q;
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

type SnapshotRow = {
  import_id: string;
  inca_file_id?: string | null;
  codice: string;
  situazione: Situazione;
  metri_teo: number | null;
  metri_dis: number | null;
  flag_changed_in_source: boolean;
  row_hash?: string | null;
};

type PrevState = {
  codice: string;
  situazione: Situazione | null;
  metri_teo: number | null;
  metri_dis: number | null;
  flag_changed_in_source: boolean;
};

async function loadSnapshotMap(args: {
  supabase: ReturnType<typeof createClient>;
  importId: string;
}): Promise<Map<string, PrevState>> {
  const map = new Map<string, PrevState>();
  const pageSize = 5000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await args.supabase
      .from("inca_cavi_snapshot")
      .select("codice, situazione, metri_teo, metri_dis, flag_changed_in_source")
      .eq("import_id", args.importId)
      .range(from, to);

    if (error) throw error;
    const rows = (data || []) as Array<{
      codice: string;
      situazione: string | null;
      metri_teo: number | null;
      metri_dis: number | null;
      flag_changed_in_source: boolean;
    }>;

    for (const r of rows) {
      const sit = r.situazione;
      map.set(r.codice, {
        codice: r.codice,
        situazione: isSituazione(sit) ? sit : null,
        metri_teo: r.metri_teo ?? null,
        metri_dis: r.metri_dis ?? null,
        flag_changed_in_source: !!r.flag_changed_in_source,
      });
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return map;
}

function pushEvent(events: IncaEvent[], ev: IncaEvent): void {
  events.push(ev);
}

function severityCounts(events: IncaEvent[]): { info: number; warn: number; block: number } {
  let info = 0,
    warn = 0,
    block = 0;
  for (const e of events) {
    if (e.severity === "INFO") info++;
    else if (e.severity === "WARN") warn++;
    else block++;
  }
  return { info, warn, block };
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders(req));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500, corsHeaders(req));

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = (await req.json()) as ReqBody;
    const incaFileId = body.inca_file_id ?? null;
    const sheetName = (body.sheet_name ?? "DATI").trim() || "DATI";

    // 1) Read XLSX bytes
    let xlsxBytes: Uint8Array | null = null;

    if (body.storage_bucket && body.storage_path) {
      xlsxBytes = await downloadXlsxFromStorage({ supabase, bucket: body.storage_bucket, path: body.storage_path });
    } else if (body.xlsx_base64) {
      const bin = Uint8Array.from(atob(body.xlsx_base64), (c) => c.charCodeAt(0));
      xlsxBytes = bin;
    } else {
      return json({ error: "Provide storage_bucket+storage_path OR xlsx_base64" }, 400, corsHeaders(req));
    }

    const checksum = await sha256Hex(xlsxBytes);

    // 2) Determine previous import for diff (same inca_file_id scope)
    const prevImportId = await getPrevImportId({ supabase, incaFileId: incaFileId ?? undefined });

    // 3) Create import event
    const { data: importIns, error: importErr } = await supabase
      .from("inca_imports")
      .insert({
        inca_file_id: incaFileId,
        file_name: body.file_name ?? null,
        checksum_sha256: checksum,
        note: body.note ?? null,
        source: "EXCEL_INCA",
      })
      .select("id, imported_at")
      .single();

    if (importErr) throw importErr;
    const importId = String(importIns.id);

    // 4) Parse Excel rows
    const rows = readSheetRowsFromXlsx(xlsxBytes.buffer, sheetName);
    const cables = parseCablesFromRows(rows);

    // De-dup by codice (keep last occurrence)
    const cableMap = new Map<string, ParsedCable>();
    for (const c of cables) cableMap.set(c.codice, c);
    const uniqueCables = [...cableMap.values()];
    const seenCodes = uniqueCables.map((c) => c.codice);

    // 5) Build and persist snapshot for this import
    const snapshotRows: SnapshotRow[] = uniqueCables.map((c) => ({
      import_id: importId,
      inca_file_id: incaFileId,
      codice: c.codice,
      situazione: c.situazione,
      metri_teo: c.metri_teo,
      metri_dis: c.metri_dis,
      flag_changed_in_source: c.flagged,
      row_hash: null,
    }));

    for (const part of chunk(snapshotRows, 1000)) {
      const { error } = await supabase.from("inca_cavi_snapshot").insert(part);
      if (error) throw error;
    }

    // 6) Upsert into inca_cavi
    // IMPORTANT: This assumes the existing unique constraint (inca_file_id, codice) is present.
    const upsertPayload = uniqueCables.map((c) => ({
      inca_file_id: incaFileId,
      codice: c.codice,
      situazione: c.situazione,
      metri_teo: c.metri_teo,
      metri_dis: c.metri_dis,
      flag_changed_in_source: c.flagged,
      last_import_id: importId,
      last_seen_in_import_at: new Date().toISOString(),
      missing_in_latest_import: false,
    }));

    let insertedCount = 0;
    let updatedCount = 0;

    // We cannot perfectly split insert vs update via PostgREST; we record as "upserted"
    for (const part of chunk(upsertPayload, 500)) {
      const { data, error } = await supabase
        .from("inca_cavi")
        .upsert(part, { onConflict: "inca_file_id,codice" })
        .select("codice");
      if (error) throw error;
      // best-effort: count as updated; exact split requires server-side logic
      updatedCount += (data || []).length;
    }

    // 7) Mark all other cables as missing_in_latest_import=true (scope: same inca_file_id)
    // Strategy: set true for all, then set false for seen codes in chunks.
    if (incaFileId) {
      const { error: missAllErr } = await supabase
        .from("inca_cavi")
        .update({ missing_in_latest_import: true })
        .eq("inca_file_id", incaFileId);
      if (missAllErr) throw missAllErr;

      for (const codesChunk of chunk(seenCodes, 500)) {
        const { error: seenErr } = await supabase
          .from("inca_cavi")
          .update({ missing_in_latest_import: false })
          .eq("inca_file_id", incaFileId)
          .in("codice", codesChunk);
        if (seenErr) throw seenErr;
      }
    }

    // 8) Diff with previous import snapshot to generate change events
    const events: IncaEvent[] = [];
    let disappearedAllowed = 0;
    let disappearedUnexpected = 0;
    let eliminatedCount = 0;
    let reinstatedCount = 0;
    let reworkCount = 0;
    let flaggedCount = 0;
    let metriDisChangedCount = 0;
    let metriTeoChangedCount = 0;

    const newMap = new Map<string, ParsedCable>();
    for (const c of uniqueCables) newMap.set(c.codice, c);

    let prevMap: Map<string, PrevState> | null = null;
    if (prevImportId) prevMap = await loadSnapshotMap({ supabase, importId: prevImportId });

    if (!prevMap) {
      // First import in this scope: only NEW + FLAGGED
      for (const c of uniqueCables) {
        pushEvent(events, { codice: c.codice, change_type: "NEW_CABLE", severity: "INFO", payload: { situazione: c.situazione } });
        if (c.flagged) {
          flaggedCount++;
          pushEvent(events, { codice: c.codice, change_type: "FLAGGED_BY_SOURCE", severity: "WARN", payload: { raw: "MARCA_CAVO_HAS_*" } });
        }
      }
    } else {
      // 8.1) New & changed
      for (const c of uniqueCables) {
        const prev = prevMap.get(c.codice);
        if (!prev) {
          pushEvent(events, { codice: c.codice, change_type: "NEW_CABLE", severity: "INFO", payload: { situazione: c.situazione } });
          if (c.flagged) {
            flaggedCount++;
            pushEvent(events, { codice: c.codice, change_type: "FLAGGED_BY_SOURCE", severity: "WARN", payload: { raw: "MARCA_CAVO_HAS_*" } });
          }
          continue;
        }

        // flagged-only
        if (c.flagged) {
          flaggedCount++;
          pushEvent(events, { codice: c.codice, change_type: "FLAGGED_BY_SOURCE", severity: "WARN", payload: { raw: "MARCA_CAVO_HAS_*" } });
        }

        const oldSit = prev.situazione;
        const newSit = c.situazione;

        const sitClass = classifySituazioneTransition({ oldSit, newSit, flaggedBySource: c.flagged });
        if (sitClass) {
          pushEvent(events, {
            codice: c.codice,
            change_type: sitClass.changeType,
            severity: sitClass.severity,
            field: "situazione",
            old_value: oldSit,
            new_value: newSit,
            payload: { flagged: c.flagged },
          });

          if (sitClass.changeType === "ELIMINATED") eliminatedCount++;
          if (sitClass.changeType === "REINSTATED_FROM_ELIMINATED") reinstatedCount++;
          if (sitClass.changeType === "REWORK_TO_LIBERO" || sitClass.changeType === "REWORK_TO_BLOCCATO") reworkCount++;
        }

        // metri_dis / metri_teo diffs
        const oldDis = prev.metri_dis ?? null;
        const newDis = c.metri_dis ?? null;
        if (oldDis !== newDis) {
          metriDisChangedCount++;
          const severity = oldDis !== null && newDis !== null && newDis < oldDis ? "BLOCK" : "WARN";
          pushEvent(events, {
            codice: c.codice,
            change_type: "METRI_DIS_CHANGED",
            severity,
            field: "metri_dis",
            old_value: oldDis,
            new_value: newDis,
          });
        }

        const oldTeo = prev.metri_teo ?? null;
        const newTeo = c.metri_teo ?? null;
        if (oldTeo !== newTeo) {
          metriTeoChangedCount++;
          pushEvent(events, {
            codice: c.codice,
            change_type: "METRI_TEO_CHANGED",
            severity: "WARN",
            field: "metri_teo",
            old_value: oldTeo,
            new_value: newTeo,
          });
        }
      }

      // 8.2) Disappeared
      for (const [codice, prev] of prevMap.entries()) {
        if (newMap.has(codice)) continue;

        const cls = classifyDisappearance(prev.situazione);
        if (cls.changeType === "DISAPPEARED_ALLOWED") disappearedAllowed++;
        else disappearedUnexpected++;

        pushEvent(events, {
          codice,
          change_type: cls.changeType,
          severity: cls.severity,
          payload: { old_situazione: prev.situazione },
        });
      }

      // 8.3) Reappeared (optional): if a code was missing in DB latest, but is now present, we'd need DB flag.
      // We rely on snapshot-based diff; "reappeared" is naturally captured as NEW_CABLE relative to prev snapshot.
    }

    // 9) Persist change events
    const dbEvents = events.map((e) => ({
      from_import_id: prevImportId,
      to_import_id: importId,
      inca_file_id: incaFileId,
      codice: e.codice,
      change_type: e.change_type,
      severity: e.severity,
      field: e.field ?? null,
      old_value: e.old_value ?? null,
      new_value: e.new_value ?? null,
      payload: e.payload ?? null,
    }));

    for (const part of chunk(dbEvents, 1000)) {
      const { error } = await supabase.from("inca_change_events").insert(part);
      if (error) throw error;
    }

    // 10) Update counters on inca_cavi for rework/eliminated/reinstated (best-effort per event type)
    // We update by selecting affected codes and applying increments; batched for safety.
    const reworkCodes = events
      .filter((e) => e.change_type === "REWORK_TO_LIBERO" || e.change_type === "REWORK_TO_BLOCCATO")
      .map((e) => e.codice);
    for (const codesChunk of chunk(reworkCodes, 300)) {
      if (!incaFileId || codesChunk.length === 0) break;
      const { error } = await supabase.rpc("inca_increment_rework", { p_inca_file_id: incaFileId, p_codes: codesChunk });
      // If RPC doesn't exist yet, ignore safely (you can add it later). We don't throw.
      if (error) console.warn("inca_increment_rework rpc missing or failed:", error.message);
    }

    const eliminatedCodes = events.filter((e) => e.change_type === "ELIMINATED").map((e) => e.codice);
    for (const codesChunk of chunk(eliminatedCodes, 300)) {
      if (!incaFileId || codesChunk.length === 0) break;
      const { error } = await supabase.rpc("inca_increment_eliminated", { p_inca_file_id: incaFileId, p_codes: codesChunk });
      if (error) console.warn("inca_increment_eliminated rpc missing or failed:", error.message);
    }

    const reinstatedCodes = events.filter((e) => e.change_type === "REINSTATED_FROM_ELIMINATED").map((e) => e.codice);
    for (const codesChunk of chunk(reinstatedCodes, 300)) {
      if (!incaFileId || codesChunk.length === 0) break;
      const { error } = await supabase.rpc("inca_increment_reinstated", { p_inca_file_id: incaFileId, p_codes: codesChunk });
      if (error) console.warn("inca_increment_reinstated rpc missing or failed:", error.message);
    }

    // 11) Summary
    const counts = severityCounts(events);
    const summary = {
      import_id: importId,
      prev_import_id: prevImportId,
      inca_file_id: incaFileId,
      checksum_sha256: checksum,
      total_rows: uniqueCables.length,
      updated_count: updatedCount,
      inserted_count: insertedCount,
      disappeared_allowed_count: disappearedAllowed,
      disappeared_unexpected_count: disappearedUnexpected,
      eliminated_count: eliminatedCount,
      reinstated_count: reinstatedCount,
      rework_count: reworkCount,
      flagged_count: flaggedCount,
      metri_dis_changed_count: metriDisChangedCount,
      metri_teo_changed_count: metriTeoChangedCount,
      info_count: counts.info,
      warn_count: counts.warn,
      block_count: counts.block,
    };

    const { error: sumErr } = await supabase.from("inca_import_summaries").upsert({
      import_id: importId,
      inca_file_id: incaFileId,
      total_rows: summary.total_rows,
      inserted_count: summary.inserted_count,
      updated_count: summary.updated_count,
      disappeared_allowed_count: summary.disappeared_allowed_count,
      disappeared_unexpected_count: summary.disappeared_unexpected_count,
      eliminated_count: summary.eliminated_count,
      reinstated_count: summary.reinstated_count,
      rework_count: summary.rework_count,
      flagged_count: summary.flagged_count,
      metri_dis_changed_count: summary.metri_dis_changed_count,
      metri_teo_changed_count: summary.metri_teo_changed_count,
      info_count: summary.info_count,
      warn_count: summary.warn_count,
      block_count: summary.block_count,
    });
    if (sumErr) throw sumErr;

    return json({ ok: true, summary }, 200, corsHeaders(req));
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: (e as Error).message ?? String(e) }, 500, corsHeaders(req));
  }
});
