// supabase/functions/inca-sync/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

import { corsHeaders, withCors } from "../_shared/cors.ts";

type ParsedCable = {
  codice: string;
  /** Raw canonicalized XLSX row (all columns preserved). */
  raw: Record<string, unknown>;
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

  // Dates from INCA XLSX (bureau/system). Kept separate from rapportino proofs.
  inca_data_taglio: string | null; // date (YYYY-MM-DD)
  inca_data_posa: string | null; // date (YYYY-MM-DD)
  inca_data_collegamento: string | null; // date (YYYY-MM-DD)
  inca_data_richiesta_taglio: string | null; // date (YYYY-MM-DD)

  inca_dataela_ts: string | null; // timestamptz ISO
  inca_data_instradamento_ts: string | null; // timestamptz ISO
  inca_data_creazione_instradamento_ts: string | null; // timestamptz ISO

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

/**
 * Canonicalize cable codes so that joins remain stable across imports.
 * - trim
 * - normalize unicode
 * - collapse whitespace
 */
function normalizeCodice(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.normalize("NFKC").replace(/\s+/g, " ");
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
  if (!Number.isFinite(n)) return null;
  return n;
}

type ExcelDateParseKind = "date" | "datetime";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  return `${y}-${m}-${day}`;
}

function excelSerialToDateUTC(serial: number): Date | null {
  // XLSX stores dates as a floating serial (days since 1899-12-30 in the 1900 date system).
  // XLSX.SSF.parse_date_code handles the quirks (including fractional days => time).
  try {
    const parsed = (XLSX as any).SSF?.parse_date_code?.(serial);
    if (!parsed || !parsed.y || !parsed.m || !parsed.d) return null;
    const hh = parsed.H ?? 0;
    const mm = parsed.M ?? 0;
    const ss = parsed.S ?? 0;
    // Use UTC to avoid local timezone shifting KPI cutoffs.
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, hh, mm, Math.floor(ss)));
  } catch {
    return null;
  }
}

function parseExcelDateValue(value: unknown, kind: ExcelDateParseKind): { date: string | null; ts: string | null } {
  if (value === null || value === undefined) return { date: null, ts: null };

  // 1) If XLSX already gave us a Date, normalize to UTC strings.
  if (value instanceof Date) {
    const d = value;
    if (Number.isNaN(d.getTime())) return { date: null, ts: null };
    const date = toIsoDateUTC(d);
    const ts = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds())).toISOString();
    return kind === "date" ? { date, ts: null } : { date, ts };
  }

  // 2) Excel serial number (most common when raw:true).
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = excelSerialToDateUTC(value);
    if (!d) return { date: null, ts: null };
    const date = toIsoDateUTC(d);
    const ts = d.toISOString();
    return kind === "date" ? { date, ts: null } : { date, ts };
  }

  // 3) String: attempt ISO / dd/mm/yyyy / dd-mm-yyyy.
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return { date: null, ts: null };

    // ISO-ish first
    const d1 = new Date(s);
    if (!Number.isNaN(d1.getTime())) {
      const date = toIsoDateUTC(d1);
      const ts = d1.toISOString();
      return kind === "date" ? { date, ts: null } : { date, ts };
    }

    // dd/mm/yyyy or dd-mm-yyyy (optionally with time)
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const hh = m[4] ? Number(m[4]) : 0;
      const mi = m[5] ? Number(m[5]) : 0;
      const ss = m[6] ? Number(m[6]) : 0;
      const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi, ss));
      if (Number.isNaN(d.getTime())) return { date: null, ts: null };
      const date = toIsoDateUTC(d);
      const ts = d.toISOString();
      return kind === "date" ? { date, ts: null } : { date, ts };
    }
  }

  return { date: null, ts: null };
}

function pickFirst(row: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    if (k in row) return row[k];
  }
  return null;
}

function buildRowCanonical(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[canonKey(k)] = v;
  return out;
}

