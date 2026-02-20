// src/components/core-drive/CoreFilePreview.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useCoreFileAudit } from "../../hooks/useCoreFileAudit";

type CoreFile = {
  id?: string | number;
  filename?: string;
  cantiere?: string;
  commessa?: string;
  categoria?: string;
  origine?: string;
  stato_doc?: string;
  settimana_iso?: number | string;
  kpi_ref?: string;
  claim_id?: string;
  rapportino_id?: string;
  inca_file_id?: string;
  inca_cavo_id?: string;
  operator_id?: string;
  created_at?: string;
  updated_at?: string;
  frozen_at?: string;
  retention_until?: string;
  version_num?: number;
  version_of?: string;
  note?: string;
};
type AuditItem = {
  id?: string | number;
  action?: string;
  performed_at?: string;
  performed_role?: string;
  performed_by?: string;
  note?: string;
};

function formatDateTime(value?: string | number | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function CoreFilePreview({
  file,
  onClose,
}: {
  file?: CoreFile | null;
  onClose?: () => void;
}) {
  const { data: audit, isLoading: auditLoading } = useCoreFileAudit(
    file?.id as string | null | undefined
  ) as {
    data?: AuditItem[] | null;
    isLoading?: boolean;
  };

  return (
    <AnimatePresence>
      {file && (
        <motion.aside
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dettaglio documento
              </div>
              <div className="mt-0.5 max-w-xs truncate text-sm font-medium text-slate-900">
                {file.filename || '(senza nome)'}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Chiudi
            </button>
          </div>

          <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
            {/* Meta principale */}
            <section className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Info
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                <div>
                  <span className="font-medium">Cantiere:</span> {file.cantiere || '—'}
                </div>
                <div>
                  <span className="font-medium">Commessa:</span> {file.commessa || '—'}
                </div>
                <div>
                  <span className="font-medium">Categoria:</span> {file.categoria || '—'}
                </div>
                <div>
                  <span className="font-medium">Origine:</span> {file.origine || '—'}
                </div>
                <div>
                  <span className="font-medium">Stato:</span> {file.stato_doc || '—'}
                </div>
                <div>
                  <span className="font-medium">Settimana:</span> {file.settimana_iso ?? '—'}
                </div>
                <div>
                  <span className="font-medium">KPI ref:</span> {file.kpi_ref || '—'}
                </div>
                <div>
                  <span className="font-medium">Claim ID:</span> {file.claim_id || '—'}
                </div>
              </div>
            </section>

            {/* Liens métier */}
            <section className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Collegamenti
              </div>
              <div className="space-y-1 text-xs text-slate-700">
                <div>
                  <span className="font-medium">Rapportino / Report:</span>{' '}
                  {file.rapportino_id || '—'}
                </div>
                <div>
                  <span className="font-medium">File INCA:</span> {file.inca_file_id || '—'}
                </div>
                <div>
                  <span className="font-medium">Cavo INCA:</span> {file.inca_cavo_id || '—'}
                </div>
                <div>
                  <span className="font-medium">Operatore:</span> {file.operator_id || '—'}
                </div>
              </div>
            </section>

            {/* Dates & version */}
            <section className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Versione & audit
              </div>
              <div className="space-y-1 text-xs text-slate-700">
                <div>
                  <span className="font-medium">Creato il:</span>{' '}
                  {formatDateTime(file.created_at)}
                </div>
                <div>
                  <span className="font-medium">Aggiornato il:</span>{' '}
                  {formatDateTime(file.updated_at)}
                </div>
                <div>
                  <span className="font-medium">Congelato il:</span>{' '}
                  {formatDateTime(file.frozen_at)}
                </div>
                <div>
                  <span className="font-medium">Retention fino al:</span>{' '}
                  {formatDateTime(file.retention_until)}
                </div>
                <div>
                  <span className="font-medium">Versione:</span>{' '}
                  {file.version_num ?? 1}
                  {file.version_of && (
                    <span className="text-slate-500">
                      {' '}
                      (derivato da {file.version_of})
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Note */}
            <section className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Note
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 min-h-[40px]">
                {file.note && file.note.trim() !== '' ? file.note : 'Nessuna nota.'}
              </div>
            </section>

            {/* Audit trail */}
            <section className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Attività
              </div>
              {auditLoading ? (
                <div className="text-xs text-slate-500">Caricamento attività...</div>
              ) : !audit || audit.length === 0 ? (
                <div className="text-xs text-slate-500">Nessuna attività registrata.</div>
              ) : (
                <ol className="space-y-1 text-xs text-slate-700">
                  {audit.map((evt) => (
                    <li key={evt.id} className="flex flex-col border-l border-slate-200 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{evt.action}</span>
                        <span className="text-[10px] text-slate-500">
                          {formatDateTime(evt.performed_at)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {evt.performed_role || '—'} {evt.performed_by ? `(${evt.performed_by})` : ''}
                      </div>
                      {evt.note && (
                        <div className="mt-0.5 text-[11px] text-slate-600">{evt.note}</div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
