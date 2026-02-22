// src/admin/ImportOperatorsExcel.jsx
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";

/**
 * ADMIN — Import Operatori (Wizard 3 steps)
 * Step 1: File
 * Step 2: Mapping (choose columns)
 * Step 3: Dry-run preview + Import
 *
 * NOTE (CORE rule):
 * - Today: parsing XLSX is done in browser because you already use XLSX.
 * - Tomorrow (production-hardening): replace buildImportPayload() + performImport()
 *   with a single call to an Edge Function (no front parsing).
 */

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

function normHeader(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function asText(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function safeLower(v) {
  return (v ?? "").toString().toLowerCase().trim();
}

function normalizeError(e) {
  if (!e) return "Errore sconosciuto";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function toCsv(rows, headers) {
  const esc = (v) => {
    const s = (v ?? "").toString();
    const needs = s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r");
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };
  const head = headers.map(esc).join(",");
  const body = rows
    .map((r) => headers.map((h) => esc(r[h])).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}

// heuristic header candidates (auto-detect)
const DEFAULT_NAME_KEYS = [
  "nome",
  "name",
  "nominativo",
  "operaio",
  "operatore",
  "dipendente",
  "dipendenti",
  "employee",
];
const DEFAULT_ROLE_KEYS = ["ruolo", "role", "mansione", "qualifica"];

function detectColumn(headersNorm, keys) {
  const set = new Set(headersNorm);
  for (const k of keys) {
    if (set.has(k)) return k;
  }
  // fallback: contains
  for (const h of headersNorm) {
    for (const k of keys) {
      if (h.includes(k)) return h;
    }
  }
  return "";
}

function uniqByNameMergeRole(parsed) {
  // Dedup by operator name (case-insensitive). Keep first non-empty role encountered.
  const map = new Map();
  for (const p of parsed) {
    const key = safeLower(p.name);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { name: p.name, role: p.role || "" });
    } else {
      const existing = map.get(key);
      if (!existing.role && p.role) existing.role = p.role;
    }
  }
  return Array.from(map.values());
}

export default function ImportOperatorsExcel({ shipId, onDone }) {
  const [step, setStep] = useState(1);

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Parsed sheet raw data (normalized headers)
  const [rows, setRows] = useState([]); // array of objects with normalized headers
  const [headers, setHeaders] = useState([]); // normalized headers list (strings)

  // Mapping
  const [nameCol, setNameCol] = useState("");
  const [roleCol, setRoleCol] = useState("");

  // Dry-run result
  const [dry, setDry] = useState(null);

  const canRead = useMemo(() => !!shipId && !!file && !busy, [shipId, file, busy]);
  const canDryRun = useMemo(() => !!shipId && rows.length > 0 && !!nameCol && !busy, [shipId, rows, nameCol, busy]);
  const canImport = useMemo(() => !!shipId && dry?.unique?.length > 0 && !busy, [shipId, dry, busy]);

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setRows([]);
    setHeaders([]);
    setNameCol("");
    setRoleCol("");
    setDry(null);
    setError(null);
    setBusy(false);
  };

  const readFile = async () => {
    if (!canRead) return;

    setBusy(true);
    setError(null);
    setDry(null);

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const firstSheetName = wb.SheetNames?.[0];
      if (!firstSheetName) throw new Error("File Excel non valido: nessun foglio.");

      const ws = wb.Sheets[firstSheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error("Il file non contiene righe importabili.");
      }

      // Normalize headers per row
      const normalized = raw.map((r) => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          out[normHeader(k)] = v;
        }
        return out;
      });

      // collect headers union
      const hset = new Set();
      normalized.forEach((r) => Object.keys(r).forEach((k) => hset.add(k)));
      const h = Array.from(hset).filter(Boolean).sort((a, b) => a.localeCompare(b));

      // auto-detect mapping
      const autoName = detectColumn(h, DEFAULT_NAME_KEYS);
      const autoRole = detectColumn(h, DEFAULT_ROLE_KEYS);

      setRows(normalized);
      setHeaders(h);
      setNameCol(autoName || "");
      setRoleCol(autoRole || "");

      setStep(2);
    } catch (e) {
      console.error("[ImportOperatorsExcel] readFile error:", e);
      setError(normalizeError(e));
      setRows([]);
      setHeaders([]);
      setNameCol("");
      setRoleCol("");
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const buildDryRun = () => {
    if (!shipId || rows.length === 0 || !nameCol) return null;

    const parsed = [];
    const invalid = [];

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const rawName = asText(r?.[nameCol]);
      const rawRole = roleCol ? asText(r?.[roleCol]) : "";

      const name = rawName.trim();
      const role = rawRole.trim();

      if (!name) {
        invalid.push({
          row: i + 2, // +2 best-effort: header row assumed 1, first data 2
          reason: "Nome mancante",
          name: "",
          role: role || "",
        });
        continue;
      }

      parsed.push({ name, role });
    }

    if (parsed.length === 0) {
      return {
        parsed: [],
        unique: [],
        invalid,
        stats: { imported_rows: rows.length, valid_rows: 0, invalid_rows: invalid.length, unique_names: 0 },
      };
    }

    const unique = uniqByNameMergeRole(parsed);

    return {
      parsed,
      unique,
      invalid,
      stats: {
        imported_rows: rows.length,
        valid_rows: parsed.length,
        invalid_rows: invalid.length,
        unique_names: unique.length,
      },
    };
  };

  const runDry = async () => {
    if (!canDryRun) return;
    setBusy(true);
    setError(null);
    try {
      const out = buildDryRun();
      if (!out) throw new Error("Dry-run fallito: mapping non valido.");
      if (out.unique.length === 0) {
        throw new Error("Nessuna riga valida. Verifica la colonna Nome selezionata.");
      }
      setDry(out);
      setStep(3);
    } catch (e) {
      setError(normalizeError(e));
      setDry(null);
    } finally {
      setBusy(false);
    }
  };

  const performImport = async () => {
    if (!canImport) return;

    setBusy(true);
    setError(null);

    try {
      const unique = Array.isArray(dry?.unique) ? dry.unique : [];
      if (unique.length === 0) throw new Error("Nessun dato da importare.");

      // 1) Upsert operators (requires UNIQUE operators(name) to be deterministic)
      const payloadOperators = unique.map((u) => ({
        name: u.name,
        roles: u.role ? [u.role] : [],
      }));

      const { data: upserted, error: upsertErr } = await supabase
        .from("operators")
        .upsert(payloadOperators, { onConflict: "name" })
        .select("id,name");

      if (upsertErr) throw upsertErr;

      const ops = Array.isArray(upserted) ? upserted : [];
      if (ops.length === 0) throw new Error("Import fallito: nessun operatore salvato.");

      // 2) Link to ship
      const links = ops.map((o) => ({
        ship_id: shipId,
        operator_id: o.id,
        active: true,
      }));

      const { error: linkErr } = await supabase.from("ship_operators").upsert(links, { onConflict: "ship_id,operator_id" });
      if (linkErr) throw linkErr;

      // Result summary
      setDry((prev) => ({
        ...(prev || {}),
        imported: {
          linked: links.length,
          operators_saved: ops.length,
        },
      }));

      onDone?.();
    } catch (e) {
      console.error("[ImportOperatorsExcel] performImport error:", e);
      setError(normalizeError(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadInvalidReport = () => {
    const invalid = Array.isArray(dry?.invalid) ? dry.invalid : [];
    if (invalid.length === 0) return;

    const csv = toCsv(
      invalid.map((r) => ({
        row: r.row,
        reason: r.reason,
        name: r.name,
        role: r.role,
      })),
      ["row", "reason", "name", "role"]
    );

    downloadText("import_operatori_errori.csv", csv, "text/csv;charset=utf-8");
  };

  const wizardPill = (n, label) => {
    const active = step === n;
    const done = step > n;

    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-extrabold tracking-[0.16em]",
          active ? "badge-info" : done ? "badge-success" : "badge-neutral"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", active ? "dot-ok" : done ? "dot-good" : "dot-neutral")} />
        <span>{n}</span>
        <span className="theme-text-muted font-bold tracking-normal">{label}</span>
      </div>
    );
  };

  const disabledBecauseNoShip = !shipId;

  return (
    <div className="rounded-2xl border theme-border bg-[var(--panel2)] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">Import Excel</div>
          <div className="text-sm font-medium theme-text">Lista operai (wizard)</div>
          <div className="text-xs theme-text-muted mt-1">
            Flusso: File → Mapping → Dry-run/Anteprima → Import. Nessuna creazione account.
          </div>
        </div>

        <div className="text-[11px] theme-text-muted text-right">
          <div className="uppercase tracking-[0.18em] theme-text-muted">Modalità</div>
          <div>Import elenco + link cantiere</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {wizardPill(1, "FILE")}
        {wizardPill(2, "MAPPING")}
        {wizardPill(3, "DRY-RUN")}
        <div className="ml-auto">
          <button
            type="button"
            onClick={resetAll}
            className={cn(
              "h-9 px-3 rounded-xl border text-xs font-semibold transition",
              "theme-border bg-[var(--panel2)] theme-text hover:opacity-95",
              busy && "opacity-50 cursor-not-allowed"
            )}
            disabled={busy}
            title="Reset wizard"
          >
            Reset
          </button>
        </div>
      </div>

      {disabledBecauseNoShip ? (
        <div className="mt-3 rounded-xl px-3 py-2 text-xs badge-warning">
          Seleziona prima un cantiere (Ship) per abilitare l’import.
        </div>
      ) : null}

      {/* STEP 1 — FILE */}
      {step === 1 ? (
        <div className="mt-3">
          <div className="text-xs theme-text-muted">
            Seleziona un file Excel (.xlsx/.xls). Verrà letto il primo foglio.
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs theme-text-muted"
              disabled={busy || disabledBecauseNoShip}
            />

            <button
              type="button"
              onClick={readFile}
              disabled={!canRead}
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-semibold",
                "theme-border bg-[var(--panel2)] theme-text hover:opacity-95",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {busy ? "Lettura…" : "Leggi file"}
            </button>
          </div>
        </div>
      ) : null}

      {/* STEP 2 — MAPPING */}
      {step === 2 ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 rounded-2xl border theme-border bg-[var(--panel2)] p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Mapping colonne</div>
            <div className="text-xs theme-text-muted mt-1">
              Scegli quali colonne usare per <span className="theme-text">Nome</span> e{" "}
              <span className="theme-text">Ruolo</span>. Nome è obbligatorio.
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted mb-1">Colonna Nome *</div>
                <select
                  value={nameCol}
                  onChange={(e) => setNameCol(e.target.value)}
                  className={cn("w-full h-10 rounded-xl border bg-[var(--panel2)] px-3 text-sm", "theme-border theme-text")}
                  disabled={busy}
                >
                  <option value="">— Seleziona —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted mb-1">Colonna Ruolo (opz.)</div>
                <select
                  value={roleCol}
                  onChange={(e) => setRoleCol(e.target.value)}
                  className={cn("w-full h-10 rounded-xl border bg-[var(--panel2)] px-3 text-sm", "theme-border theme-text")}
                  disabled={busy}
                >
                  <option value="">— Nessuna —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  "h-9 px-3 rounded-xl border text-xs font-semibold transition",
                  "theme-border bg-[var(--panel2)] theme-text hover:opacity-95",
                  busy && "opacity-50 cursor-not-allowed"
                )}
                disabled={busy}
              >
                Indietro
              </button>

              <button
                type="button"
                onClick={runDry}
                disabled={!canDryRun}
                className={cn(
                  "h-9 px-3 rounded-xl text-xs font-semibold transition btn-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {busy ? "Analisi…" : "Dry-run / Anteprima"}
              </button>
            </div>
          </div>

          <div className="md:col-span-5 rounded-2xl border theme-border bg-[var(--panel2)] p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Info file</div>
            <div className="mt-2 text-xs theme-text-muted">
              <div>
                Righe lette: <span className="theme-text font-semibold">{rows.length}</span>
              </div>
              <div className="mt-1">
                Colonne trovate: <span className="theme-text font-semibold">{headers.length}</span>
              </div>
              <div className="mt-2 text-[11px] theme-text-muted">
                Suggerimenti: Nome auto-detect ={" "}
                <span className="theme-text font-semibold">{nameCol || "—"}</span>, Ruolo auto-detect ={" "}
                <span className="theme-text font-semibold">{roleCol || "—"}</span>
              </div>
            </div>

            <div className="mt-3 rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2 text-[11px] theme-text-muted">
              Nota: se il file ha intestazioni strane, usa il mapping manuale qui.
            </div>
          </div>
        </div>
      ) : null}

      {/* STEP 3 — DRY-RUN */}
      {step === 3 ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border theme-border bg-[var(--panel2)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Risultato Dry-run</div>
                <div className="text-xs theme-text-muted mt-1">
                  Anteprima deterministica prima di scrivere su DB.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={cn(
                    "h-9 px-3 rounded-xl border text-xs font-semibold transition",
                    "theme-border bg-[var(--panel2)] theme-text hover:opacity-95",
                    busy && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={busy}
                >
                  Modifica mapping
                </button>

                <button
                  type="button"
                  onClick={performImport}
                  disabled={!canImport}
                  className={cn(
                    "h-9 px-3 rounded-xl text-xs font-semibold transition btn-primary",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  title="Scrive operators + link ship_operators"
                >
                  {busy ? "Importazione…" : "Importa"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Righe file</div>
                <div className="text-lg font-semibold theme-text">{dry?.stats?.imported_rows ?? "—"}</div>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Valide</div>
                <div className="text-lg font-semibold theme-text">{dry?.stats?.valid_rows ?? "—"}</div>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Scartate</div>
                <div className="text-lg font-semibold theme-text">{dry?.stats?.invalid_rows ?? "—"}</div>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Nomi unici</div>
                <div className="text-lg font-semibold theme-text">{dry?.stats?.unique_names ?? "—"}</div>
              </div>
              <div className="rounded-xl border theme-border bg-[var(--panel2)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] theme-text-muted">Link creati</div>
                <div className="text-lg font-semibold theme-text">{dry?.imported?.linked ?? "—"}</div>
              </div>
            </div>

            {Array.isArray(dry?.invalid) && dry.invalid.length > 0 ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2 badge-warning">
                <div className="text-xs theme-text">
                  Righe scartate: <span className="font-semibold">{dry.invalid.length}</span>. Puoi scaricare il report.
                </div>
                <button
                  type="button"
                  onClick={downloadInvalidReport}
                  className={cn("h-8 px-3 rounded-xl text-xs font-semibold transition badge-warning")}
                >
                  Scarica report CSV
                </button>
              </div>
            ) : null}
          </div>

          {/* Preview valid unique */}
          <div className="rounded-2xl border theme-border bg-[var(--panel2)] overflow-hidden">
            <div className="px-3 py-2 border-b theme-border bg-[var(--panel2)]">
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Anteprima import (nomi unici)</div>
              <div className="text-xs theme-text-muted mt-0.5">Mostra i primi 50 record che verranno salvati/aggiornati.</div>
            </div>

            <div className="max-h-[360px] overflow-auto">
              {Array.isArray(dry?.unique) && dry.unique.length > 0 ? (
                <div className="divide-y theme-border">
                  {dry.unique.slice(0, 50).map((u, idx) => (
                    <div key={`${safeLower(u.name)}-${idx}`} className="px-3 py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold theme-text truncate">{u.name}</div>
                        <div className="text-xs theme-text-muted mt-0.5">{u.role ? `Ruolo: ${u.role}` : "Ruolo: —"}</div>
                      </div>
                      <div className="text-[11px] theme-text-muted">#{idx + 1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-6 text-sm theme-text-muted">Nessun record valido.</div>
              )}
            </div>
          </div>

          {/* Preview invalid (first 20) */}
          {Array.isArray(dry?.invalid) && dry.invalid.length > 0 ? (
            <div className="rounded-2xl border theme-border bg-[var(--panel2)] overflow-hidden">
              <div className="px-3 py-2 border-b theme-border bg-[var(--panel2)]">
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">Righe scartate (preview)</div>
                <div className="text-xs theme-text-muted mt-0.5">Mostra le prime 20 righe scartate con motivo.</div>
              </div>

              <div className="max-h-[240px] overflow-auto">
                <div className="divide-y theme-border">
                  {dry.invalid.slice(0, 20).map((r, idx) => (
                    <div key={`${r.row}-${idx}`} className="px-3 py-2">
                      <div className="text-xs theme-text-muted">
                        Riga <span className="font-semibold theme-text">{r.row}</span> ·{" "}
                        <span className="badge-warning font-semibold">{r.reason}</span>
                      </div>
                      <div className="text-[11px] theme-text-muted mt-0.5">
                        Nome: {r.name ? r.name : "—"} · Ruolo: {r.role ? r.role : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl px-3 py-2 text-xs badge-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-3 text-[11px] theme-text-muted">
        Colonne accettate: Nome (obbligatoria), Ruolo (opzionale). Dedup: case-insensitive, merge ruolo (prima occorrenza non vuota).
      </div>
    </div>
  );
}


