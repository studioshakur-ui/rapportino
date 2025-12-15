import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";

function normHeader(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickValue(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }
  return "";
}

function asText(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export default function ImportOperatorsExcel({ shipId, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const canRun = useMemo(() => !!shipId && !!file && !busy, [shipId, file, busy]);

  async function handleImport() {
    if (!canRun) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const firstSheetName = wb.SheetNames?.[0];
      if (!firstSheetName) throw new Error("File Excel non valido.");

      const ws = wb.Sheets[firstSheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error("Il file non contiene righe importabili.");
      }

      // Normalize headers
      // sheet_to_json returns objects with original headers; we rebuild a normalized object
      const rows = raw.map((r) => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          out[normHeader(k)] = v;
        }
        return out;
      });

      // Acceptable header keys (minimal CORE format)
      const nameKeys = ["nome", "name", "nominativo", "operaio", "operatore"];
      const roleKeys = ["ruolo", "role", "mansione", "qualifica"];

      const parsed = rows
        .map((r) => {
          const name = asText(pickValue(r, nameKeys));
          const role = asText(pickValue(r, roleKeys));
          return { name, role };
        })
        .filter((r) => r.name.length > 0);

      if (parsed.length === 0) {
        throw new Error("Nessuna riga valida. Colonna richiesta: 'Nome'.");
      }

      // Deduplicate by operator name (case-insensitive)
      const dedupMap = new Map();
      for (const p of parsed) {
        const key = p.name.toLowerCase();
        if (!dedupMap.has(key)) {
          dedupMap.set(key, p);
        } else {
          // Merge roles (keep the first non-empty role)
          const existing = dedupMap.get(key);
          if (!existing.role && p.role) existing.role = p.role;
        }
      }
      const unique = Array.from(dedupMap.values());

      // 1) Upsert into operators (UNIQUE name)
      // NOTE: operators.roles is text[]; we store [role] if provided else [].
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

      // 2) Link to ship (upsert ship_operators)
      const links = ops.map((o) => ({
        ship_id: shipId,
        operator_id: o.id,
        active: true,
      }));

      const { error: linkErr } = await supabase
        .from("ship_operators")
        .upsert(links, { onConflict: "ship_id,operator_id" });

      if (linkErr) throw linkErr;

      setResult({
        imported_rows: parsed.length,
        unique_names: unique.length,
        linked: links.length,
      });

      onDone?.();
    } catch (err) {
      console.error("[ImportOperatorsExcel] error:", err);
      setError(err?.message || "Errore durante l'import.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Import Excel
          </div>
          <div className="text-sm font-medium text-slate-100">
            Lista operai (formato CORE)
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Colonne accettate: <span className="text-slate-200">Nome</span> (obbligatoria),
            <span className="text-slate-200"> Ruolo</span> (opzionale). Nessuna creazione account.
          </div>
        </div>

        <div className="text-[11px] text-slate-500 text-right">
          <div className="uppercase tracking-[0.18em] text-slate-600">Modalità</div>
          <div>Sola importazione elenco</div>
        </div>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-xs text-slate-300"
        />

        <button
          onClick={handleImport}
          disabled={!canRun}
          className={[
            "h-9 px-3 rounded-xl border text-xs font-medium",
            "border-slate-700 text-slate-100 hover:bg-slate-900/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {busy ? "Importazione…" : "Importa"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-emerald-700/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          Import completato: righe {result.imported_rows}, nomi unici {result.unique_names}, assegnati al cantiere {result.linked}.
        </div>
      ) : null}
    </div>
  );
}
