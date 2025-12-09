// src/components/rapportino/RapportinoTable.jsx
import React from "react";

/**
 * Table principale du rapportino.
 *
 * Props :
 *  - rows: array de lignes { categoria, descrizione, operatori, tempo, previsto, prodotto, note }
 *  - onRowChange(index, field, value, targetForHeight?)
 *  - onRemoveRow(index)
 *
 * Objectif UI : effet "feuille A4" très claire, comme le PDF papier.
 */

export default function RapportinoTable({ rows, onRowChange, onRemoveRow }) {
  return (
    <section className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-300 bg-white text-[13px] text-slate-900">
          {/* EN-TÊTE */}
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <Th className="w-[110px]">Categoria</Th>
              <Th className="w-[260px]">Descrizione attività</Th>
              <Th className="w-[190px]">Operatore</Th>
              <Th className="w-[110px]">
                Tempo impiegato
                <span className="block normal-case text-[10px] tracking-normal text-slate-400">
                  (ore)
                </span>
              </Th>
              <Th className="w-[90px] text-right">Previsto</Th>
              <Th className="w-[100px] text-right">Prodotto</Th>
              <Th className="w-[160px]">Note</Th>
              <Th className="w-[40px]" />
            </tr>
          </thead>

          {/* LIGNES */}
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? index} className="align-top">
                {/* CATEGORIA */}
                <Td>
                  <input
                    type="text"
                    value={row.categoria || ""}
                    onChange={(e) =>
                      onRowChange(index, "categoria", e.target.value)
                    }
                    className="w-full border-none bg-transparent px-1 py-1 text-[13px] font-medium text-slate-900 focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* DESCRIZIONE ATTIVITÀ */}
                <Td>
                  <textarea
                    value={row.descrizione || ""}
                    onChange={(e) =>
                      onRowChange(index, "descrizione", e.target.value)
                    }
                    rows={2}
                    className="w-full resize-none border-none bg-transparent px-1 py-1 text-[13px] leading-snug text-slate-900 focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* OPERATORE */}
                <Td>
                  <textarea
                    value={row.operatori || ""}
                    onChange={(e) =>
                      onRowChange(index, "operatori", e.target.value, e.currentTarget)
                    }
                    rows={3}
                    className="w-full resize-none border-none bg-transparent px-1 py-1 text-[13px] leading-snug text-slate-900 focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* TEMPO IMPIEGATO */}
                <Td>
                  <textarea
                    value={row.tempo || ""}
                    onChange={(e) =>
                      onRowChange(index, "tempo", e.target.value, e.currentTarget)
                    }
                    rows={3}
                    className="w-full resize-none border-none bg-transparent px-1 py-1 text-[13px] leading-snug text-slate-900 text-right tabular-nums focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* PREVISTO */}
                <Td className="text-right">
                  <input
                    type="number"
                    step="0.1"
                    value={row.previsto ?? ""}
                    onChange={(e) =>
                      onRowChange(index, "previsto", e.target.value)
                    }
                    className="w-full border-none bg-transparent px-1 py-1 text-right text-[13px] tabular-nums text-slate-900 focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* PRODOTTO */}
                <Td className="text-right">
                  <input
                    type="number"
                    step="0.1"
                    value={row.prodotto ?? ""}
                    onChange={(e) =>
                      onRowChange(index, "prodotto", e.target.value)
                    }
                    className="w-full border-none bg-transparent px-1 py-1 text-right text-[13px] tabular-nums text-slate-900 focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* NOTE */}
                <Td>
                  <textarea
                    value={row.note || ""}
                    onChange={(e) =>
                      onRowChange(index, "note", e.target.value)
                    }
                    rows={2}
                    className="w-full resize-none border-none bg-transparent px-1 py-1 text-[13px] leading-snug text-slate-900 focus:outline-none focus:ring-0"
                  />
                </Td>

                {/* ACTION SUPPRESSION */}
                <Td className="text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    title="Rimuovi riga"
                  >
                    ✕
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Th({ children, className = "" }) {
  return (
    <th
      className={
        "border border-slate-300 px-3 py-2 text-left font-semibold " + className
      }
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={"border border-slate-300 px-3 py-2 align-top " + className}>
      {children}
    </td>
  );
}
