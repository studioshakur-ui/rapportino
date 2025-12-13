// src/components/core-drive/CoreFileRow.jsx
import React from 'react';

function categoryLabel(cat) {
  if (!cat) return '–';
  return cat.replace(/_/g, ' ');
}

function statoBadge(stato) {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold';
  switch (stato) {
    case 'BOZZA':
      return base + ' bg-yellow-50 text-yellow-800 border border-yellow-200';
    case 'VALIDATO':
      return base + ' bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'CONFERMATO':
      return base + ' bg-blue-50 text-blue-800 border border-blue-200';
    case 'ARCHIVIATO':
      return base + ' bg-slate-100 text-slate-600 border border-slate-300';
    default:
      return base + ' bg-slate-100 text-slate-700 border border-slate-300';
  }
}

export default function CoreFileRow({ file, selected, onSelect }) {
  const handleClick = () => {
    onSelect?.(file);
  };

  const createdAt = file.created_at
    ? new Date(file.created_at).toLocaleString()
    : '—';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        'w-full text-left border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 ' +
        (selected ? 'bg-slate-100' : 'bg-white')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Icône simple */}
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
            {file.categoria ? file.categoria.slice(0, 3).toUpperCase() : 'DOC'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">
              {file.filename || '(senza nome)'}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>
                {file.cantiere || '–'} / {file.commessa || '–'}
              </span>
              <span className="text-slate-300">•</span>
              <span>{categoryLabel(file.categoria)}</span>
              {file.origine && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{file.origine}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={statoBadge(file.stato_doc)}>{file.stato_doc}</span>
          <span className="text-[10px] text-slate-500">{createdAt}</span>
        </div>
      </div>
    </button>
  );
}
