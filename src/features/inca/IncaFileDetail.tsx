// src/inca/IncaFileDetail.jsx
function formatDateTime(iso: unknown): string {
  if (!iso) return '—';
  try {
    const d = new Date(String(iso));
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

type IncaFile = {
  id?: string | number;
  file_name?: string;
  file_type?: string;
  costr?: string;
  commessa?: string;
  project_code?: string;
  note?: string;
  uploaded_at?: string;
};
type IncaMetrics = {
  totalCavi?: number;
  metriTeo?: number;
  metriPrev?: number;
  metriPosati?: number;
  metriTot?: number;
  byStatoCantiere?: Record<string, number>;
};

export default function IncaFileDetail({ file, metrics }: { file?: IncaFile | null; metrics?: IncaMetrics | null }) {
  if (!file) return null;

  const {
    totalCavi = 0,
    metriTeo = 0,
    metriPrev = 0,
    metriPosati = 0,
    metriTot = 0,
    byStatoCantiere = {},
  } = metrics || {};

  return (
    <div className="mb-3">
      {/* Ligne principale */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-[12px] theme-text-muted uppercase tracking-[0.18em]">INCA · File selezionato</div>
          <div className="text-[16px] font-semibold theme-text">{file.file_name || 'File INCA'}</div>
          <div className="text-[12px] theme-text-muted flex flex-wrap gap-2">
            <span>
              COSTR&nbsp;
              <span className="font-mono theme-text">
                {(file.costr || '').trim() || '—'}
              </span>
            </span>
            <span className="theme-text-muted">·</span>
            <span>
              Commessa&nbsp;
              <span className="font-mono theme-text">
                {(file.commessa || '').trim() || '—'}
              </span>
            </span>
            <span className="theme-text-muted">·</span>
            <span>
              Progetto&nbsp;
              <span className="font-mono theme-text">
                {(file.project_code || '').trim() || '—'}
              </span>
            </span>
          </div>
          {file.note && (
            <div className="text-[12px] theme-text-muted max-w-xl">
              Nota:&nbsp;
              <span className="theme-text">{file.note}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px] theme-text-muted">
          <div className="inline-flex items-center gap-2 rounded-full border theme-border bg-[var(--panel2)] px-3 py-1">
            <span className="uppercase tracking-[0.18em]">
              {file.file_type ? file.file_type.toUpperCase() : 'FILE'}
            </span>
            <span className="w-[1px] h-4 bg-[var(--borderStrong)]" />
            <span>Importato il {formatDateTime(file.uploaded_at)}</span>
          </div>
          <div className="font-mono theme-text-muted">
            ID:&nbsp;
            <span className="theme-text-muted">{file.id}</span>
          </div>
        </div>
      </div>

      {/* Strip KPI */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-lg theme-panel-2 px-3 py-2">
          <div className="theme-text-muted uppercase tracking-[0.16em] mb-1">Cavi</div>
          <div className="text-lg font-semibold theme-text">{totalCavi}</div>
        </div>
        <div className="rounded-lg theme-panel-2 px-3 py-2">
          <div className="theme-text-muted uppercase tracking-[0.16em] mb-1">Metri teorici</div>
          <div className="text-lg font-semibold theme-text">
            {metriTeo.toLocaleString('it-IT', {
              maximumFractionDigits: 1,
            })}
          </div>
        </div>
        <div className="rounded-lg theme-panel-2 px-3 py-2">
          <div className="theme-text-muted uppercase tracking-[0.16em] mb-1">Previsti / Posati</div>
          <div className="text-[12px] theme-text">
            Prev:&nbsp;
            <span className="font-mono">
              {metriPrev.toLocaleString('it-IT', {
                maximumFractionDigits: 1,
              })}
            </span>
            &nbsp; · Pos:&nbsp;
            <span className="font-mono">
              {metriPosati.toLocaleString('it-IT', {
                maximumFractionDigits: 1,
              })}
            </span>
          </div>
        </div>
        <div className="rounded-lg theme-panel-2 px-3 py-2">
          <div className="theme-text-muted uppercase tracking-[0.16em] mb-1">Metri totali</div>
          <div className="text-lg font-semibold theme-text">
            {metriTot.toLocaleString('it-IT', {
              maximumFractionDigits: 1,
            })}
          </div>
        </div>
      </div>

      {/* Distribution stato cantiere */}
      {byStatoCantiere && Object.keys(byStatoCantiere).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          {Object.entries(byStatoCantiere).map(([key, value]) => (
            <span
              key={key || 'vuoto'}
              className="inline-flex items-center gap-1 rounded-full border theme-border bg-[var(--panel2)] px-2 py-1 theme-text"
            >
              <span className="font-semibold">{key && key.trim() ? key : 'Senza stato'}</span>
              <span className="w-[1px] h-3 bg-[var(--borderStrong)]" />
              <span className="font-mono">{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
