// src/inca/IncaFilesTable.jsx
import React from 'react';

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('it-IT', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IncaFilesTable({
  files,
  loading,
  refreshing,
  error,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Archivio file INCA
          </div>
          <div className="text-xs text-slate-300">
            Elenco dei file INCA importati (per analisi teorica Direzione).
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          {loading
            ? 'Caricamento…'
            : refreshing
            ? 'Aggiornamento…'
            : `${files?.length || 0} file`}
        </div>
      </div>

      {error && (
        <div className="mb-2 text-[11px] text-amber-200 bg-amber-900/40 border border-amber-700/70 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr className="text-left text-slate-300">
              <th className="px-2 py-2 border-r border-slate-800 w-[40%]">
                File
              </th>
              <th className="px-2 py-2 border-r border-slate-800 w-[10%]">
                Costr
              </th>
              <th className="px-2 py-2 border-r border-slate-800 w-[10%]">
                Commessa
              </th>
              <th className="px-2 py-2 border-r border-slate-800 w-[25%]">
                Caricato il
              </th>
              <th className="px-2 py-2 w-[15%]">Note</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-[12px] text-slate-400"
                >
                  Caricamento file INCA…
                </td>
              </tr>
            )}

            {!loading && (!files || files.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-[12px] text-slate-500"
                >
                  Nessun file INCA importato al momento. Usa il pulsante
                  &quot;Importa file INCA&quot; per iniziare.
                </td>
              </tr>
            )}

            {!loading &&
              files &&
              files.length > 0 &&
              files.map((f) => (
                <tr
                  key={f.id}
                  className="border-t border-slate-800/70 hover:bg-slate-900/80"
                >
                  <td className="px-2 py-1.5 text-slate-100 truncate max-w-xs">
                    <div className="flex flex-col">
                      <span className="font-medium truncate">
                        {f.file_name || '(senza nome)'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {f.file_type || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-slate-100">
                    {f.costr || '-'}
                  </td>
                  <td className="px-2 py-1.5 text-slate-100">
                    {f.commessa || '-'}
                  </td>
                  <td className="px-2 py-1.5 text-slate-200">
                    {formatDateTime(f.uploaded_at)}
                  </td>
                  <td className="px-2 py-1.5 text-slate-400 text-[11px]">
                    {/* Placeholder: plus tard on affichera % copertura dalla vista direzione_inca_teorico */}
                    Teorico: pronto per analisi
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        In una fase successiva, qui compariranno le metriche di copertura
        teorica e il confronto con i rapportini (Direzione).
      </div>
    </div>
  );
}
