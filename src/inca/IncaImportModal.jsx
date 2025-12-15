// src/inca/IncaImportModal.jsx
import React, { useMemo, useRef, useState } from "react";
import { useIncaImporter } from "./useIncaImporter";

export default function IncaImportModal({
  open,
  onClose,
  defaultCostr,
  defaultCommessa,
  onImported,
}) {
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1=File, 2=Dry-run OK, 3=Commit OK
  const [file, setFile] = useState(null);
  const [costr, setCostr] = useState(defaultCostr || "");
  const [commessa, setCommessa] = useState(defaultCommessa || "");
  const [projectCode, setProjectCode] = useState("");
  const [note, setNote] = useState("");

  const { dryRun, commit, loading, error, result } = useIncaImporter();

  const canCommit = useMemo(() => {
    return !!file && !!String(costr || "").trim() && !!String(commessa || "").trim();
  }, [file, costr, commessa]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStep(1);
  };

  const handleDryRun = async () => {
    try {
      const r = await dryRun({
        file,
        costr,
        commessa,
        projectCode,
        note,
      });
      if (r?.ok) setStep(2);
    } catch {
      // error géré dans hook
    }
  };

  const handleCommit = async () => {
    try {
      const dataset = await commit({
        file,
        costr,
        commessa,
        projectCode,
        note,
      });
      setStep(3);
      if (onImported) onImported(dataset);
    } catch {
      // error géré dans hook
    }
  };

  const handleClose = () => {
    if (loading) return;
    setStep(1);
    setFile(null);
    if (onClose) onClose();
  };

  const isDryRun = result?.ok && result?.mode === "dry-run";
  const isCommit = result?.ok && result?.mode === "commit";

  const stats = result?.stats || null; // { total, P, B, T, E, R, NP, metri_teo_tot }
  const totalCavi = result?.found ?? stats?.total ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex flex-col">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Wizard import INCA · UFFICIO
            </div>
            <div className="text-sm font-semibold">
              XLSX → Analisi (dry-run) → Import (commit)
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="h-9 w-9 rounded-full border border-slate-700 hover:bg-slate-900/60 disabled:opacity-60"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-[12px]">
            <StepPill active={step === 1} label="1 · File" />
            <span className="text-slate-600">→</span>
            <StepPill active={step === 2} label="2 · Dry-run" />
            <span className="text-slate-600">→</span>
            <StepPill active={step === 3} label="3 · Commit" />
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nave / COSTR (obbligatorio)">
              <input
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
                placeholder="6368"
              />
            </Field>

            <Field label="Commessa (obbligatorio)">
              <input
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
                placeholder="SDC"
              />
            </Field>

            <Field label="Project code (opzionale)">
              <input
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
                placeholder="es. 6368-SDC-INCA-01"
              />
            </Field>

            <Field label="Note (opzionale)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
                placeholder="Revisione, note interne..."
              />
            </Field>
          </div>

          {/* File */}
          <div className="space-y-2">
            <div className="text-[12px] font-semibold text-slate-200">
              File INCA (XLSX consigliato)
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-200"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Procedura: <span className="text-slate-200 font-medium">Analizza (dry-run)</span> per vedere P/B/T/E e metri, poi <span className="text-slate-200 font-medium">Importa (commit)</span>.
            </div>
          </div>

          {/* Dry-run results */}
          {isDryRun && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] font-semibold text-slate-100">
                  Risultato analisi (dry-run)
                </div>
                <div className="text-[11px] text-slate-400 text-right">
                  <div>
                    Totale cavi:{" "}
                    <span className="text-slate-100 font-semibold">
                      {totalCavi ?? "—"}
                    </span>
                  </div>
                  {typeof stats?.metri_teo_tot === "number" && (
                    <div>
                      Metri (disegno):{" "}
                      <span className="text-slate-100 font-semibold">
                        {Math.round(stats.metri_teo_tot * 100) / 100}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {stats && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px]">
                  <StatPill label="P" value={stats.P ?? 0} />
                  <StatPill label="T" value={stats.T ?? 0} />
                  <StatPill label="R" value={stats.R ?? 0} />
                  <StatPill label="B" value={stats.B ?? 0} />
                  <StatPill label="E" value={stats.E ?? 0} />
                  <StatPill label="NP" value={stats.NP ?? 0} />
                </div>
              )}

              <div className="mt-3 text-[11px] text-slate-500">
                Campione (prime 10 righe) disponibile in <span className="text-slate-200">result.sample</span>.
              </div>
            </div>
          )}

          {/* Commit results */}
          {isCommit && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-[12px]">
              <div className="font-semibold text-emerald-200">Import completato</div>
              <div className="text-emerald-100 mt-1">
                Inseriti/aggiornati:{" "}
                <span className="font-semibold">{result.inserted ?? "—"}</span>{" "}
                cavi · inca_file_id:{" "}
                <span className="font-mono">{result.inca_file_id ?? "—"}</span>
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-[12px]">
              <div className="font-semibold text-rose-200">Errore</div>
              <div className="text-rose-100 mt-1">{error.message || String(error)}</div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-full border border-slate-700 bg-slate-950 hover:bg-slate-900/60 text-sm disabled:opacity-60"
          >
            Chiudi
          </button>

          <button
            type="button"
            onClick={handleDryRun}
            disabled={loading || !file || !String(costr || "").trim() || !String(commessa || "").trim()}
            className="px-4 py-2 rounded-full border border-sky-500/60 bg-sky-500/15 hover:bg-sky-500/25 text-sm disabled:opacity-60"
            title="Serve file + COSTR + Commessa"
          >
            {loading ? "Analisi…" : "Analizza (dry-run)"}
          </button>

          <button
            type="button"
            onClick={handleCommit}
            disabled={loading || !canCommit}
            className="px-4 py-2 rounded-full border border-emerald-500/60 bg-emerald-500/15 hover:bg-emerald-500/25 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canCommit ? "Serve COSTR + Commessa + file" : ""}
          >
            {loading ? "Importo…" : "Importa (commit)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepPill({ active, label }) {
  return (
    <span
      className={[
        "px-3 py-1 rounded-full border text-[12px]",
        active
          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-100"
          : "border-slate-800 bg-slate-900/40 text-slate-400",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[12px] text-slate-400">{label}</div>
      {children}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 flex items-center justify-between gap-2">
      <span className="text-slate-300">{label}</span>
      <span className="text-slate-100 font-semibold">{value}</span>
    </div>
  );
}
