// supabase/functions/inca-sync/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

import { corsHeaders, withCors } from "../_shared/cors.ts";

type ParsedCable = {
  codice: string;
  codice_inca: string | null;
  marca_cavo: string | null;
  descrizione: string | null;

  tipo: string | null;
  sezione: string | null;
  livello_disturbo: string | null;

  stato_tec: string | null;
  stato_cantiere: string | null;

  impianto: string | null;

  zona_da: string | null;
  zona_a: string | null;

  apparato_da: string | null;
  apparato_a: string | null;

  descrizione_da: string | null;
  descrizione_a: string | null;

  metri_teo: number | null;
  metri_dis: number | null;

  wbs: string | null;
  pagina_pdf: string | null;

  // Canon: nullable. null == L (and contributes to NP)
  situazione: "P" | "T" | "R" | "B" | "E" | null;
  situazione_raw: string | null;

  // Progress derived from stato cantiere (5 => 50%, 7 => 70%, P => 100%).
  // NOTE: when progress is 50/70, situazione must be treated as P in UI.
  progress_percent: 50 | 70 | 100 | null;
};

type DiffItem = {
  codice: string;
  fields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};

type DiffResult = {
  previousIncaFileId: string | null;
  newIncaFileId: string | null;
  added: string[];
  removed: string[];
  changed: DiffItem[];
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normText(v: unknown): string {
  return String(v ?? "").trim();
}

function asUuidOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) return null;
  return s;
}

function canonKey(header: unknown): string {
  const s = String(header ?? "").trim().toUpperCase();
  const noMarks = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return noMarks
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const s2 = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(s2);
  if (Number.isNaN(n)) return null;
  return n;
}

function normalizeSituazione(raw: unknown): { value: ParsedCable["situazione"]; raw: string | null } {
  const s0 = String(raw ?? "").trim().toUpperCase();
  if (!s0) return { value: null, raw: null };

  const s = s0[0];

  // Explicit L means null
  if (s === "L") return { value: null, raw: s0 };

  if (s === "P" || s === "T" || s === "R" || s === "B" || s === "E") return { value: s, raw: s0 };

  // soft mapping
  if (s0.includes("POS")) return { value: "P", raw: s0 };
  if (s0.includes("TAG")) return { value: "T", raw: s0 };
  if (s0.includes("RIF")) return { value: "R", raw: s0 };
  if (s0.includes("BLO")) return { value: "B", raw: s0 };
  if (s0.includes("ELI")) return { value: "E", raw: s0 };

  // Unknown -> null (L)
  return { value: null, raw: s0 };
}

function normalizeProgressFromStatoCantiere(raw: unknown): {
  progress: ParsedCable["progress_percent"];
  situazione: ParsedCable["situazione"];
  raw: string | null;
} {
  const s0 = String(raw ?? "").trim().toUpperCase();
  if (!s0) return { progress: null, situazione: null, raw: null };

  // Confirmed rule (user):
  // - Excel shows 5 => progress 50% (situazione must be P)
  // - Excel shows 7 => progress 70% (situazione must be P)
  // - Excel shows P => progress 100% (situazione P)
  // - Otherwise: canonical mapping for T/R/B/E/L
  if (s0 === "5" || s0.startsWith("5 ") || s0.startsWith("5%")) return { progress: 50, situazione: "P", raw: s0 };
  if (s0 === "7" || s0.startsWith("7 ") || s0.startsWith("7%")) return { progress: 70, situazione: "P", raw: s0 };
  if (s0[0] === "P") return { progress: 100, situazione: "P", raw: s0 };

  const { value, raw: r } = normalizeSituazione(s0);
  return { progress: null, situazione: value, raw: r };
}

