// supabase/functions/inca-import/index.ts
/* eslint-disable no-console */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { corsHeaders, withCors } from "../_shared/cors.ts";

type ImportMode = "DRY_RUN" | "COMMIT" | "ENRICH_TIPO";

type ParsedCable = {
  codice: string;
  codice_inca: string | null;
  marca_cavo: string | null;
  descrizione: string | null;
  tipo: string | null;
  sezione: string | null;
  impianto: string | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  descrizione_da: string | null;
  descrizione_a: string | null;
  metri_teo: number | null;
  metri_dis: number | null;
  situazione: string | null; // L/P/T/R/B/E or null (legacy NP)
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

function normalizeSituazione(raw: unknown): { value: string | null; nonStandard?: string } {
  const s0 = String(raw ?? "").trim().toUpperCase();
  // Canon: empty cell means "L" (Libero / cavo disponibile)
  if (!s0) return { value: "L" };

  const s = s0[0];
  if (["L", "P", "T", "R", "B", "E"].includes(s)) return { value: s };

  if (s0.includes("POS")) return { value: "P" };
  if (s0.includes("DA") && s0.includes("POS")) return { value: "T" };
  if (s0.includes("RIP")) return { value: "R" };
  if (s0.includes("BLO")) return { value: "B" };
  if (s0.includes("ESEG")) return { value: "E" };

  return { value: "L", nonStandard: s0 };
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
  for (const [k, v] of Object.entries(row)) {
    out[canonKey(k)] = v;
  }
  return out;
}

function parseXlsxCables(arrayBuffer: ArrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const wb = XLSX.read(u8, { type: "array" });
  // Canon: prefer sheet named "DATI" (case-insensitive), otherwise fallback to first sheet.
  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) throw new Error("XLSX: nessun foglio trovato.");

  const datiName = sheetNames.find((n) => String(n).trim().toUpperCase() === "DATI") ?? null;
  const chosenName = datiName || sheetNames[0];
  const sheet = wb.Sheets[chosenName];
  if (!sheet) throw new Error("XLSX: foglio non disponibile.");

  // Robust header detection: do NOT assume headers are on row 1.
  // We scan the first N rows and select the row that best matches the expected INCA headers.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const maxScanRows = Math.min(50, aoa.length);
  let bestIdx = -1;
  let bestScore = -1;

  const headerKeyScore = (k: string): number => {
    // Strong identifiers
    if (k === "CODICE" || k === "MARCA_CAVO" || k === "MARCA" || k === "MARCA_PEZZO" || k === "CODICE_CAVO") return 6;
    if (k === "STATO" || k === "STATO_CANTIERE" || k === "SITUAZIONE" || k === "STATO_INCA") return 6;
    // Helpful signals
    if (k.startsWith("LUNGHEZZA")) return 2;
    if (k === "TIPO" || k === "TIPO_CAVO" || k === "SEZIONE") return 1;
    if (k.startsWith("APP") || k.startsWith("APPARATO")) return 1;
    return 0;
  };

  for (let i = 0; i < maxScanRows; i++) {
    const row = aoa[i] || [];
    let score = 0;
    let hasCode = false;
    let hasStatus = false;

    for (const cell of row) {
      const key = canonKey(cell);
      const s = headerKeyScore(key);
      score += s;
      if (
        s >= 6 &&
        (key === "CODICE" || key === "MARCA_CAVO" || key === "MARCA" || key === "MARCA_PEZZO" || key === "CODICE_CAVO")
      )
        hasCode = true;
      if (s >= 6 && (key === "STATO" || key === "STATO_CANTIERE" || key === "SITUAZIONE" || key === "STATO_INCA"))
        hasStatus = true;
    }

    // Require at least CODE + STATUS to avoid false positives.
    if (hasCode && hasStatus && score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx < 0) {
    throw new Error(
      "XLSX: impossibile rilevare la riga intestazioni. Attesi header tipo: CODICE / MARCA CAVO e STATO / STATO CANTIERE.",
    );
  }

  const headerRow = aoa[bestIdx] || [];
  const headers = headerRow.map((h, idx) => {
    const k = canonKey(h);
    return k ? k : `COL_${idx + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let r = bestIdx + 1; r < aoa.length; r++) {
    const line = aoa[r] || [];
    // skip completely empty rows
    const hasAny = line.some((v) => String(v ?? "").trim() !== "");
    if (!hasAny) continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = line[c] ?? null;
    }
    rows.push(obj);
  }
  const parsed: ParsedCable[] = [];
  const nonStandardStatuses = new Set<string>();

  for (const r of rows) {
    const row = buildRowCanonical(r);

    const codiceRaw = pickFirst(row, ["MARCA_CAVO", "MARCA", "MARCA_PEZZO", "CODICE", "CODICE_CAVO", "CAVO"]);
    const codice = normText(codiceRaw);
    if (!codice) continue;

    const codiceInca = normText(pickFirst(row, ["CODICE_CAVO", "CODICE_INCA"])) || null;
    const marcaCavo = normText(pickFirst(row, ["MARCA_CAVO", "MARCA"])) || null;

    const descrizione = normText(pickFirst(row, ["DESCRIZIONE", "DESCR"])) || null;
    const tipo = normText(pickFirst(row, ["TIPO", "TYPE", "TIPO_CAVO"])) || null;
    const sezione = normText(pickFirst(row, ["SEZIONE", "SEC", "SECTION"])) || null;
    const impianto = normText(pickFirst(row, ["IMPIANTO", "PLANT"])) || null;

    const zonaDa = normText(pickFirst(row, ["ZONA_DA", "ZONA_D", "ZONA_FROM", "ZONA_DA_"])) || null;
    const zonaA = normText(pickFirst(row, ["ZONA_A", "ZONA_TO", "ZONA_A_"])) || null;

    const apparatoDa =
      normText(pickFirst(row, ["APPARATO_DA", "APPARATO_D", "FROM_APPARATO", "APPARATO_FROM", "APP_PARTENZA"])) || null;
    const apparatoA =
      normText(pickFirst(row, ["APPARATO_A", "APPARATO_TO", "TO_APPARATO", "APPARATO_TO_", "APP_ARRIVO"])) || null;

    const descrDa = normText(pickFirst(row, ["DESCRIZIONE_DA", "DESCR_DA", "DESCRIZIONE_FROM"])) || null;
    const descrA = normText(pickFirst(row, ["DESCRIZIONE_A", "DESCR_A", "DESCRIZIONE_TO"])) || null;

    const metriTeo = safeNumber(
      pickFirst(row, ["LUNGHEZZA_DI_DISEGNO", "LUNGHEZZA_DISEGNO", "METRI_TEO", "METRI_TEORICI", "LUNGHEZZA_DISEGNO_"]),
    );

    const metriDis = safeNumber(
      pickFirst(row, ["LUNGHEZZA_DI_POSA", "LUNGHEZZA_POSA", "LUNGHEZZA_POSATA", "METRI_DIS", "METRI_POSATI"]),
    );

    const statoRaw = pickFirst(row, ["STATO_CANTIERE", "SITUAZIONE", "STATO", "STATO_INCA"]);
    const { value: situazione, nonStandard } = normalizeSituazione(statoRaw);
    if (nonStandard) nonStandardStatuses.add(nonStandard);

    parsed.push({
      codice,
      codice_inca: codiceInca || null,
      marca_cavo: marcaCavo,
      descrizione,
      tipo,
      sezione,
      impianto,
      zona_da: zonaDa,
      zona_a: zonaA,
      apparato_da: apparatoDa,
      apparato_a: apparatoA,
      descrizione_da: descrDa,
      descrizione_a: descrA,
      metri_teo: metriTeo,
      metri_dis: metriDis,
      situazione,
    });
  }

  return {
    sheetName: chosenName,
    headerRowIndex0: bestIdx,
    totalRows: rows.length,
    cables: parsed,
    nonStandardStatuses: [...nonStandardStatuses],
  };
}

function computeCounts(cables: ParsedCable[]) {
  // Canon: we store atomic states L/R/T/B/P/E.
  // NP is a derived view: NP = L + R + T + B.
  const counts: Record<string, number> = { L: 0, R: 0, T: 0, B: 0, P: 0, E: 0, NP: 0 };
  for (const c of cables) {
    const s = String(c.situazione ?? "").trim().toUpperCase();
    if (s === "L" || s === "R" || s === "T" || s === "B" || s === "P" || s === "E") {
      counts[s] += 1;
    } else {
      // Defensive fallback: treat unknown as L (available), and surface nonStandardStatuses separately.
      counts.L += 1;
    }
  }
  counts.NP = counts.L + counts.R + counts.T + counts.B;
  return counts;
}

type DiffResult = {
  previousIncaFileId: string | null;
  added: string[];
  removed: string[];
  changed: Array<{ codice: string; before: Record<string, unknown>; after: Record<string, unknown> }>;
};

function diffCables(prev: ParsedCable[], next: ParsedCable[]): DiffResult {
  const prevBy = new Map<string, ParsedCable>();
  for (const c of prev) prevBy.set(c.codice, c);

  const nextBy = new Map<string, ParsedCable>();
  for (const c of next) nextBy.set(c.codice, c);

  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ codice: string; before: Record<string, unknown>; after: Record<string, unknown> }> = [];

  for (const codice of nextBy.keys()) {
    if (!prevBy.has(codice)) added.push(codice);
  }
  for (const codice of prevBy.keys()) {
    if (!nextBy.has(codice)) removed.push(codice);
  }

  for (const [codice, n] of nextBy.entries()) {
    const p = prevBy.get(codice);
    if (!p) continue;

    const before = {
      metri_teo: p.metri_teo,
      metri_dis: p.metri_dis,
      situazione: p.situazione,
      tipo: p.tipo,
      sezione: p.sezione,
    };
    const after = {
      metri_teo: n.metri_teo,
      metri_dis: n.metri_dis,
      situazione: n.situazione,
      tipo: n.tipo,
      sezione: n.sezione,
    };

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed.push({ codice, before, after });
    }
  }

  added.sort();
  removed.sort();
  changed.sort((a, b) => a.codice.localeCompare(b.codice));

  return { previousIncaFileId: null, added, removed, changed };
}

serve(
  withCors(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

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
    const user = u.user;

    const form = await req.formData();

    const mode = normText(form.get("mode")) as ImportMode;
    if (!mode || !["DRY_RUN", "COMMIT", "ENRICH_TIPO"].includes(mode)) {
      return json(400, { ok: false, error: `Invalid mode: ${mode}` });
    }

    const costr = normText(form.get("costr"));
    const commessa = normText(form.get("commessa"));
    const projectCode = normText(form.get("projectCode"));
    const note = normText(form.get("note")) || null;

    if (!costr || !commessa) return json(400, { ok: false, error: "costr/commessa mancanti" });

    const f = form.get("file");
    if (!(f instanceof File)) return json(400, { ok: false, error: "file mancante" });

    const fileName = f.name || "inca.xlsx";
    const ab = await f.arrayBuffer();

    const parsed = parseXlsxCables(ab);
    if (parsed.cables.length === 0) return json(400, { ok: false, error: "Nessun cavo trovato nel XLSX." });

    const counts = computeCounts(parsed.cables);

    const groupKey = buildGroupKey(costr, commessa, projectCode);
    const sorted = [...parsed.cables].sort((a, b) => a.codice.localeCompare(b.codice));
    const canonLines = sorted.map((c) =>
      [c.codice, c.codice_inca || "", c.metri_teo ?? "", c.metri_dis ?? "", c.situazione || "", c.tipo || "", c.sezione || ""].join("|"),
    );
    const contentHash = await sha256Hex(canonLines.join("\n"));

    // Find previous snapshot by group_key, fallback to costr/commessa/project_code.
    let previousFileId: string | null = null;
    let previousContentHash: string | null = null;

    const prevByGroup = await admin
      .from("inca_files")
      .select("id,content_hash,uploaded_at")
      .eq("group_key", groupKey)
      .eq("file_type", "XLSX")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevByGroup.data?.id) {
      previousFileId = prevByGroup.data.id;
      previousContentHash = prevByGroup.data.content_hash ?? null;
    } else {
      const prevFallback = await admin
        .from("inca_files")
        .select("id,content_hash,uploaded_at")
        .eq("costr", costr)
        .eq("commessa", commessa)
        .eq("project_code", projectCode || null)
        .eq("file_type", "XLSX")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevFallback.data?.id) {
        previousFileId = prevFallback.data.id;
        previousContentHash = prevFallback.data.content_hash ?? null;
      }
    }

    const isDuplicate = !!(previousContentHash && previousContentHash === contentHash);

    // Diff vs previous (if exists)
    let diff: DiffResult | null = null;
    let previousCables: ParsedCable[] = [];

    if (previousFileId) {
      const { data: prevRows, error: prevErr } = await admin
        .from("inca_cavi")
        .select(
          "codice,codice_inca,marca_cavo,descrizione,tipo,sezione,impianto,zona_da,zona_a,apparato_da,apparato_a,descrizione_da,descrizione_a,metri_teo,metri_dis,situazione",
        )
        .eq("inca_file_id", previousFileId);

      if (!prevErr && Array.isArray(prevRows)) {
        previousCables = prevRows.map((r: any) => ({
          codice: String(r.codice),
          codice_inca: r.codice_inca ?? null,
          marca_cavo: r.marca_cavo ?? null,
          descrizione: r.descrizione ?? null,
          tipo: r.tipo ?? null,
          sezione: r.sezione ?? null,
          impianto: r.impianto ?? null,
          zona_da: r.zona_da ?? null,
          zona_a: r.zona_a ?? null,
          apparato_da: r.apparato_da ?? null,
          apparato_a: r.apparato_a ?? null,
          descrizione_da: r.descrizione_da ?? null,
          descrizione_a: r.descrizione_a ?? null,
          metri_teo: r.metri_teo == null ? null : Number(r.metri_teo),
          metri_dis: r.metri_dis == null ? null : Number(r.metri_dis),
          situazione: r.situazione ?? null,
        }));
      }
    }

    if (previousFileId && previousCables.length > 0) {
      diff = diffCables(previousCables, parsed.cables);
      diff.previousIncaFileId = previousFileId;
    }

    if (mode === "DRY_RUN") {
      return json(200, {
        ok: true,
        mode,
        total: parsed.cables.length,
        counts,
        received: {
          fileName,
          sizeBytes: ab.byteLength,
          sheetName: parsed.sheetName,
          headerRowIndex0: parsed.headerRowIndex0,
          totalRows: parsed.totalRows,
        },
        groupKey,
        contentHash,
        previous: previousFileId ? { incaFileId: previousFileId, contentHash: previousContentHash, isDuplicate } : null,
        diff: diff
          ? {
              previousIncaFileId: diff.previousIncaFileId,
              addedCount: diff.added.length,
              removedCount: diff.removed.length,
              changedCount: diff.changed.length,
              addedSample: diff.added.slice(0, 50),
              removedSample: diff.removed.slice(0, 50),
              changedSample: diff.changed.slice(0, 50),
            }
          : null,
        debug: {
          nonStandardStatuses: parsed.nonStandardStatuses,
          note: "DRY_RUN only: no DB changes.",
        },
      });
    }

    if (mode === "ENRICH_TIPO") {
      const targetIncaFileId = normText(form.get("targetIncaFileId"));
      if (!targetIncaFileId) {
        return json(400, { ok: false, error: "targetIncaFileId mancante per ENRICH_TIPO" });
      }

      const map = new Map<string, string>();
      for (const c of parsed.cables) {
        if (c.codice && c.tipo) map.set(c.codice, c.tipo);
      }

      if (map.size === 0) {
        return json(400, { ok: false, error: "Nessun campo TIPO rilevato nel file per ENRICH." });
      }

      const entries = [...map.entries()];
      let updated = 0;
      for (let i = 0; i < entries.length; i += 500) {
        const chunk = entries.slice(i, i + 500);
        const codes = chunk.map(([codice]) => codice);

        const { data: rows, error: selErr } = await admin.from("inca_cavi").select("id,codice").eq("inca_file_id", targetIncaFileId).in("codice", codes);

        if (selErr) throw selErr;
        if (!rows || rows.length === 0) continue;

        const updates = rows
          .map((r: any) => {
            const tipo = map.get(String(r.codice));
            if (!tipo) return null;
            return { id: r.id, tipo };
          })
          .filter(Boolean);

        if (updates.length === 0) continue;

        const { error: updErr } = await admin.from("inca_cavi").upsert(updates, { onConflict: "id" });
        if (updErr) throw updErr;
        updated += updates.length;
      }

      return json(200, {
        ok: true,
        mode,
        targetIncaFileId,
        updated,
        received: { fileName, sizeBytes: ab.byteLength, sheetName: parsed.sheetName, headerRowIndex0: parsed.headerRowIndex0, totalRows: parsed.totalRows },
        debug: { note: "ENRICH_TIPO completed." },
      });
    }

    // COMMIT
    const { data: fileRow, error: fileErr } = await admin
      .from("inca_files")
      .insert({
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
      })
      .select("id")
      .single();

    if (fileErr || !fileRow?.id) throw fileErr || new Error("Insert inca_files failed");
    const incaFileId = String(fileRow.id);

    // Insert cables
    const payload = parsed.cables.map((c) => ({
      inca_file_id: incaFileId,
      costr,
      commessa,
      codice: c.codice,
      codice_inca: c.codice_inca,
      marca_cavo: c.marca_cavo,
      descrizione: c.descrizione,
      tipo: c.tipo,
      sezione: c.sezione,
      impianto: c.impianto,
      zona_da: c.zona_da,
      zona_a: c.zona_a,
      apparato_da: c.apparato_da,
      apparato_a: c.apparato_a,
      descrizione_da: c.descrizione_da,
      descrizione_a: c.descrizione_a,
      metri_teo: c.metri_teo,
      metri_dis: c.metri_dis,
      situazione: c.situazione,
    }));

    for (let i = 0; i < payload.length; i += 1000) {
      const chunk = payload.slice(i, i + 1000);
      const { error: insErr } = await admin.from("inca_cavi").insert(chunk);
      if (insErr) throw insErr;
    }

    // Log import run (existing mechanism)
    const { error: runErr } = await admin.from("inca_import_runs").insert({
      inca_file_id: incaFileId,
      group_key: groupKey,
      costr,
      commessa,
      project_code: projectCode || null,
      uploaded_by: user.id,
      mode: "COMMIT",
      content_hash: contentHash,
      previous_inca_file_id: previousFileId,
      is_duplicate: isDuplicate,
      diff_json: diff ? diff : null,
      counts_json: counts,
      debug_json: { sheetName: parsed.sheetName, headerRowIndex0: parsed.headerRowIndex0, totalRows: parsed.totalRows, nonStandardStatuses: parsed.nonStandardStatuses },
      note,
    });
    if (runErr) console.warn("inca_import_runs insert failed:", runErr.message);

    return json(200, {
      ok: true,
      mode,
      incaFileId,
      total: parsed.cables.length,
      counts,
      received: { fileName, sizeBytes: ab.byteLength, sheetName: parsed.sheetName, headerRowIndex0: parsed.headerRowIndex0, totalRows: parsed.totalRows },
      groupKey,
      contentHash,
      previous: previousFileId ? { incaFileId: previousFileId, contentHash: previousContentHash, isDuplicate } : null,
      diff: diff
        ? {
            previousIncaFileId: diff.previousIncaFileId,
            addedCount: diff.added.length,
            removedCount: diff.removed.length,
            changedCount: diff.changed.length,
          }
        : null,
      debug: { nonStandardStatuses: parsed.nonStandardStatuses, note: "COMMIT completed." },
    });
  }),
);
