// src/inca/IncaFilesTable.jsx
import React, { useMemo, useState } from 'react';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function IncaFilesTable({
  files,
  loading,
  refreshing,
  selectedFileId,
  onSelectFile,
  onRefresh,
  onOpenCockpit, // ⬅️ nouveau (optionnel)
}) {
  const [search, setSearch] = useState('');
  const [costrFilter, setCostrFilter] = useState('');

  const { filtered, distinctCostr } = useMemo(() => {
    if (!files || files.length === 0) {
      return { filtered: [], distinctCostr: [] };
    }

    const norm = (v) => (v || '').toString().toLowerCase();

    const distinctCostrSet = new Set(
      files
        .map((f) => (f.costr || '').trim())
        .filter((v) => v && v !== '-')
    );

    const distinctCostr = Array.from(distinctCostrSet).sort((a, b) =>
      a.localeCompare(b, 'it-IT')
    );

    const s = norm(search);

    const filtered = files.filter((f) => {
      if (costrFilter && (f.costr || '').trim() !== costrFilter) {
        return false;
      }

      if (!s) return true;

      return (
        norm(f.costr).includes(s) ||
        norm(f.commessa).includes(s) ||
        norm(f.project_code).includes(s) ||
        norm(f.file_name).includes(s) ||
        norm(f.note).includes(s)
      );
    });

    return { filtered, distinctCostr };
  }, [files, search, costrFilter]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-slate-100">
            File INCA caricati
          </div>
          <div className="text-[11px] text-slate-500">
            {loading
              ? 'Caricamento in corso…'
              : `${filtered.length} file su ${files?.length || 0}`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre COSTR */}
          <select
            value={costrFilter}
            onChange={(e) => setCostrFilter(e.target.value)}
            className="text-[11px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Tutti i COSTR</option>
            {distinctCostr.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Cerca per file, commessa, project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[11px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 w-40 lg:w-52"
          />

          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            {refreshing ? 'Aggiorno…' : 'Aggiorna'}
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-auto text-[11px]">
        <table className="w-full border-collapse">
          <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
            <tr className="text-slate-400">
              <th className="px-3 py-2 text-left font-normal">COSTR</th>
              <th className="px-3 py-2 text-left font-normal">Commessa</th>
              <th className="px-3 py-2 text-left font-normal">Progetto</th>
              <th className="px-3 py-2 text-left font-normal">Nome file</th>
              <th className="px-3 py-2 text-left font-normal">Tipo</th>
              <th className="px-3 py-2 text-right font-normal">Cavi</th>
              <th className="px-3 py-2 text-right font-normal">Importato il</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Nessun file INCA trovato con questi filtri.
                </td>
              </tr>
            )}

            {filtered.map((f) => {
              const active = f.id === selectedFileId;
              return (
                <tr
                  key={f.id}
                  onClick={() => onSelectFile && onSelectFile(f.id)}
                  onDoubleClick={() =>
                    onOpenCockpit && onOpenCockpit(f)
                  }
                  className={[
                    'border-t border-slate-900 cursor-pointer',
                    active ? 'bg-sky-950/60' : 'hover:bg-slate-900/60',
                  ].join(' ')}
                  title="Doppio clic per aprire il cockpit INCA"
                >
                  <td className="px-3 py-2 text-slate-100 font-medium">
                    {(f.costr || '').trim() || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {(f.commessa || '').trim() || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {(f.project_code || '').trim() || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-100">
                    {f.file_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {(f.file_type || '').toUpperCase() || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {f.cavi_count != null ? f.cavi_count : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-400">
                    {formatDate(f.uploaded_at)}
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Caricamento file INCA…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
