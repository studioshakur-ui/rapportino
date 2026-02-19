// src/features/direzione/dashboard/components/DirezioneFilters.tsx


import type { DirezioneFilters } from "../types";

export type DirezioneFiltersProps = {
  filters: DirezioneFilters;
  onChange: (patch: Partial<DirezioneFilters>) => void;
  onReset: () => void;
  labels: {
    window: string;
    costr: string;
    commessa: string;
    reset: string;
  };
};

export default function DirezioneFilters({ filters, onChange, onReset, labels }: DirezioneFiltersProps): JSX.Element {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-400">{labels.window}:</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
          <span className="text-slate-500">→</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">{labels.costr}</span>
          <input
            type="text"
            value={filters.costr}
            onChange={(e) => onChange({ costr: e.target.value })}
            placeholder="es. 6368"
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">{labels.commessa}</span>
          <input
            type="text"
            value={filters.commessa}
            onChange={(e) => onChange({ commessa: e.target.value })}
            placeholder="es. SDC"
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-full border border-slate-700/80 bg-slate-950/60 text-[11px] text-slate-200 hover:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            {labels.reset}
          </button>
        </div>
      </div>
    </section>
  );
}
