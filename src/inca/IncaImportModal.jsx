// src/inca/IncaImportModal.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useIncaImporter } from "./useIncaImporter";
import { corePills, cardSurface } from "../ui/designSystem";

export default function IncaImportModal({
  open,
  onClose,
  defaultCostr,
  defaultCommessa,
  onImported,
}) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [costr, setCostr] = useState(defaultCostr || "");
  const [commessa, setCommessa] = useState(defaultCommessa || "");
  const [projectCode, setProjectCode] = useState("");
  const [note, setNote] = useState("");

  const { dryRun, commit, loading, phase, error, result, reset } =
    useIncaImporter();

  // Anti-régression UX: si defaultCostr/defaultCommessa changent entre ouvertures
  useEffect(() => {
    if (!open) return;
    setCostr(defaultCostr || "");
    setCommessa(defaultCommessa || "");
  }, [open, defaultCostr, defaultCommessa]);

  // Reset léger à l'ouverture pour éviter un ancien result qui pollue
  useEffect(() => {
    if (!open) return;
    reset();
    setFile(null);
    setProjectCode("");
    setNote("");
  }, [open, reset]);

  const isDryOk = !!(result?.ok && result?.mode === "DRY_RUN");
  const isCommitOk = !!(result?.ok && result?.mode === "COMMIT");

  const counts = result?.counts || null;
  const debug = result?.debug || null;
  const total = typeof result?.total === "number" ? result.total : 0;
  const received = result?.received || null;

  const fileType = useMemo(() => {
    if (!file) return null;
    return "XLSX";
  }, [file]);

  const canDry =
    !!file &&
    !!String(costr).trim() &&
    !!String(commessa).trim() &&
    !loading;

  const canCommit = isDryOk && !loading;

  const warnings = useMemo(() => {
    if (!counts || !total) return [];
    const w = [];
    const npRatio = total > 0 ? (counts.NP || 0) / total : 0;
    if (npRatio > 0.6) w.push("Alto NP: verifica layout/STATO CANTIERE.");

    const nonStandard = debug?.nonStandardStatuses;
    if (Array.isArray(nonStandard) && nonStandard.length > 0) {
      w.push("Statuti non standard rilevati (vedi Debug).");
    }
    return w;
  }, [counts, debug, total]);

  const handleFile = (f) => setFile(f || null);

  const handleDry = async () => {
    await dryRun({ file, costr, commessa, projectCode, note });
  };

  const handleCommit = async () => {
    const data = await commit({ file, costr, commessa, projectCode, note });
    onImported?.(data);
  };

  if (!open) return null;

  const sizeKb =
    typeof received?.sizeBytes === "number"
      ? Math.max(1, Math.round(received.sizeBytes / 1024))
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {phase !== "idle" && (
          <div className="h-1 bg-slate-800 overflow-hidden">
            <div className="h-full w-1/2 bg-sky-500 animate-pulse" />
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Import INCA · Cockpit
            </div>
            <div className="text-sm font-semibold">XLSX → Analisi → Commit</div>
            <div className="text-[12px] text-slate-500 mt-1">
              CORE 1.0: solo XLSX. PDF disattivato.
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 w-9 rounded-full border border-slate-700 hover:bg-slate-900 disabled:opacity-60"
            title="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div
            className={[
              cardSurface(true),
              "border-dashed border-sky-500/40 flex flex-col items-center justify-center py-10 text-center transition-all",
              phase !== "idle" ? "shadow-[0_0_24px_rgba(56,189,248,0.6)]" : "",
            ].join(" ")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] || null);
            }}
          >
            <div className="text-sm font-semibold">
              {phase === "analyzing"
                ? "Analisi in corso…"
                : phase === "importing"
                ? "Importazione in corso…"
                : "Trascina qui il file INCA (XLSX)"}
            </div>
            <div className="text-xs text-slate-400 mt-1">XLSX · Edge parser</div>

            <button
              className="mt-4 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900 text-sm"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Seleziona file
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />

            {file && (
              <div className="mt-4 flex items-center gap-2">
                <span className={corePills(true, "sky")}>{fileType}</span>
                <span className="text-xs text-slate-300">{file.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="COSTR" value={costr} onChange={setCostr} placeholder="6368" />
            <Input label="Commessa" value={commessa} onChange={setCommessa} placeholder="SDC" />
            <Input
              label="Project code"
              value={projectCode}
              onChange={setProjectCode}
              placeholder="es. 6368-SDC-INCA-01"
            />
            <Input
              label="Note"
              value={note}
              onChange={setNote}
              placeholder="Revisione, note interne…"
            />
          </div>

          {isDryOk && received && (
            <div className={cardSurface(true)}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Risultato analisi (pipeline)</div>
                <div className="text-xs text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <span className={corePills(true, "sky")}>XLSX</span>
                    {sizeKb ? <span>{sizeKb} KB</span> : null}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-400">File</div>
                  <div className="mt-1 text-slate-100 font-mono break-all">
                    {received.fileName || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-400">COSTR / COMMESSA</div>
                  <div className="mt-1 text-slate-100 font-semibold">
                    {received.costr} / {received.commessa}
                  </div>
                </div>
              </div>

              {typeof result?.next === "string" && (
                <div className="mt-3 text-xs text-slate-300 italic">{result.next}</div>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div className={cardSurface(true, "border-amber-500/50 bg-amber-500/5")}>
              <div className="text-sm font-semibold text-amber-200 mb-2">Avvisi</div>
              <ul className="list-disc pl-5 text-xs text-amber-100">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {isDryOk && counts && (
            <div className={cardSurface(true)}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Telemetry INCA</div>
                <div className="text-xs text-slate-400">
                  Totale: <span className="text-slate-100 font-semibold">{total}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                {["P", "T", "R", "B", "E", "NP"].map((k) => (
                  <div
                    key={k}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 flex justify-between"
                  >
                    <span>{k}</span>
                    <span className="font-semibold">{counts[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isDryOk && debug && (
            <details className={cardSurface(true)}>
              <summary className="cursor-pointer text-sm font-medium">Debug tecnico (Edge)</summary>
              <pre className="mt-3 text-[11px] text-slate-300 overflow-auto">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
              {error.message || String(error)}
            </div>
          )}

          {isCommitOk && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              Import completato con successo.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDry}
            disabled={!canDry}
            className="px-4 py-2 rounded-full border border-sky-500/60 bg-sky-500/15 text-sky-100 disabled:opacity-50"
          >
            {phase === "analyzing" ? "Analisi…" : "Analizza"}
          </button>

          <button
            type="button"
            onClick={handleCommit}
            disabled={!canCommit}
            className="px-4 py-2 rounded-full border border-emerald-500/60 bg-emerald-500/15 text-emerald-100 disabled:opacity-50"
            title={!isDryOk ? "Esegui prima Analizza (dry-run)" : ""}
          >
            {phase === "importing" ? "Importo…" : "Importa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-slate-400">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm outline-none focus:border-sky-500/70"
      />
    </div>
  );
}
