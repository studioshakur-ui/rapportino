// /src/components/core-drive/CoreDriveFilters.jsx
import React from "react";

export default function CoreDriveFilters({ filters, onChange, facets, compact = false }) {
  const f = filters || {};
  const set = (key, value) => onChange({ ...f, [key]: value });

  const selectClass =
    "h-9 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-slate-500/40";
  const inputClass =
    "h-9 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-slate-500/40";
  const pill =
    "h-9 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 hover:border-slate-600";

  const reset = () => {
    onChange({
      cantiere: f.cantiere || "",
      categoria: "",
      commessa: "",
      origine: "",
      stato_doc: "",
      mimeGroup: "",
      text: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const cantieri = facets?.cantieri || [];
  const categorie = facets?.categorie || [];
  const commesse = facets?.commesse || [];
  const origini = facets?.origini || [];
  const stati = facets?.stati || [];

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-50">CORE Drive</div>
            {!compact && (
              <div className="mt-0.5 text-xs text-slate-500">
                Archivio documenti — filtri rapidi, preview immediata.
              </div>
            )}
          </div>

          <button type="button" onClick={reset} className={pill}>
            Reset
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          <select
            className={selectClass}
            value={f.cantiere || ""}
            onChange={(e) => set("cantiere", e.target.value)}
            title="Cantiere"
          >
            <option value="">Cantiere</option>
            {cantieri.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={f.categoria || ""}
            onChange={(e) => set("categoria", e.target.value)}
            title="Categoria"
          >
            <option value="">Categoria</option>
            {categorie.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={f.commessa || ""}
            onChange={(e) => set("commessa", e.target.value)}
            title="Commessa"
          >
            <option value="">Commessa</option>
            {commesse.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={f.origine || ""}
            onChange={(e) => set("origine", e.target.value)}
            title="Origine"
          >
            <option value="">Origine</option>
            {origini.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={f.stato_doc || ""}
            onChange={(e) => set("stato_doc", e.target.value)}
            title="Stato"
          >
            <option value="">Stato</option>
            {stati.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={f.mimeGroup || ""}
            onChange={(e) => set("mimeGroup", e.target.value)}
            title="Tipo"
          >
            <option value="">Tipo</option>
            <option value="PDF">PDF</option>
            <option value="IMG">Immagini</option>
            <option value="XLSX">Excel</option>
          </select>

          <input
            className={inputClass + " min-w-[220px]"}
            value={f.text || ""}
            onChange={(e) => set("text", e.target.value)}
            placeholder="Ricerca…"
          />

          <input
            type="date"
            className={inputClass}
            value={f.dateFrom || ""}
            onChange={(e) => set("dateFrom", e.target.value)}
            title="Dal"
          />

          <input
            type="date"
            className={inputClass}
            value={f.dateTo || ""}
            onChange={(e) => set("dateTo", e.target.value)}
            title="Al"
          />
        </div>
      </div>
    </div>
  );
}