function normalizeProgressFromStatoCantiere(v: unknown) {
  const raw = String(v ?? "").trim().toUpperCase();
  if (!raw) return { progress: null as 50 | 70 | 100 | null, situazione: null as ParsedCable["situazione"], raw: null as string | null };

  // Accept numeric progress in Stato Cantiere: 5 => 50%, 7 => 70%
  if (raw === "5" || raw === "50") return { progress: 50 as const, situazione: "P" as const, raw };
  if (raw === "7" || raw === "70") return { progress: 70 as const, situazione: "P" as const, raw };

  // P/T/R/B/E are canonical statuses
  if (raw.startsWith("P")) return { progress: 100 as const, situazione: "P" as const, raw };
  if (raw.startsWith("T")) return { progress: null, situazione: "T" as const, raw };
  if (raw.startsWith("R")) return { progress: null, situazione: "R" as const, raw };
  if (raw.startsWith("B")) return { progress: null, situazione: "B" as const, raw };
  if (raw.startsWith("E")) return { progress: null, situazione: "E" as const, raw };

  // L is treated as null (NP bucket)
  if (raw.startsWith("L")) return { progress: null, situazione: null, raw: "L" };

  return { progress: null, situazione: null, raw };
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
    const codice = normalizeCodice(codiceRaw);
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

    // --- INCA Dates (Excel) ---
    const incaDataTaglio = parseExcelDateValue(pickFirst(row, ["DATA_DI_TAGLIO"]), "date").date;
    const incaDataPosa = parseExcelDateValue(pickFirst(row, ["DATA_DI_POSA"]), "date").date;
    const incaDataCollegamento = parseExcelDateValue(pickFirst(row, ["DATA_COLLEGAMENTO"]), "date").date;

    // Some exports use mixed headers; we support both.
    const incaDataRichiestaTaglio = parseExcelDateValue(pickFirst(row, ["DATA_RICHIESTA_TAGLIO"]), "date").date;

    const incaDataelaTs = parseExcelDateValue(pickFirst(row, ["DATAELA"]), "datetime").ts;
    const incaDataInstradamentoTs = parseExcelDateValue(pickFirst(row, ["DATA_INSTRADAMENTO"]), "datetime").ts;
    const incaDataCreazioneInstradamentoTs = parseExcelDateValue(
      pickFirst(row, ["DATA_CREAZIONE_INSTRADAMENTO"]),
      "datetime",
    ).ts;

    const wbs = normText(pickFirst(row, ["WBS"])) || null;
    const paginaPdf = normText(pickFirst(row, ["PAGINA_PDF", "PAGINA", "PAGE", "FOGLIO"])) || null;

    parsed.push({
      codice,
      raw: row,
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

      inca_data_taglio: incaDataTaglio,
      inca_data_posa: incaDataPosa,
      inca_data_collegamento: incaDataCollegamento,
      inca_data_richiesta_taglio: incaDataRichiestaTaglio,

      inca_dataela_ts: incaDataelaTs,
      inca_data_instradamento_ts: incaDataInstradamentoTs,
      inca_data_creazione_instradamento_ts: incaDataCreazioneInstradamentoTs,

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
    bump(c.metri_teo);
    bump(c.metri_dis);

    // dates also increase score
    bump(c.inca_data_taglio);
    bump(c.inca_data_posa);
    bump(c.inca_data_collegamento);
    bump(c.inca_data_richiesta_taglio);
    bump(c.inca_dataela_ts);
    bump(c.inca_data_instradamento_ts);
    bump(c.inca_data_creazione_instradamento_ts);

    bump(c.wbs);
    bump(c.pagina_pdf);
    bump(c.situazione);
    bump(c.progress_percent);
    return s;
  };

  const bestBy = new Map<string, ParsedCable>();
  const duplicates = new Map<string, number>();

  for (const c of cables) {
    const prev = bestBy.get(c.codice);
    if (!prev) {
      bestBy.set(c.codice, c);
      continue;
    }

    duplicates.set(c.codice, (duplicates.get(c.codice) ?? 1) + 1);

    const prevScore = score(prev);
    const nextScore = score(c);

    // keep the "most filled" row; tie-break: keep higher progress.
    const prevProg = prev.progress_percent ?? -1;
    const nextProg = c.progress_percent ?? -1;

    if (nextScore > prevScore) bestBy.set(c.codice, c);
    else if (nextScore === prevScore && nextProg > prevProg) bestBy.set(c.codice, c);
  }

  const unique = [...bestBy.values()].sort((a, b) => a.codice.localeCompare(b.codice));

  const dupList = [...duplicates.entries()].sort((a, b) => b[1] - a[1]);
  return {
    unique,
    duplicateCount: dupList.reduce((acc, [, n]) => acc + (n - 1), 0),
    duplicateDistinct: dupList.length,
    sampleCodici: dupList.slice(0, 8).map(([c, n]) => ({ codice: c, occurrences: n })),
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
    inca_data_taglio: c.inca_data_taglio,
    inca_data_posa: c.inca_data_posa,
    inca_data_collegamento: c.inca_data_collegamento,
    inca_data_richiesta_taglio: c.inca_data_richiesta_taglio,
    inca_dataela_ts: c.inca_dataela_ts,
    inca_data_instradamento_ts: c.inca_data_instradamento_ts,
    inca_data_creazione_instradamento_ts: c.inca_data_creazione_instradamento_ts,
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

    inca_data_taglio: keep(incoming.inca_data_taglio, prev?.inca_data_taglio),
    inca_data_posa: keep(incoming.inca_data_posa, prev?.inca_data_posa),
    inca_data_collegamento: keep(incoming.inca_data_collegamento, prev?.inca_data_collegamento),
    inca_data_richiesta_taglio: keep(incoming.inca_data_richiesta_taglio, prev?.inca_data_richiesta_taglio),
    inca_dataela_ts: keep(incoming.inca_dataela_ts, prev?.inca_dataela_ts),
    inca_data_instradamento_ts: keep(incoming.inca_data_instradamento_ts, prev?.inca_data_instradamento_ts),
    inca_data_creazione_instradamento_ts: keep(incoming.inca_data_creazione_instradamento_ts, prev?.inca_data_creazione_instradamento_ts),

    wbs: keep(incoming.wbs, prev?.wbs),
    pagina_pdf: keep(incoming.pagina_pdf, prev?.pagina_pdf),

    situazione: keepSituazione(incoming.situazione, prev?.situazione),
    progress_percent: incoming.progress_percent ?? prev?.progress_percent ?? null,
    progress_side: prev?.progress_side ?? null,
  };
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json(500, { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });

    const admin = createClient(url, key, { auth: { persistSession: false } });

    // Auth: require user token (for auditing)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, error: "Missing Authorization header" });

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { ok: false, error: "Missing bearer token" });

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user?.id) return json(401, { ok: false, error: "Invalid token", detail: authErr?.message });

    const user = authData.user;

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json(400, { ok: false, error: "Expected application/json payload" });
    }

    const body = await req.json().catch(() => null) as any;
    if (!body) return json(400, { ok: false, error: "Invalid JSON body" });

    const { costr, commessa, fileName, projectCode, note, force, xlsxBase64 } = body as {
      costr: string;
      commessa: string;
      fileName: string;
      projectCode?: string;
      note?: string;
      force?: boolean;
      xlsxBase64: string;
    };

    const costrN = String(costr ?? "").trim();
    const commessaN = String(commessa ?? "").trim();
    const fileNameN = String(fileName ?? "").trim();
    if (!costrN || !commessaN || !fileNameN) return json(400, { ok: false, error: "Missing costr/commessa/fileName" });
    if (!xlsxBase64 || typeof xlsxBase64 !== "string") return json(400, { ok: false, error: "Missing xlsxBase64" });

    const groupKey = `${costrN.trim()}|${commessaN.trim()}`.toUpperCase();

    const bin = Uint8Array.from(atob(xlsxBase64), (c) => c.charCodeAt(0));
    const parsed = parseXlsxCables(bin.buffer);

    const counts = computeCounts(parsed.cables);
    const progressCounts = computeProgressCounts(parsed.cables);
    const dedup = dedupeByCodice(parsed.cables);
    const uniqueCables = dedup.unique;

    // Content hash for duplicate detection
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(JSON.stringify(uniqueCables.map((c) => [c.codice, toDbComparable(c)]))));
    const contentHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    // Load or create HEAD inca_files record (stable)
    let head: any | null = null;

    {
      const headRes = await admin
        .from("inca_files")
        .select("id, ship_id, content_hash, file_name, uploaded_at")
        .eq("costr", costrN)
        .eq("commessa", commessaN)
        .eq("file_type", "XLSX")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (headRes.error) return json(500, { ok: false, error: "inca_files read failed", detail: headRes.error.message });

      head = headRes.data ?? null;
      if (!head) {
        const insHead = await admin
          .from("inca_files")
          .insert({
            ship_id: null,
            costr: costrN,
            commessa: commessaN,
            project_code: projectCode || null,
            file_name: fileNameN,
            file_type: "XLSX",
            note: note || null,
            uploaded_by: user.id,
            file_path: null,
            content_hash: null,
          })
          .select("id, ship_id, content_hash, file_name, uploaded_at")
          .single();

        if (insHead.error || !insHead.data?.id) return json(500, { ok: false, error: "Insert head inca_files failed", detail: insHead.error?.message });
        head = insHead.data;
      }
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
        "codice,codice_inca,marca_cavo,descrizione,tipo,sezione,livello_disturbo,stato_tec,stato_cantiere,impianto,zona_da,zona_a,apparato_da,apparato_a,descrizione_da,descrizione_a,metri_teo,metri_dis,inca_data_taglio,inca_data_posa,inca_data_collegamento,inca_data_richiesta_taglio,inca_dataela_ts,inca_data_instradamento_ts,inca_data_creazione_instradamento_ts,wbs,pagina_pdf,situazione,progress_percent",
      )
      .eq("inca_file_id", headId);

    if (prevRowsRes.error) return json(500, { ok: false, error: "inca_cavi read failed", detail: prevRowsRes.error.message });

    const prevRows = Array.isArray(prevRowsRes.data) ? prevRowsRes.data : [];
    const prevBy = new Map<string, any>();
    const previousCables: ParsedCable[] = [];
    for (const r of prevRows as any[]) {
      const codice = normalizeCodice(r.codice);
      prevBy.set(codice, r);
      previousCables.push({
        codice,
        raw: {},
        codice_inca: r.codice_inca ?? null,
        marca_cavo: r.marca_cavo ?? null,
        descrizione: r.descrizione ?? null,
        metri_teo: r.metri_teo ?? null,
        metri_dis: r.metri_dis ?? null,
        inca_data_taglio: r.inca_data_taglio ?? null,
        inca_data_posa: r.inca_data_posa ?? null,
        inca_data_collegamento: r.inca_data_collegamento ?? null,
        inca_data_richiesta_taglio: r.inca_data_richiesta_taglio ?? null,
        inca_dataela_ts: r.inca_dataela_ts ?? null,
        inca_data_instradamento_ts: r.inca_data_instradamento_ts ?? null,
        inca_data_creazione_instradamento_ts: r.inca_data_creazione_instradamento_ts ?? null,
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
        costr: costrN,
        commessa: commessaN,
        project_code: projectCode || null,
        mode: "SYNC",
        created_by: user.id,
        previous_inca_file_id: headId,
        new_inca_file_id: headId,
        content_hash: contentHash,
        summary: {
          fileName: fileNameN,
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
        diff,
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

    // IMPORTANT (Option B: HEAD-ONLY):
    // We MUST NOT mutate head dataset rows (including missing_in_latest_import).
    // Any missing/changed computation is done via diff vs head.

    // Prepare UPSERT payload with non-destructive merge
    // 0) Create ARCHIVE snapshot (immutable) so the user can always audit / verify old INCA.
    // HEAD stays stable and is updated in place.
    let archiveIncaFileId: string | null = null;
    {
      const shipId = String((head as any).ship_id);
      const insArchive = await admin
        .from("inca_files")
        .insert({
          ship_id: shipId === "null" ? null : shipId,
          costr: costrN,
          commessa: commessaN,
          project_code: projectCode || null,
          file_name: fileNameN,
          file_type: "XLSX",
          note: note || null,
          uploaded_by: user.id,
          file_path: null,
          previous_inca_file_id: headId,
          content_hash: contentHash,
          import_run_id: runId,
        })
        .select("id")
        .single();

      if (!insArchive.error && insArchive.data?.id) {
        archiveIncaFileId = String(insArchive.data.id);

        const archivePayload = uniqueCables.map((c) => ({
          inca_file_id: archiveIncaFileId,
          costr: costrN,
          commessa: commessaN,
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
          inca_data_taglio: c.inca_data_taglio,
          inca_data_posa: c.inca_data_posa,
          inca_data_collegamento: c.inca_data_collegamento,
          inca_data_richiesta_taglio: c.inca_data_richiesta_taglio,
          inca_dataela_ts: c.inca_dataela_ts,
          inca_data_instradamento_ts: c.inca_data_instradamento_ts,
          inca_data_creazione_instradamento_ts: c.inca_data_creazione_instradamento_ts,
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
  } catch (e) {
    console.error("inca-sync error:", e);
    return json(500, { ok: false, error: "Unhandled error", detail: String((e as any)?.message ?? e) });
  }
}));