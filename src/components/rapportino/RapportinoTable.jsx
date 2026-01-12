// src/components/rapportino/RapportinoTable.jsx
import React, { useMemo } from "react";

function splitLines(v) {
  return String(v || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasAnyText(v) {
  return String(v || "").trim().length > 0;
}

export default function RapportinoTable({
  rows,
  onChangeCell,
  onAddRow,
  onRemoveRow,
  onOpenOperatorPicker,
  onRemoveOperatorFromRow,
  onOpenTempoPicker,
  onChangeTempoLegacy,
}) {
  const canonicalByIdx = useMemo(() => {
    return rows.map((r) => {
      // Canonical mode must be enabled even when the list is empty,
      // otherwise the user cannot pick the FIRST operator.
      return Array.isArray(r?.operator_items);
    });
  }, [rows]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
      <table className="w-full min-w-[1120px]">
        <thead className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur border-b border-slate-800">
          <tr className="text-left text-[11px] tracking-wide uppercase text-slate-500">
            <th className="px-3 py-3 w-[140px]">Categoria</th>
            <th className="px-3 py-3 w-[340px]">Descrizione attivitá</th>
            <th className="px-3 py-3 w-[300px]">
              Operatore
              <div className="text-[10px] normal-case tracking-normal text-slate-600">
                (tap per scegliere / drag&drop)
              </div>
            </th>
            <th className="px-3 py-3 w-[120px]">Tempo (ore)</th>
            <th className="px-3 py-3 w-[120px]">Previsto</th>
            <th className="px-3 py-3 w-[120px]">Prodotto (mt)</th>
            <th className="px-3 py-3 w-[220px]">Note</th>
            <th className="px-3 py-3 w-[60px] text-right"> </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => {
            const isCanonical = !!canonicalByIdx[idx];

            const canonItems = isCanonical
              ? Array.isArray(r?.operator_items)
                ? r.operator_items
                : []
              : [];

            const hasOperators = isCanonical
              ? canonItems.length > 0
              : hasAnyText(r.operatori);

            const tempoDisabled = isCanonical ? canonItems.length === 0 : false;

            const legacyOperatorLines = !isCanonical ? splitLines(r.operatori) : [];
            const legacyTempoLines = !isCanonical ? splitLines(r.tempo) : [];

            return (
              <tr key={r.id || idx} className="border-b border-slate-900/70">
                {/* Categoria */}
                <td className="px-3 py-3 align-top">
                  <input
                    value={r.categoria || ""}
                    onChange={(e) => onChangeCell(idx, "categoria", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                  />
                </td>

                {/* Descrizione */}
                <td className="px-3 py-3 align-top">
                  <textarea
                    value={r.descrizione_attivita || ""}
                    onChange={(e) => onChangeCell(idx, "descrizione_attivita", e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                  />
                </td>

                {/* Operatore */}
                <td className="px-3 py-3 align-top">
                  <div className="space-y-2">
                    {isCanonical ? (
                      <>
                        {canonItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {canonItems.map((it) => (
                              <span
                                key={it.operator_id}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[12px] text-slate-200"
                              >
                                <span className="font-semibold">{it.label}</span>
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-rose-300"
                                  title="Rimuovi"
                                  onClick={() => onRemoveOperatorFromRow(idx, it.operator_id)}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[12px] text-slate-500">
                            Tocca per scegliere…
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenOperatorPicker(idx)}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/40"
                        >
                          Seleziona operatori
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Legacy input */}
                        <textarea
                          value={r.operatori || ""}
                          onChange={(e) => onChangeCell(idx, "operatori", e.target.value)}
                          rows={2}
                          placeholder="Nomi operatori (uno per riga)"
                          className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                        />

                        {legacyOperatorLines.length > 0 && (
                          <div className="text-[11px] text-slate-500">
                            Righe: {legacyOperatorLines.length} — Tempo: {legacyTempoLines.length}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>

                {/* Tempo */}
                <td className="px-3 py-3 align-top">
                  {isCanonical ? (
                    <button
                      type="button"
                      onClick={() => onOpenTempoPicker(idx)}
                      disabled={tempoDisabled}
                      className={[
                        "w-full rounded-xl border px-3 py-2 text-[12px] text-left",
                        tempoDisabled
                          ? "border-slate-900 bg-slate-950/40 text-slate-600 cursor-not-allowed"
                          : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40",
                      ].join(" ")}
                      title={tempoDisabled ? "Seleziona prima almeno un operatore" : "Imposta tempi per operatore"}
                    >
                      {hasOperators ? "Imposta…" : "—"}
                    </button>
                  ) : (
                    <input
                      value={r.tempo || ""}
                      onChange={(e) => onChangeTempoLegacy(idx, e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                      placeholder="Tempo (uno per riga)"
                    />
                  )}
                </td>

                {/* Previsto */}
                <td className="px-3 py-3 align-top">
                  <input
                    value={r.previsto || ""}
                    onChange={(e) => onChangeCell(idx, "previsto", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                  />
                </td>

                {/* Prodotto */}
                <td className="px-3 py-3 align-top">
                  <input
                    value={r.prodotto || ""}
                    onChange={(e) => onChangeCell(idx, "prodotto", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                  />
                </td>

                {/* Note */}
                <td className="px-3 py-3 align-top">
                  <textarea
                    value={r.note || ""}
                    onChange={(e) => onChangeCell(idx, "note", e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                  />
                </td>

                {/* Actions */}
                <td className="px-3 py-3 align-top text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(idx)}
                    className="rounded-xl border border-rose-900/50 bg-[#050910]/60 px-3 py-2 text-[12px] text-rose-200 hover:bg-rose-900/25"
                    title="Rimuovi riga"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}

          <tr>
            <td colSpan={8} className="px-3 py-3">
              <button
                type="button"
                onClick={onAddRow}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-[12px] text-slate-200 hover:bg-slate-900/40"
              >
                + Aggiungi riga
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}