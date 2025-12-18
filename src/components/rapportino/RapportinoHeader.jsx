// src/components/rapportino/RapportinoHeader.jsx
import React, { useMemo } from "react";

const IT_MONTHS_SHORT = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic",
];

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
  readOnly = false,
}) {
  const datePrint = useMemo(() => formatDateItShort(reportDate), [reportDate]);

  return (
    <div className="pb-4">
      <div className="text-center text-[14px] font-semibold tracking-wide">
        RAPPORTINO GIORNALIERO
      </div>

      <div className="mt-6 grid grid-cols-[1fr_1fr_1fr] items-end gap-6 text-[12px]">
        <div className="flex items-end gap-2">
          <div className="font-semibold whitespace-nowrap">COSTR.:</div>

          <input
            className={
              "no-print w-[140px] border-b border-slate-400 outline-none bg-transparent text-slate-900" +
              (readOnly ? " opacity-80 cursor-not-allowed" : "")
            }
            value={costr}
            onChange={readOnly ? undefined : (e) => onChangeCostr?.(e.target.value)}
            disabled={readOnly}
            readOnly={readOnly}
          />

          <div className="print-only min-w-[140px] border-b border-slate-400">
            {costr}
          </div>
        </div>

        <div className="flex items-end justify-center">
          <div className="text-[11px]">
            <span className="font-semibold mr-2">Capo Squadra:</span>
            <span>{capoName}</span>
          </div>
        </div>

        <div className="flex items-end justify-end gap-2">
          <div className="font-semibold whitespace-nowrap">DATA:</div>

          <input
            type="date"
            className={
              "no-print w-[150px] border border-slate-300 rounded-md px-2 py-1 outline-none bg-white text-slate-900" +
              (readOnly ? " opacity-80 cursor-not-allowed" : "")
            }
            value={reportDate}
            onChange={readOnly ? undefined : (e) => onChangeDate?.(e.target.value)}
            disabled={readOnly}
            readOnly={readOnly}
          />

          <div className="print-only min-w-[150px] border border-slate-300 rounded-md px-2 py-1 text-right">
            {datePrint}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr_1fr] gap-6 text-[12px]">
        <div className="flex items-end gap-2">
          <div className="font-semibold whitespace-nowrap">Commessa:</div>

          <input
            className={
              "no-print w-[180px] border-b border-slate-400 outline-none bg-transparent text-slate-900" +
              (readOnly ? " opacity-80 cursor-not-allowed" : "")
            }
            value={commessa}
            onChange={readOnly ? undefined : (e) => onChangeCommessa?.(e.target.value)}
            disabled={readOnly}
            readOnly={readOnly}
          />

          <div className="print-only min-w-[180px] border-b border-slate-400">
            {commessa}
          </div>
        </div>

        <div />
        <div />
      </div>
    </div>
  );
}
