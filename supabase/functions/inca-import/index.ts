// supabase/functions/inca-import/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { corsHeaders, withCors } from "../_shared/cors.ts";

type ImportMode = "DRY_RUN";

type InputSource = "storage_json" | "legacy_multipart";

type DryInput = {
  mode: ImportMode;
  costr: string;
  commessa: string;
  projectCode: string;
  note: string | null;
  fileName: string;
  bytes: ArrayBuffer;
  sizeBytes: number;
  inputSource: InputSource;
  storageBucket: string | null;
  storagePath: string | null;
};

type DryRunErrorSample = {
  row: number;
  reason: string;
  detail?: string;
};

const LEGACY_MAX_BYTES = 2 * 1024 * 1024;
const MAX_ERROR_SAMPLES = 50;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normText(v: unknown): string {
  return String(v ?? "").trim();
}

function canonKey(header: unknown): string {
  const s = String(header ?? "").trim().toUpperCase();
  const noMarks = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return noMarks
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCodice(v: unknown): string {
  const s = String(v ?? "")
    .replace(/\u00A0/g, " ")
    .normalize("NFKC")
    .trim();
  return s.replace(/\s+/g, " ");
}

function pickFirst(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function normalizeSituazione(raw: unknown): {
  value: "P" | "T" | "R" | "B" | "E" | null;
  progressPercent: number | null;
  nonStandard?: string;
} {
  const s0 = String(raw ?? "").trim().toUpperCase();
  if (!s0) return { value: null, progressPercent: null };

  if (s0 === "P") return { value: "P", progressPercent: 100 };
  if (s0 === "5") return { value: "P", progressPercent: 50 };
  if (s0 === "7") return { value: "P", progressPercent: 70 };

  const s = s0[0];
  if (s === "L") return { value: null, progressPercent: null };
  if (s === "P" || s === "T" || s === "R" || s === "B" || s === "E") {
    return { value: s, progressPercent: s === "P" ? 100 : null };
  }

  if (s0.includes("POS")) return { value: "P", progressPercent: 100 };
  if (s0.includes("DA") && s0.includes("POS")) return { value: "T", progressPercent: null };
  if (s0.includes("RIP")) return { value: "R", progressPercent: null };
  if (s0.includes("BLO")) return { value: "B", progressPercent: null };
  if (s0.includes("ESEG")) return { value: "E", progressPercent: null };

  return { value: null, progressPercent: null, nonStandard: s0 };
}

function inferFileNameFromPath(path: string): string {
  const parts = String(path || "").split("/");
  return parts.length ? parts[parts.length - 1] || "inca.xlsx" : "inca.xlsx";
}

async function readInput(req: Request, admin: any): Promise<DryInput> {
  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  const isJson = contentType.includes("application/json");
  const isMultipart = contentType.includes("multipart/form-data");

  if (isJson) {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = String(body.mode || "DRY_RUN").trim().toUpperCase();
    if (mode !== "DRY_RUN") {
      throw new Error(`Invalid mode for inca-import: ${mode}. Supported: DRY_RUN only.`);
    }

    const storageBucket = normText(body.storage_bucket);
    const storagePath = normText(body.storage_path);
    const costr = normText(body.costr);
    const commessa = normText(body.commessa);
    const projectCode = normText(body.projectCode);
    const note = normText(body.note) || null;
    if (!storageBucket || !storagePath) throw new Error("storage_bucket/storage_path mancanti.");
    if (!costr || !commessa) throw new Error("costr/commessa mancanti.");

    const { data, error } = await admin.storage.from(storageBucket).download(storagePath);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message || "unknown error"}`);
    const bytes = await data.arrayBuffer();
    const fileName = normText(body.file_name) || inferFileNameFromPath(storagePath);

    return {
      mode: "DRY_RUN",
      costr,
      commessa,
      projectCode,
      note,
      fileName,
      bytes,
      sizeBytes: bytes.byteLength,
      inputSource: "storage_json",
      storageBucket,
      storagePath,
    };
  }

  if (isMultipart || !contentType) {
    const form = await req.formData();
    const mode = normText(form.get("mode")).toUpperCase();
    if (mode && mode !== "DRY_RUN") {
      throw new Error(`Invalid mode for inca-import: ${mode}. Supported: DRY_RUN only.`);
    }

    const costr = normText(form.get("costr"));
    const commessa = normText(form.get("commessa"));
    const projectCode = normText(form.get("projectCode"));
    const note = normText(form.get("note")) || null;
    if (!costr || !commessa) throw new Error("costr/commessa mancanti.");

    const f = form.get("file");
    if (!(f instanceof File)) throw new Error("file mancante");
    if (Number(f.size || 0) > LEGACY_MAX_BYTES) {
      throw new Error(
        `Legacy multipart file too large (${f.size} bytes). Use Storage-first upload (storage_bucket + storage_path).`
      );
    }
    const bytes = await f.arrayBuffer();

    return {
      mode: "DRY_RUN",
      costr,
      commessa,
      projectCode,
      note,
      fileName: f.name || "inca.xlsx",
      bytes,
      sizeBytes: bytes.byteLength,
      inputSource: "legacy_multipart",
      storageBucket: null,
      storagePath: null,
    };
  }

  throw new Error(`Unsupported content-type: ${contentType}`);
}

function dryRunAnalyzeXlsx(bytes: ArrayBuffer): {
  totalRows: number;
  rowsWithCode: number;
  headerColumns: number;
  sheetName: string;
  headerRowIndex0: number;
  counts: Record<string, number>;
  progressCounts: Record<string, number>;
  nonStandardStatuses: string[];
  errors: DryRunErrorSample[];
} {
  const u8 = new Uint8Array(bytes);
  const wb = XLSX.read(u8, { type: "array" });
  const sheetNames = wb.SheetNames || [];
  if (!sheetNames.length) throw new Error("XLSX: nessun foglio trovato.");

  const datiName = sheetNames.find((n) => String(n).trim().toUpperCase() === "DATI") ?? null;
  const chosenName = datiName || sheetNames[0];
  const sheet = wb.Sheets[chosenName];
  if (!sheet) throw new Error("XLSX: foglio non disponibile.");

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const maxScanRows = Math.min(50, aoa.length);
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < maxScanRows; i++) {
    const row = aoa[i] || [];
    let score = 0;
    let hasCode = false;
    let hasStatus = false;
    for (const cell of row) {
      const key = canonKey(cell);
      if (key === "CODICE" || key === "MARCA_CAVO" || key === "MARCA" || key === "MARCA_PEZZO" || key === "CODICE_CAVO") {
        score += 6;
        hasCode = true;
      } else if (key === "STATO" || key === "STATO_CANTIERE" || key === "SITUAZIONE" || key === "STATO_INCA") {
        score += 6;
        hasStatus = true;
      } else if (key.startsWith("LUNGHEZZA")) {
        score += 2;
      }
    }
    if (hasCode && hasStatus && score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) {
    throw new Error("XLSX: impossible de détecter les en-têtes (attendu: CODICE + STATO/STATO CANTIERE).");
  }

  const headerRow = aoa[bestIdx] || [];
  const headers = headerRow.map((h, idx) => {
    const k = canonKey(h);
    return k ? k : `COL_${idx + 1}`;
  });

  const counts: Record<string, number> = { L: 0, R: 0, T: 0, B: 0, P: 0, E: 0, NP: 0 };
  const progressCounts: Record<string, number> = { p50: 0, p70: 0, p100: 0, pNull: 0 };
  const nonStandardStatuses = new Set<string>();
  const errors: DryRunErrorSample[] = [];

  let totalRows = 0;
  let rowsWithCode = 0;
  for (let r = bestIdx + 1; r < aoa.length; r++) {
    const line = aoa[r] || [];
    if (!line.some((v) => String(v ?? "").trim() !== "")) continue;
    totalRows += 1;

    const row: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) row[headers[c]] = line[c] ?? null;

    const codiceRaw = pickFirst(row, ["MARCA_CAVO", "MARCA", "MARCA_PEZZO", "CODICE", "CODICE_CAVO", "CAVO"]);
    const codice = normalizeCodice(codiceRaw);
    if (!codice) {
      if (errors.length < MAX_ERROR_SAMPLES) {
        errors.push({ row: r + 1, reason: "MISSING_CODE" });
      }
      continue;
    }
    rowsWithCode += 1;

    const statoRaw = pickFirst(row, ["STATO_CANTIERE", "SITUAZIONE", "STATO", "STATO_INCA"]);
    const normalized = normalizeSituazione(statoRaw);
    if (normalized.nonStandard) {
      nonStandardStatuses.add(normalized.nonStandard);
      if (errors.length < MAX_ERROR_SAMPLES) {
        errors.push({
          row: r + 1,
          reason: "NON_STANDARD_STATUS",
          detail: normalized.nonStandard,
        });
      }
    }

    const s = normalized.value;
    if (s === "P" || s === "T" || s === "R" || s === "B" || s === "E") counts[s] += 1;
    else counts.L += 1;

    if (normalized.progressPercent === 50) progressCounts.p50 += 1;
    else if (normalized.progressPercent === 70) progressCounts.p70 += 1;
    else if (normalized.progressPercent === 100) progressCounts.p100 += 1;
    else progressCounts.pNull += 1;
  }

  counts.NP = counts.L + counts.T + counts.B + counts.R;

  return {
    totalRows,
    rowsWithCode,
    headerColumns: headers.length,
    sheetName: chosenName,
    headerRowIndex0: bestIdx,
    counts,
    progressCounts,
    nonStandardStatuses: [...nonStandardStatuses].slice(0, 50),
    errors,
  };
}

serve(
  withCors(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const startedAt = Date.now();
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) {
      return json(500, { ok: false, error: "Missing Supabase env: SUPABASE_URL/ANON/SERVICE_ROLE" });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader) return json(401, { ok: false, error: "Missing Authorization header" });

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(url, serviceKey, {
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
      auth: { persistSession: false },
    });

    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json(401, { ok: false, error: "Invalid user session" });

    try {
      const input = await readInput(req, admin);
      const parsed = dryRunAnalyzeXlsx(input.bytes);
      const durationMs = Date.now() - startedAt;

      console.log("[inca-import] dry-run", {
        userId: u.user.id,
        inputSource: input.inputSource,
        sizeBytes: input.sizeBytes,
        totalRows: parsed.totalRows,
        rowsWithCode: parsed.rowsWithCode,
        durationMs,
      });

      return json(200, {
        ok: true,
        mode: "DRY_RUN",
        total: parsed.rowsWithCode,
        received: {
          costr: input.costr,
          commessa: input.commessa,
          projectCode: input.projectCode || null,
          fileName: input.fileName,
        },
        meta: {
          costr: input.costr,
          commessa: input.commessa,
          projectCode: input.projectCode || null,
          fileName: input.fileName,
          sizeBytes: input.sizeBytes,
          sheetName: parsed.sheetName,
          headerRowIndex0: parsed.headerRowIndex0,
          headerColumns: parsed.headerColumns,
          totalRows: parsed.totalRows,
          rowsWithCode: parsed.rowsWithCode,
          rowsInvalid: Math.max(0, parsed.totalRows - parsed.rowsWithCode),
          inputSource: input.inputSource,
        },
        counts: {
          ...parsed.counts,
          situazione: parsed.counts,
          progress: parsed.progressCounts,
          nonStandardStatusesCount: parsed.nonStandardStatuses.length,
        },
        samples: {
          errors: parsed.errors.slice(0, MAX_ERROR_SAMPLES),
          nonStandardStatuses: parsed.nonStandardStatuses.slice(0, MAX_ERROR_SAMPLES),
        },
        debug: {
          storageBucket: input.storageBucket,
          storagePath: input.storagePath,
          durationMs,
          note: "DRY_RUN only. No DB write side-effects.",
        },
      });
    } catch (e) {
      const msg = String((e as Error)?.message || e || "Unhandled error");
      const status =
        msg.includes("too large") ? 413 :
        msg.includes("mancanti") || msg.includes("Invalid mode") || msg.includes("Unsupported content-type") ? 400 :
        500;
      return json(status, { ok: false, error: msg });
    }
  }),
);
