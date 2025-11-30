
// src/inca/IncaFilesPanel.jsx
// Petit panneau UFFICIO pour voir la liste des fichiers INCA importés.
import React, { useEffect, useState } from "react";
import { listIncaFiles } from "./incaApi";

export default function IncaFilesPanel({
  costr,
  commessa,
  onSelectFile,
  refreshKey,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await listIncaFiles({ costr, commessa });
        if (!active) return;
        setFiles(data);
      } catch (err) {
        console.error("Errore caricamento inca_files:", err);
        if (!active) return;
        setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [costr, commessa, refreshKey]);

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-600">
            Fichier INCA importati
          </div>
          <div className="text-[11px] text-slate-500">
            Filtrati per nave/commessa attuali (se impostati).
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-xs text-slate-500">Caricamento…</div>
      )}

      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          Errore: {error.message || String(error)}
        </div>
      )}

      {!loading && !error && files.length === 0 && (
        <div className="text-xs text-slate-500">
          Nessun file INCA importato per questi filtri.
        </div>
      )}

      {!loading && !error && files.length > 0 && (
        <div className="mt-2 max-h-60 overflow-y-auto border border-slate-200 rounded">
          <table className="w-full border-collapse text-[11px]">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-2 py-1 text-left">Data</th>
                <th className="px-2 py-1 text-left">File</th>
                <th className="px-2 py-1 text-left">Nave</th>
                <th className="px-2 py-1 text-left">Commessa</th>
                <th className="px-2 py-1 text-left">Azione</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-2 py-1 align-top">
                    {f.uploaded_at
                      ? new Date(f.uploaded_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-2 py-1 align-top font-mono">
                    {f.file_name}
                  </td>
                  <td className="px-2 py-1 align-top">{f.costr || "-"}</td>
                  <td className="px-2 py-1 align-top">
                    {f.commessa || "-"}
                  </td>
                  <td className="px-2 py-1 align-top">
                    <button
                      type="button"
                      onClick={() => onSelectFile && onSelectFile(f)}
                      className="px-2 py-0.5 rounded border border-sky-500 text-sky-700 hover:bg-sky-50"
                    >
                      Apri cavi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
