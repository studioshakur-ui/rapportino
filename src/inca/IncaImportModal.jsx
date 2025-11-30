
// src/inca/IncaImportModal.jsx
// Fenêtre modale pour importer un fichier INCA (UFFICIO).
import React, { useRef, useState } from "react";
import { useIncaImporter } from "./useIncaImporter";

export default function IncaImportModal({ open, onClose, defaultCostr, defaultCommessa, onImported }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [costr, setCostr] = useState(defaultCostr || "");
  const [commessa, setCommessa] = useState(defaultCommessa || "");
  const [projectCode, setProjectCode] = useState("");
  const [note, setNote] = useState("");

  const { importInca, loading, error, result } = useIncaImporter();

  if (!open) return null;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleImport = async () => {
    try {
      const dataset = await importInca({
        file,
        costr,
        commessa,
        projectCode,
        note,
      });
      if (onImported) {
        onImported(dataset);
      }
    } catch (err) {
      // error déjà géré dans le hook
    }
  };

  const handleClose = () => {
    if (loading) return;
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Importa INCA · Lista Cavi
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Nave / Costruttore
              </label>
              <input
                type="text"
                value={costr}
                onChange={(e) => setCostr(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="6368"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Commessa
              </label>
              <input
                type="text"
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="SDC"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Codice progetto (opzionale)
            </label>
            <input
              type="text"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="es. 6368-SDC-INCA-01"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              File INCA (Excel/CSV)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-slate-700"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Per ora sono supportati solo file Excel (.xlsx) o CSV esportati da INCA.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Note (opzionale)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
              rows={2}
              placeholder="Note interne per l'ufficio (es. revisione INCA, fornitore disegni, ecc.)"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded px-3 py-2">
              <div className="font-semibold mb-1">Errore importazione</div>
              <div>{error.message || String(error)}</div>
            </div>
          )}

          {result && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              <div className="font-semibold mb-0.5">
                Import completato
              </div>
              <div>
                File: <span className="font-mono">{result.file.file_name}</span>
              </div>
              <div>
                Cavi inseriti:{" "}
                <span className="font-semibold">
                  {result.cavi?.length ?? 0}
                </span>
              </div>
              <div>
                Percorsi inseriti:{" "}
                <span className="font-semibold">
                  {result.percorsiCount ?? 0}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60"
          >
            Chiudi
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || !file}
            className="px-3 py-1.5 rounded border border-sky-600 bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {loading ? "Importo…" : "Importa file INCA"}
          </button>
        </div>
      </div>
    </div>
  );
}
