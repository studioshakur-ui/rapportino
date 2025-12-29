// src/inca/IncaFileDetail.jsx
import React from 'react';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function IncaFileDetail({ file, metrics }) {
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
          <div className="text-[12px] text-slate-400 uppercase tracking-[0.18em]">
            INCA · File selezionato
          </div>
          <div className="text-[16px] font-semibold text-slate-50">
            {file.file_name || 'File INCA'}
          </div>
          <div className="text-[12px] text-slate-400 flex flex-wrap gap-2">
            <span>
              COSTR&nbsp;
              <span className="font-mono text-slate-100">
                {(file.costr || '').trim() || '—'}
              </span>
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Commessa&nbsp;
              <span className="font-mono text-slate-100">
                {(file.commessa || '').trim() || '—'}
              </span>
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Progetto&nbsp;
              <span className="font-mono text-slate-100">
                {(file.project_code || '').trim() || '—'}
              </span>
            </span>
          </div>
          {file.note && (
            <div className="text-[12px] text-slate-400 max-w-xl">
              Nota:&nbsp;
              <span className="text-slate-200">{file.note}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
            <span className="uppercase tracking-[0.18em]">
              {file.file_type ? file.file_type.toUpperCase() : 'FILE'}
            </span>
            <span className="w-[1px] h-4 bg-slate-700" />
            <span>Importato il {formatDateTime(file.uploaded_at)}</span>
          </div>
          <div className="font-mono text-slate-500">
            ID:&nbsp;
            <span className="text-slate-400">{file.id}</span>
          </div>
        </div>
      </div>

      {/* Strip KPI */}
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
          <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
            Cavi
          </div>
          <div className="text-lg font-semibold text-slate-50">{totalCavi}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
          <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
            Metri teorici
          </div>
          <div className="text-lg font-semibold text-slate-50">
            {metriTeo.toLocaleString('it-IT', {
              maximumFractionDigits: 1,
            })}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
          <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
            Previsti / Posati
          </div>
          <div className="text-[12px] text-slate-100">
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
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
          <div className="text-slate-500 uppercase tracking-[0.16em] mb-1">
            Metri totali
          </div>
          <div className="text-lg font-semibold text-slate-50">
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
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-slate-200"
            >
              <span className="font-semibold">
                {key && key.trim() ? key : 'Senza stato'}
              </span>
              <span className="w-[1px] h-3 bg-slate-700" />
              <span className="font-mono">{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
