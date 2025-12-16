import React, { useMemo } from "react";

const IT_MONTHS_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function formatDateItShort(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const dd = d.getDate();
    const m = IT_MONTHS_SHORT[d.getMonth()] || "";
    const yyyy = d.getFullYear();
    return `${dd} ${m}. ${yyyy}`;
  } catch {
    return iso;
  }
}

export default function RapportinoHeader({
  costr,
  commessa,
  reportDate,
  capoName,
  onChangeCostr,
  onChangeCommessa,
  onChangeDate,
}) {
  const datePrint = useMemo(() => formatDateItShort(reportDate), [reportDate]);

  return (
    <div className="pb-4">
      <div className="text-center text-[14px] font-semibold tracking-wide">
        RAPPORTINO GIORNALIERO
      </div>

      {/* Mobile-first: stack on small screens, keep 3 columns on sm+ */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] items-end gap-4 sm:gap-6 text-[12px]">
        {/* COSTR */}
        <div className="flex items-end gap-2">
          <div className="font-semibold whitespace-nowrap">COSTR.:</div>

          {/* écran */}
          <input
            className="no-print w-[140px] border-b border-slate-400 outline-none bg-transparent text-slate-900"
            value={costr}
            onChange={(e) => onChangeCostr?.(e.target.value)}
          />

          {/* print */}
          <div className="print-only min-w-[140px] border-b border-slate-400">
            {costr}
          </div>
        </div>

        {/* Commessa + Capo (centré) */}
        <div className="flex flex-col items-start sm:items-center gap-2">
          <div className="flex items-end gap-2">
            <div className="font-semibold whitespace-nowrap">Commessa:</div>

            {/* écran */}
            <input
              className="no-print w-[200px] border-b border-slate-400 outline-none bg-transparent text-slate-900 sm:text-center"
              value={commessa}
              onChange={(e) => onChangeCommessa?.(e.target.value)}
            />

            {/* print */}
            <div className="print-only min-w-[200px] border-b border-slate-400 sm:text-center">
              {commessa}
            </div>
          </div>

          <div className="text-[11px]">
            <span className="font-semibold mr-2">Capo Squadra:</span>
            <span>{capoName}</span>
          </div>
        </div>

        {/* Data */}
        <div className="flex items-end justify-start sm:justify-end gap-2">
          <div className="font-semibold whitespace-nowrap">DATA:</div>

          {/* écran */}
          <input
            type="date"
            className="no-print w-[160px] border border-slate-300 rounded-md px-2 py-1 outline-none bg-white text-slate-900"
            value={reportDate}
            onChange={(e) => onChangeDate?.(e.target.value)}
          />

          {/* print */}
          <div className="print-only min-w-[160px] border border-slate-300 rounded-md px-2 py-1 sm:text-right">
            {datePrint}
          </div>
        </div>
      </div>
    </div>
  );
}