function buildGroupKey(costr: string, commessa: string, projectCode: string) {
  const a = normText(costr).toLowerCase();
  const b = normText(commessa).toLowerCase();
  const c = normText(projectCode).toLowerCase();
  return `${a}|${b}|${c}`;
}

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = enc.encode(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const b = new Uint8Array(hash);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function pickFirst(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function buildRowCanonical(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[canonKey(k)] = v;
  return out;
}

function parseXlsxCables(arrayBuffer: ArrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const wb = XLSX.read(u8, { type: "array" });
  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) throw new Error("XLSX: nessun foglio trovato.");

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

  const maxScanRows = Math.min(80, aoa.length);
  let bestIdx = -1;
  let bestScore = -1;

  const headerKeyScore = (k: string): number => {
    if (k === "MARCA_CAVO" || k === "MARCA" || k === "MARCA_PEZZO" || k === "CODICE" || k === "CODICE_CAVO") return 6;
    // Status column is mandatory for our naval-grade sync rules (P/T/R/B/E + progress 5/7).
    if (k === "STATO_CANTIERE" || k === "SITUAZIONE" || k === "SITUAZIONE_CAVO" || k === "STATO") return 7;
    if (k.startsWith("LUNGHEZZA")) return 2;
    if (k === "TIPO" || k === "TIPO_CAVO" || k === "SEZIONE") return 1;
    if (k === "WBS") return 1;
    if (k.startsWith("APP") || k.startsWith("APPARATO")) return 1;
    return 0;
  };

  for (let i = 0; i < maxScanRows; i++) {
    const row = aoa[i] || [];
    let score = 0;
    let hasCode = false;

    for (const cell of row) {
      const key = canonKey(cell);
      const s = headerKeyScore(key);
      score += s;
      if (s >= 6 && (key === "CODICE" || key === "MARCA_CAVO" || key === "MARCA" || key === "MARCA_PEZZO" || key === "CODICE_CAVO")) hasCode = true;
    }

    if (hasCode && score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx < 0) {
    throw new Error("XLSX: impossibile rilevare la riga intestazioni (attesi header tipo MARCA CAVO / CODICE / CODICE CAVO).");
  }

  const headerRow = aoa[bestIdx] || [];
  const headers = headerRow.map((h, idx) => {
    const k = canonKey(h);
    return k ? k : `COL_${idx + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let r = bestIdx + 1; r < aoa.length; r++) {
    const line = aoa[r] || [];
    const hasAny = line.some((v) => String(v ?? "").trim() !== "");
    if (!hasAny) continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = line[c] ?? null;
    rows.push(obj);
  }

  const parsed: ParsedCable[] = [];
  const nonStandardSituazioneRaw = new Set<string>();
  const seenCodici = new Set<string>();
  const duplicateCodici = new Set<string>();

  for (const r of rows) {
    const row = buildRowCanonical(r);

    const codiceRaw = pickFirst(row, ["MARCA_CAVO", "MARCA", "MARCA_PEZZO", "CODICE", "CODICE_CAVO", "CAVO"]);
    const codice = normText(codiceRaw);
    if (!codice) continue;

    if (seenCodici.has(codice)) duplicateCodici.add(codice);
    else seenCodici.add(codice);

    const codiceInca = normText(pickFirst(row, ["CODICE_CAVO", "CODICE_INCA"])) || null;
    const marcaCavo = normText(pickFirst(row, ["MARCA_CAVO", "MARCA"])) || null;

    const descrizione = normText(pickFirst(row, ["DESCRIZIONE", "DESCR"])) || null;
    const tipo = normText(pickFirst(row, ["TIPO_CAVO", "TIPO", "TYPE"])) || null;
    const sezione = normText(pickFirst(row, ["SEZIONE", "SEC", "SECTION"])) || null;
    const livelloDisturbo = normText(pickFirst(row, ["LIVELLO_DISTURBO"])) || null;

    const statoTec = normText(pickFirst(row, ["STATO_TEC"])) || null;
    const statoCantiereRaw = normText(pickFirst(row, ["STATO_CANTIERE"])) || null;

    // Stato cantiere is also the source of progress (5/7/P). We keep raw + normalized.
    const rawSitCandidate = pickFirst(row, ["STATO_CANTIERE", "SITUAZIONE_CAVO", "SITUAZIONE", "STATO"]);
    const { progress: progressPercent, situazione, raw: situazioneRaw } = normalizeProgressFromStatoCantiere(rawSitCandidate);
    if (situazioneRaw && progressPercent === null && situazione === null && situazioneRaw !== "L") nonStandardSituazioneRaw.add(situazioneRaw);

    const impianto = normText(pickFirst(row, ["IMPIANTO", "PLANT"])) || null;

    const zonaDa = normText(pickFirst(row, ["ZONA_DA", "ZONA_D", "ZONA_FROM", "ZONA_DA_"])) || null;
    const zonaA = normText(pickFirst(row, ["ZONA_A", "ZONA_TO", "ZONA_A_"])) || null;

    const apparatoDa = normText(pickFirst(row, ["APP_PARTENZA", "APPARATO_DA", "APPARATO_D", "FROM_APPARATO", "APPARATO_FROM", "APP_PARTENZA_"])) || null;
    const apparatoA = normText(pickFirst(row, ["APP_ARRIVO", "APPARATO_A", "APPARATO_TO", "TO_APPARATO", "APPARATO_TO_", "APP_ARRIVO_"])) || null;

    const descrDa = normText(pickFirst(row, ["APP_PARTENZA_DESCRIZIONE", "DESCRIZIONE_DA", "DESCR_DA", "DESCRIZIONE_FROM"])) || null;
    const descrA = normText(pickFirst(row, ["APP_ARRIVO_DESCRIZIONE", "DESCRIZIONE_A", "DESCR_A", "DESCRIZIONE_TO"])) || null;

    const metriTeo = safeNumber(pickFirst(row, ["LUNGHEZZA_DI_DISEGNO", "LUNGHEZZA_DISEGNO", "METRI_TEO", "METRI_TEORICI"]));
    const metriDis = safeNumber(pickFirst(row, ["LUNGHEZZA_DI_POSA", "LUNGHEZZA_POSA", "METRI_DIS", "METRI_POSATI"]));

    const wbs = normText(pickFirst(row, ["WBS"])) || null;
    const paginaPdf = normText(pickFirst(row, ["PAGINA_PDF", "PAGINA", "PAGE", "FOGLIO"])) || null;

    parsed.push({
      codice,
      codice_inca: codiceInca || null,
      marca_cavo: marcaCavo,
      descrizione,
      tipo,
      sezione,
      livello_disturbo: livelloDisturbo || null,
      stato_tec: statoTec || null,
      stato_cantiere: statoCantiereRaw || null,
      impianto,
      zona_da: zonaDa,
      zona_a: zonaA,
      apparato_da: apparatoDa,
      apparato_a: apparatoA,
      descrizione_da: descrDa,
      descrizione_a: descrA,
      metri_teo: metriTeo,
      metri_dis: metriDis,
      wbs,
      pagina_pdf: paginaPdf,
      situazione,
      situazione_raw: situazioneRaw,
      progress_percent: progressPercent,
    });
  }

  return {
    sheetName: chosenName,
    headerRowIndex0: bestIdx,
    totalRows: rows.length,
    cables: parsed,
    nonStandardSituazioneRaw: [...nonStandardSituazioneRaw],
    duplicateCodici: [...duplicateCodici].sort(),
  };
}

function computeCounts(cables: ParsedCable[]) {
  const counts: Record<string, number> = { L: 0, R: 0, T: 0, B: 0, P: 0, E: 0, NP: 0 };
  for (const c of cables) {
    const s = c.situazione;
    if (s === "P" || s === "T" || s === "R" || s === "B" || s === "E") counts[s] += 1;
    else counts.L += 1;
  }
  counts.NP = counts.L + counts.R + counts.T + counts.B;
  return counts;
}

function computeProgressCounts(cables: ParsedCable[]) {
  const out: Record<string, number> = { p50: 0, p70: 0, p100: 0, pNull: 0 };
  for (const c of cables) {
    if (c.progress_percent === 50) out.p50 += 1;
    else if (c.progress_percent === 70) out.p70 += 1;
    else if (c.progress_percent === 100) out.p100 += 1;
    else out.pNull += 1;
  }
  return out;
}

function dedupeByCodice(cables: ParsedCable[]) {
  // If the same codice appears multiple times in the XLSX, we must collapse it.
  // Strategy: keep the row that has more non-empty data; keep MAX progress.
  const score = (c: ParsedCable) => {
    let s = 0;
    const bump = (v: unknown) => {
      if (v === null || v === undefined) return;
      if (typeof v === "string" && !v.trim()) return;
      s += 1;
    };
    bump(c.codice_inca);
    bump(c.marca_cavo);
    bump(c.descrizione);
    bump(c.tipo);
    bump(c.sezione);
    bump(c.livello_disturbo);
    bump(c.stato_tec);
    bump(c.stato_cantiere);
    bump(c.impianto);
    bump(c.zona_da);
    bump(c.zona_a);
    bump(c.apparato_da);
    bump(c.apparato_a);
    bump(c.descrizione_da);
    bump(c.descrizione_a);
    if (c.metri_teo != null) s += 1;
    if (c.metri_dis != null) s += 1;
    bump(c.wbs);
    bump(c.pagina_pdf);
    bump(c.situazione);
    if (c.progress_percent != null) s += 1;
    return s;
  };

  const by = new Map<string, ParsedCable>();
  const duplicates: string[] = [];

  const keepStr = (a: string | null, b: string | null) => {
    const as = (a ?? "").trim();
    if (as) return a;
    const bs = (b ?? "").trim();
    if (bs) return b;
    return null;
  };

  for (const c of cables) {
    const k = c.codice;
    const prev = by.get(k);
    if (!prev) {
      by.set(k, c);
      continue;
    }

    duplicates.push(k);

    const a = prev;
    const b = c;
    const best = score(b) > score(a) ? b : a;
    const other = best === a ? b : a;

    const merged: ParsedCable = {
      ...best,
      codice_inca: keepStr(best.codice_inca, other.codice_inca),
      marca_cavo: keepStr(best.marca_cavo, other.marca_cavo),
      descrizione: keepStr(best.descrizione, other.descrizione),
      tipo: keepStr(best.tipo, other.tipo),
      sezione: keepStr(best.sezione, other.sezione),
      livello_disturbo: keepStr(best.livello_disturbo, other.livello_disturbo),
      stato_tec: keepStr(best.stato_tec, other.stato_tec),
      stato_cantiere: keepStr(best.stato_cantiere, other.stato_cantiere),
      impianto: keepStr(best.impianto, other.impianto),
      zona_da: keepStr(best.zona_da, other.zona_da),
      zona_a: keepStr(best.zona_a, other.zona_a),
      apparato_da: keepStr(best.apparato_da, other.apparato_da),
      apparato_a: keepStr(best.apparato_a, other.apparato_a),
      descrizione_da: keepStr(best.descrizione_da, other.descrizione_da),
      descrizione_a: keepStr(best.descrizione_a, other.descrizione_a),
      wbs: keepStr(best.wbs, other.wbs),
      pagina_pdf: keepStr(best.pagina_pdf, other.pagina_pdf),
      metri_teo: best.metri_teo ?? other.metri_teo ?? null,
      metri_dis: best.metri_dis ?? other.metri_dis ?? null,
      progress_percent: (Math.max(best.progress_percent ?? 0, other.progress_percent ?? 0) || null) as any,
    };

    if (best.situazione === "P" || other.situazione === "P") merged.situazione = "P";
    else merged.situazione = best.situazione ?? other.situazione ?? null;

    by.set(k, merged);
  }

  duplicates.sort();
  const distinct = [...new Set(duplicates)];
  return {
    unique: [...by.values()],
    duplicateCount: duplicates.length,
    duplicateDistinct: distinct.length,
    sampleCodici: distinct.slice(0, 50),
  };
}

function toDbComparable(c: ParsedCable) {
  return {
    situazione: c.situazione,
    progress_percent: c.progress_percent,
    metri_teo: c.metri_teo,
    metri_dis: c.metri_dis,
    tipo: c.tipo,
    sezione: c.sezione,
    livello_disturbo: c.livello_disturbo,
    stato_tec: c.stato_tec,
    stato_cantiere: c.stato_cantiere,
    apparato_da: c.apparato_da,
    apparato_a: c.apparato_a,
    zona_da: c.zona_da,
    zona_a: c.zona_a,
    wbs: c.wbs,
    pagina_pdf: c.pagina_pdf,
  };
}

function diffCables(prev: ParsedCable[], next: ParsedCable[], previousIncaFileId: string | null, newIncaFileId: string | null): DiffResult {
  const prevBy = new Map<string, ParsedCable>();
  for (const c of prev) prevBy.set(c.codice, c);

  const nextBy = new Map<string, ParsedCable>();
  for (const c of next) nextBy.set(c.codice, c);

  const added: string[] = [];
  const removed: string[] = [];
  const changed: DiffItem[] = [];

  for (const codice of nextBy.keys()) if (!prevBy.has(codice)) added.push(codice);
  for (const codice of prevBy.keys()) if (!nextBy.has(codice)) removed.push(codice);

  for (const [codice, n] of nextBy.entries()) {
    const p = prevBy.get(codice);
    if (!p) continue;

    const before = toDbComparable(p);
    const after = toDbComparable(n);

    const fields: string[] = [];
    for (const k of Object.keys(after)) {
      const b = (before as any)[k];
      const a = (after as any)[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) fields.push(k);
    }

    if (fields.length > 0) changed.push({ codice, fields, before, after });
  }

  added.sort();
  removed.sort();
  changed.sort((a, b) => a.codice.localeCompare(b.codice));

  return { previousIncaFileId, newIncaFileId, added, removed, changed };
}

function mergeNonDestructive(prev: any | null, incoming: ParsedCable) {
  const keep = (next: any, old: any) => {
    const s = typeof next === "string" ? next.trim() : next;
    if (s === "" || s === undefined || s === null) return old ?? null;
    return next;
  };

  const keepNum = (next: number | null, old: any) => {
    if (next === null || next === undefined) return old ?? null;
    if (Number.isNaN(next)) return old ?? null;
    return next;
  };

  const keepSituazione = (next: ParsedCable["situazione"], old: any) => {
    if (next === undefined) return old ?? null;
    if (next === null) {
      // do NOT overwrite to null if source is empty/unknown;
      // only overwrite to null if raw explicitly says L.
      if (incoming.situazione_raw && incoming.situazione_raw.trim().toUpperCase().startsWith("L")) return null;
      return old ?? null;
    }
    return next;
  };

  return {
    codice: incoming.codice,
    costr: prev?.costr ?? null,
    commessa: prev?.commessa ?? null,

    codice_inca: keep(incoming.codice_inca, prev?.codice_inca),
    marca_cavo: keep(incoming.marca_cavo, prev?.marca_cavo),
    descrizione: keep(incoming.descrizione, prev?.descrizione),

    tipo: keep(incoming.tipo, prev?.tipo),
    sezione: keep(incoming.sezione, prev?.sezione),
    livello_disturbo: keep(incoming.livello_disturbo, prev?.livello_disturbo),

    stato_tec: keep(incoming.stato_tec, prev?.stato_tec),
    stato_cantiere: keep(incoming.stato_cantiere, prev?.stato_cantiere),

    impianto: keep(incoming.impianto, prev?.impianto),

    zona_da: keep(incoming.zona_da, prev?.zona_da),
    zona_a: keep(incoming.zona_a, prev?.zona_a),

    apparato_da: keep(incoming.apparato_da, prev?.apparato_da),
    apparato_a: keep(incoming.apparato_a, prev?.apparato_a),

    descrizione_da: keep(incoming.descrizione_da, prev?.descrizione_da),
    descrizione_a: keep(incoming.descrizione_a, prev?.descrizione_a),

    metri_teo: keepNum(incoming.metri_teo, prev?.metri_teo),
    metri_dis: keepNum(incoming.metri_dis, prev?.metri_dis),

    wbs: keep(incoming.wbs, prev?.wbs),
    pagina_pdf: keep(incoming.pagina_pdf, prev?.pagina_pdf),

    situazione: keepSituazione(incoming.situazione, prev?.situazione),

    // progress: do not overwrite with null.
    progress_percent: (incoming.progress_percent ?? prev?.progress_percent ?? null) as any,
  };
}

serve(
  withCors(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json(500, { ok: false, error: "Missing Supabase env: SUPABASE_URL/ANON/SERVICE_ROLE" });

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
    const user = u.user;

    const form = await req.formData();

    const costr = normText(form.get("costr"));
    const commessa = normText(form.get("commessa"));
    const projectCode = normText(form.get("projectCode"));
    const note = normText(form.get("note")) || null;
    const shipIdFromBody = asUuidOrNull(form.get("shipId"));
    const force = normText(form.get("force")).toLowerCase() === "true";

    if (!costr || !commessa) return json(400, { ok: false, error: "costr/commessa mancanti" });

    const f = form.get("file");
    if (!(f instanceof File)) return json(400, { ok: false, error: "file mancante" });

    const fileName = f.name || "inca.xlsx";
    const ab = await f.arrayBuffer();

    const parsed = parseXlsxCables(ab);
    if (parsed.cables.length === 0) return json(400, { ok: false, error: "Nessun cavo trovato nel XLSX." });

    // Deduplicate same-codice rows inside the XLSX (safety: avoid insert/upsert conflicts).
    const dedup = dedupeByCodice(parsed.cables);
    const uniqueCables = dedup.unique;

    const counts = computeCounts(uniqueCables);
    const progressCounts = computeProgressCounts(uniqueCables);

    const groupKey = buildGroupKey(costr, commessa, projectCode);
    const sorted = [...uniqueCables].sort((a, b) => a.codice.localeCompare(b.codice));
    const canonLines = sorted.map((c) =>
      [
        c.codice,
        c.codice_inca || "",
        c.metri_teo ?? "",
        c.metri_dis ?? "",
        c.situazione ?? "",
        c.progress_percent ?? "",
        c.tipo || "",
        c.sezione || "",
        c.livello_disturbo || "",
        c.stato_tec || "",
        c.stato_cantiere || "",
        c.apparato_da || "",
        c.apparato_a || "",
        c.wbs || "",
        c.pagina_pdf || "",
      ].join("|"),
    );
    const contentHash = await sha256Hex(canonLines.join("\n"));

    // HEAD STABLE: prefer previous_inca_file_id IS NULL (head).
    // Fallback rule: if projectCode changed (group_key mismatch), still try to match by costr/commessa.
    const headRes = await admin
      .from("inca_files")
      .select("id,ship_id,content_hash,file_name,uploaded_at,previous_inca_file_id,import_run_id,group_key,costr,commessa,project_code")
      .eq("file_type", "XLSX")
      .or(`group_key.eq.${groupKey},and(costr.eq.${costr},commessa.eq.${commessa})`)
      .order("uploaded_at", { ascending: true })
      .limit(80);

    if (headRes.error) return json(500, { ok: false, error: "inca_files read failed", detail: headRes.error.message });

    const headCandidates = Array.isArray(headRes.data) ? headRes.data : [];
    let head = headCandidates.find((r: any) => r.previous_inca_file_id == null) ?? headCandidates[0] ?? null;

    // If no head exists, create it (first import)
    if (!head) {
      // ship_id is mandatory. If missing, infer from latest XLSX for same costr/commessa.
      let shipId: string | null = shipIdFromBody;
      if (!shipId) {
        const prevShip = await admin
          .from("inca_files")
          .select("ship_id,uploaded_at")
          .eq("costr", costr)
          .eq("commessa", commessa)
          .eq("file_type", "XLSX")
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!prevShip.error && prevShip.data?.ship_id) shipId = String(prevShip.data.ship_id);
      }
      if (!shipId) {
        return json(400, {
          ok: false,
          error: "shipId mancante: invia shipId nel form-data (UUID) oppure importa prima almeno un file con shipId valido per questa commessa.",
        });
      }

      const insHead = await admin
        .from("inca_files")
        .insert({
          ship_id: shipId,
          costr,
          commessa,
          project_code: projectCode || null,
          file_name: fileName,
          file_type: "XLSX",
          note,
          uploaded_by: user.id,
          file_path: null,
          group_key: groupKey,
          content_hash: contentHash,
          previous_inca_file_id: null,
          import_run_id: null,
        })
        .select("id,ship_id,content_hash,file_name,uploaded_at,previous_inca_file_id,import_run_id")
        .single();

      if (insHead.error || !insHead.data?.id) return json(500, { ok: false, error: "Insert head inca_files failed", detail: insHead.error?.message });
      head = insHead.data;
    }

    const headId = String((head as any).id);
    const previousHash = (head as any).content_hash ?? null;
    const isDuplicate = !!(previousHash && previousHash === contentHash);

    if (isDuplicate && !force) {
      return json(200, {
        ok: true,
        skipped: true,
        reason: "DUPLICATE_CONTENT_HASH",
        headIncaFileId: headId,
        total: uniqueCables.length,
        counts,
        progressCounts,
        groupKey,
        contentHash,
        previous: { headIncaFileId: headId, contentHash: previousHash, isDuplicate: true },
      });
    }

    // Load previous state from HEAD for diff + merge
    const prevRowsRes = await admin
      .from("inca_cavi")
      .select(
        "codice,codice_inca,marca_cavo,descrizione,tipo,sezione,livello_disturbo,stato_tec,stato_cantiere,impianto,zona_da,zona_a,apparato_da,apparato_a,descrizione_da,descrizione_a,metri_teo,metri_dis,wbs,pagina_pdf,situazione,progress_percent",
      )
      .eq("inca_file_id", headId);

    if (prevRowsRes.error) return json(500, { ok: false, error: "inca_cavi read failed", detail: prevRowsRes.error.message });

    const prevRows = Array.isArray(prevRowsRes.data) ? prevRowsRes.data : [];
    const prevBy = new Map<string, any>();
    const previousCables: ParsedCable[] = [];
    for (const r of prevRows as any[]) {
      const codice = String(r.codice);
      prevBy.set(codice, r);
      previousCables.push({
        codice,
        codice_inca: r.codice_inca ?? null,
        marca_cavo: r.marca_cavo ?? null,
        descrizione: r.descrizione ?? null,
        tipo: r.tipo ?? null,
        sezione: r.sezione ?? null,
        livello_disturbo: r.livello_disturbo ?? null,
        stato_tec: r.stato_tec ?? null,
        stato_cantiere: r.stato_cantiere ?? null,
        impianto: r.impianto ?? null,
        zona_da: r.zona_da ?? null,
        zona_a: r.zona_a ?? null,
        apparato_da: r.apparato_da ?? null,
        apparato_a: r.apparato_a ?? null,
        descrizione_da: r.descrizione_da ?? null,
        descrizione_a: r.descrizione_a ?? null,
        metri_teo: r.metri_teo == null ? null : Number(r.metri_teo),
        metri_dis: r.metri_dis == null ? null : Number(r.metri_dis),
        wbs: r.wbs ?? null,
        pagina_pdf: r.pagina_pdf ?? null,
        situazione: (r.situazione === "P" || r.situazione === "T" || r.situazione === "R" || r.situazione === "B" || r.situazione === "E") ? r.situazione : null,
        situazione_raw: null,
        progress_percent: (r.progress_percent === 50 || r.progress_percent === 70 || r.progress_percent === 100) ? r.progress_percent : null,
      });
    }

    const diff = diffCables(previousCables, uniqueCables, headId, headId);

    // Create import run (diff+summary are computed vs HEAD PRE state)
    const runIns = await admin
      .from("inca_import_runs")
      .insert({
        group_key: groupKey,
        costr,
        commessa,
        project_code: projectCode || null,
        mode: "SYNC",
        created_by: user.id,
        previous_inca_file_id: headId,
        new_inca_file_id: headId,
        content_hash: contentHash,
        summary: {
          fileName,
          sheetName: parsed.sheetName,
          headerRowIndex0: parsed.headerRowIndex0,
          totalRows: parsed.totalRows,
          totalCables: uniqueCables.length,
          counts,
          progressCounts,
          duplicates: {
            duplicateCount: dedup.duplicateCount,
            duplicateDistinct: dedup.duplicateDistinct,
            sampleCodici: dedup.sampleCodici,
          },
          nonStandardSituazioneRaw: parsed.nonStandardSituazioneRaw,
          isDuplicate,
          note,
        },
        diff: diff,
      })
      .select("id")
      .single();

    if (runIns.error || !runIns.data?.id) return json(500, { ok: false, error: "inca_import_runs insert failed", detail: runIns.error?.message });
    const runId = String(runIns.data.id);

    // Update HEAD metadata (do not change uploaded_at / file_name: HEAD must stay 17/12 in UI)
    {
      const upHead = await admin
        .from("inca_files")
        .update({
          content_hash: contentHash,
          import_run_id: runId,
          content_hash_updated_at: new Date().toISOString(),
        } as any)
        .eq("id", headId);

      // content_hash_updated_at might not exist in schema: ignore errors on that field by retrying without it.
      if (upHead.error && String(upHead.error.message || "").includes("content_hash_updated_at")) {
        await admin.from("inca_files").update({ content_hash: contentHash, import_run_id: runId }).eq("id", headId);
      }
    }

    // Mark all as missing, then stamp imported ones
    const nowIso = new Date().toISOString();

    {
      const missAll = await admin.from("inca_cavi").update({ missing_in_latest_import: true } as any).eq("inca_file_id", headId);
      if (missAll.error) console.warn("inca_cavi mark-missing failed:", missAll.error.message);
    }

    const importedCodes = uniqueCables.map((c) => c.codice).filter(Boolean);

    // Prepare UPSERT payload with non-destructive merge
    // 0) Create ARCHIVE snapshot (immutable) so the user can always audit / verify old INCA.
    // HEAD stays stable and is updated in place.
    let archiveIncaFileId: string | null = null;
    {
      const shipId = String((head as any).ship_id);
      const insArchive = await admin
        .from("inca_files")
        .insert({
          ship_id: shipId,
          costr,
          commessa,
          project_code: projectCode || null,
          file_name: fileName,
          file_type: "XLSX",
          note,
          uploaded_by: user.id,
          file_path: null,
          group_key: groupKey,
          content_hash: contentHash,
          previous_inca_file_id: headId,
          import_run_id: runId,
        })
        .select("id")
        .single();

      if (!insArchive.error && insArchive.data?.id) {
        archiveIncaFileId = String(insArchive.data.id);

        const archivePayload = uniqueCables.map((c) => ({
          inca_file_id: archiveIncaFileId,
          costr,
          commessa,
          codice: c.codice,
          codice_inca: c.codice_inca,
          marca_cavo: c.marca_cavo,
          descrizione: c.descrizione,
          tipo: c.tipo,
          sezione: c.sezione,
          livello_disturbo: c.livello_disturbo,
          stato_tec: c.stato_tec,
          stato_cantiere: c.stato_cantiere,
          impianto: c.impianto,
          zona_da: c.zona_da,
          zona_a: c.zona_a,
          apparato_da: c.apparato_da,
          apparato_a: c.apparato_a,
          descrizione_da: c.descrizione_da,
          descrizione_a: c.descrizione_a,
          metri_teo: c.metri_teo,
          metri_dis: c.metri_dis,
          wbs: c.wbs,
          pagina_pdf: c.pagina_pdf,
          situazione: c.situazione,
          progress_percent: c.progress_percent,
          progress_side: null,
        }));

        let okArchive = true;
        for (let i = 0; i < archivePayload.length; i += 1000) {
          const chunk = archivePayload.slice(i, i + 1000);
          const ins = await admin.from("inca_cavi").insert(chunk as any);
          if (ins.error) {
            okArchive = false;
            console.warn("inca_cavi insert archive failed:", ins.error.message);
            break;
          }
        }

        if (!okArchive) {
          await admin.from("inca_files").delete().eq("id", archiveIncaFileId);
          archiveIncaFileId = null;
        }
      } else {
        console.warn("inca_files insert archive failed:", insArchive.error?.message);
      }
    }

    const payload = uniqueCables.map((c) => {
      const prev = prevBy.get(c.codice) ?? null;
      const merged = mergeNonDestructive(prev, c);
      return {
        inca_file_id: headId,
        costr,
        commessa,
        codice: merged.codice,
        codice_inca: merged.codice_inca,
        marca_cavo: merged.marca_cavo,
        descrizione: merged.descrizione,
        tipo: merged.tipo,
        sezione: merged.sezione,
        livello_disturbo: merged.livello_disturbo,
        stato_tec: merged.stato_tec,
        stato_cantiere: merged.stato_cantiere,
        impianto: merged.impianto,
        zona_da: merged.zona_da,
        zona_a: merged.zona_a,
        apparato_da: merged.apparato_da,
        apparato_a: merged.apparato_a,
        descrizione_da: merged.descrizione_da,
        descrizione_a: merged.descrizione_a,
        metri_teo: merged.metri_teo,
        metri_dis: merged.metri_dis,
        wbs: merged.wbs,
        pagina_pdf: merged.pagina_pdf,
        situazione: merged.situazione,
        progress_percent: (merged as any).progress_percent ?? null,
      };
    });

    // UPSERT chunks
    for (let i = 0; i < payload.length; i += 1000) {
      const chunk = payload.slice(i, i + 1000);
      const up = await admin.from("inca_cavi").upsert(chunk as any, { onConflict: "inca_file_id,codice" });
      if (up.error) return json(500, { ok: false, error: "inca_cavi upsert failed", detail: up.error.message });
    }

    // Stamp imported rows
    for (let i = 0; i < importedCodes.length; i += 500) {
      const codesChunk = importedCodes.slice(i, i + 500);
      const stamp = await admin
        .from("inca_cavi")
        .update({
          missing_in_latest_import: false,
          last_seen_in_import_at: nowIso,
          last_import_id: runId,
          flag_changed_in_source: false,
        } as any)
        .eq("inca_file_id", headId)
        .in("codice", codesChunk);

      if (stamp.error) console.warn("inca_cavi stamp-import failed:", stamp.error.message);
    }

    // Mark changed rows
    const changedCodes = diff.changed.map((x) => x.codice);
    for (let i = 0; i < changedCodes.length; i += 500) {
      const codesChunk = changedCodes.slice(i, i + 500);
      const mark = await admin
        .from("inca_cavi")
        .update({ flag_changed_in_source: true, last_import_id: runId } as any)
        .eq("inca_file_id", headId)
        .in("codice", codesChunk);
      if (mark.error) console.warn("inca_cavi mark-changed failed:", mark.error.message);
    }

    return json(200, {
      ok: true,
      headIncaFileId: headId,
      archiveIncaFileId,
      importRunId: runId,
      total: uniqueCables.length,
      counts,
      progressCounts,
      groupKey,
      contentHash,
      diff: {
        addedCount: diff.added.length,
        removedCount: diff.removed.length,
        changedCount: diff.changed.length,
      },
      debug: {
        sheetName: parsed.sheetName,
        headerRowIndex0: parsed.headerRowIndex0,
        totalRows: parsed.totalRows,
        nonStandardSituazioneRaw: parsed.nonStandardSituazioneRaw,
        duplicates: {
          duplicateCount: dedup.duplicateCount,
          duplicateDistinct: dedup.duplicateDistinct,
          sampleCodici: dedup.sampleCodici,
        },
      },
    });
  }),
);
