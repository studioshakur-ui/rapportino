// src/components/rapportino/RapportinoHeader.jsx
import React from 'react';

export default function RapportinoHeader({
  costr,
  commessa,
  reportDate,
  capoName,
  onChangeCostr,
  onChangeCommessa,
  onChangeDate,
}) {
  return (
    <div className="mb-3">
      {/* Ligne 1 : titre centré */}
      <div className="text-center text-[16px] font-semibold mb-3 tracking-wide">
        RAPPORTINO GIORNALIERO
      </div>

      {/* Ligne 2 : COSTR */}
      <div className="mb-1">
        <span className="font-semibold mr-2">COSTR.:</span>
        <input
          type="text"
          value={costr}
          onChange={(e) => onChangeCostr(e.target.value)}
          className="inline-block w-28 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
        />
      </div>

      {/* Ligne 3 : Commessa / Capo Squadra / DATA */}
      <div className="grid grid-cols-[1fr_0.9fr_1fr] items-center gap-2">
        <div>
          <span className="font-semibold mr-2">Commessa:</span>
          <input
            type="text"
            value={commessa}
            onChange={(e) => onChangeCommessa(e.target.value)}
            className="inline-block w-24 border-b border-slate-400 focus:outline-none focus:border-slate-800 px-1"
          />
        </div>

        <div className="pl-4">
          <span className="font-semibold mr-2">Capo Squadra:</span>
          <span className="px-1">{capoName}</span>
        </div>

        <div className="text-right">
          <span className="font-semibold mr-2">DATA:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
