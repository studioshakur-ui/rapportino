// src/components/core-drive/CoreDriveFilters.jsx
import React from 'react';

/**
 * Props:
 * - filters
 * - onChange(newFilters)
 * - availableCantieri?: string[]
 * - availableCommesse?: string[]
 */
export default function CoreDriveFilters({
  filters,
  onChange,
  availableCantieri = [],
  availableCommesse = [],
}) {
  const handleChange = (field, value) => {
    onChange({
      ...filters,
      [field]: value,
    });
  };

  const toggleArrayField = (field, value) => {
    const current = filters[field] || [];
    const exists = current.includes(value);
    const next = exists ? current.filter((v) => v !== value) : [...current, value];
    onChange({
      ...filters,
      [field]: next,
    });
  };

  const handleReset = () => {
    onChange({
      cantiere: filters.cantiere || '',
      commessa: '',
      categoria: [],
      origine: [],
      // ⚠️ IMPORTANT : on ne met que des valeurs existantes dans doc_stato
      statoDoc: ['BOZZA', 'CONFERMATO'], // ARCHIVIATO exclu par défaut
      text: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // ⚠️ Aligné avec ton enum doc_stato côté DB
  const statoOptions = ['BOZZA', 'CONFERMATO', 'ARCHIVIATO'];

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl rounded-3xl border border-slate-700 bg-slate-950/80 shadow-lg shadow-slate-900/40">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-50">CORE Drive</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Archivio documentale centralizzato — navire, rapportini, INCA, KPI.
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-3 md:flex-row md:items-end md:justify-between">
        {/* Bloc gauche : cantiere / commessa / stato */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Cantiere */}
          <div className="flex flex-col text-xs">
            <label className="mb-1 font-medium text-slate-200">Cantiere</label>
            <select
              className="min-w-[140px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50"
              value={filters.cantiere || ''}
              onChange={(e) => handleChange('cantiere', e.target.value)}
            >
              <option value="">Tutti</option>
              {availableCantieri.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Commessa */}
          <div className="flex flex-col text-xs">
            <label className="mb-1 font-medium text-slate-200">Commessa</label>
            <select
              className="min-w-[140px] rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50"
              value={filters.commessa || ''}
              onChange={(e) => handleChange('commessa', e.target.value)}
            >
              <option value="">Tutte</option>
              {availableCommesse.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stato */}
          <div className="flex flex-col text-xs">
            <label className="mb-1 font-medium text-slate-200">Stato documento</label>
            <div className="flex flex-wrap gap-1">
              {statoOptions.map((s) => {
                const active = filters.statoDoc?.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleArrayField('statoDoc', s)}
                    className={
                      'rounded-full border px-2 py-0.5 text-[11px] ' +
                      (active
                        ? 'border-slate-50 bg-slate-50 text-slate-900'
                        : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-400')
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bloc droite : dates + recherche + reset */}
        <div className="flex flex-wrap gap-3 items-end justify-end">
          {/* Date from/to */}
          <div className="flex flex-col text-[11px]">
            <label className="mb-1 font-medium text-slate-200">Dal</label>
            <input
              type="date"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-50"
              value={filters.dateFrom || ''}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="flex flex-col text-[11px]">
            <label className="mb-1 font-medium text-slate-200">Al</label>
            <input
              type="date"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-50"
              value={filters.dateTo || ''}
              onChange={(e) => handleChange('dateTo', e.target.value)}
            />
          </div>

          {/* Recherche texte */}
          <div className="flex flex-col text-xs min-w-[200px]">
            <label className="mb-1 font-medium text-slate-200">Ricerca</label>
            <input
              type="text"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-50 placeholder:text-slate-500"
              placeholder="Nome file, note, KPI..."
              value={filters.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
            />
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center rounded-md border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 hover:border-slate-300 hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
