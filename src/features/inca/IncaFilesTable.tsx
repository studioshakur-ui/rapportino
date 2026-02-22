// src/inca/IncaFilesTable.jsx
import { useMemo, useState } from 'react';

type IncaFile = {
  id?: string | number;
  costr?: string;
  commessa?: string;
  project_code?: string;
  file_name?: string;
  file_type?: string;
  cavi_count?: number | null;
  uploaded_at?: string;
  note?: string;
};

function formatDate(iso: unknown): string {
  if (!iso) return '—';
  try {
    const d = new Date(String(iso));
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(iso);
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
}: {
  files?: IncaFile[];
  loading: boolean;
  refreshing: boolean;
  selectedFileId?: string | number | null;
  onSelectFile?: (id: string | number) => void;
  onRefresh?: () => void;
  onOpenCockpit?: (file: IncaFile) => void;
}) {
  const [search, setSearch] = useState('');
  const [costrFilter, setCostrFilter] = useState('');

  const { filtered, distinctCostr } = useMemo(() => {
    if (!files || files.length === 0) {
      return { filtered: [], distinctCostr: [] };
    }

    const norm = (v: unknown) => (v || '').toString().toLowerCase();

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
    <div className="rounded-xl theme-panel overflow-hidden">
      <div className="px-3 py-2 border-b theme-border flex items-center justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold theme-text">
            File INCA caricati
          </div>
          <div className="text-[11px] theme-text-muted">
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
            className="theme-input text-[11px] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
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
            className="theme-input text-[11px] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 w-40 lg:w-52"
          />

          <button
            type="button"
            onClick={onRefresh}
            className="btn-instrument text-[11px] px-2 py-1 rounded-md"
          >
            {refreshing ? 'Aggiorno…' : 'Aggiorna'}
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-auto text-[11px]">
        <table className="w-full border-collapse">
          <thead className="theme-table-head sticky top-0 z-10">
            <tr className="theme-text-muted">
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
                  className="px-3 py-4 text-center theme-text-muted"
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
                  onClick={() => onSelectFile && f.id != null && onSelectFile(f.id)}
                  onDoubleClick={() =>
                    onOpenCockpit && onOpenCockpit(f)
                  }
                  className={[
                    'border-t theme-border cursor-pointer',
                    active ? 'theme-row-selected' : '',
                  ].join(' ')}
                  title="Doppio clic per aprire il cockpit INCA"
                >
                  <td className="px-3 py-2 theme-text font-medium">
                    {(f.costr || '').trim() || '—'}
                  </td>
                  <td className="px-3 py-2 theme-text-muted">
                    {(f.commessa || '').trim() || '—'}
                  </td>
                  <td className="px-3 py-2 theme-text-muted">
                    {(f.project_code || '').trim() || '—'}
                  </td>
                  <td className="px-3 py-2 theme-text">
                    {f.file_name || '—'}
                  </td>
                  <td className="px-3 py-2 theme-text-muted">
                    {(f.file_type || '').toUpperCase() || '—'}
                  </td>
                  <td className="px-3 py-2 text-right theme-text-muted">
                    {f.cavi_count != null ? f.cavi_count : '—'}
                  </td>
                  <td className="px-3 py-2 text-right theme-text-muted">
                    {formatDate(f.uploaded_at)}
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center theme-text-muted"
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
