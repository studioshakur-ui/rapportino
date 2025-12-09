// src/components/rapportino/RapportinoTable.jsx
import React from 'react';

export default function RapportinoTable({ rows, onRowChange, onRemoveRow }) {
  return (
    <div className="mt-4 border border-slate-300 rounded-xl overflow-hidden">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-50 text-slate-700">
            <Th className="w-[110px]">CATEGORIA</Th>
            <Th className="w-[210px]">DESCRIZIONE ATTIVITÀ</Th>
            <Th className="w-[170px]">OPERATORE</Th>
            <Th className="w-[110px] text-center">
              Tempo impiegato
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
                (ORE)
              </div>
            </Th>
            <Th className="w-[80px] text-right">PREVISTO</Th>
            <Th className="w-[90px] text-right">
              PRODOTTO
              <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
                (MT)
              </div>
            </Th>
            <Th className="w-[140px]">NOTE</Th>
            <Th className="w-[32px]" />
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id ?? index}
              data-rapportino-row
              className="border-t border-slate-200 align-top"
            >
              {/* CATEGORIA */}
              <Td className="align-top">
                <input
                  type="text"
                  value={row.categoria || ''}
                  onChange={(e) =>
                    onRowChange(index, 'categoria', e.target.value)
                  }
                  className="w-full border-none bg-transparent px-2 py-2 text-[11px] text-slate-900 focus:outline-none focus:ring-0"
                />
              </Td>

              {/* DESCRIZIONE ATTIVITÀ */}
              <Td className="align-top">
                <textarea
                  value={row.descrizione || ''}
                  onChange={(e) =>
                    onRowChange(index, 'descrizione', e.target.value)
                  }
                  rows={1}
                  className="w-full resize-none border-none bg-transparent px-2 py-2 text-[11px] text-slate-900 leading-snug focus:outline-none focus:ring-0"
                  style={{ minHeight: 32 }}
                />
              </Td>

              {/* OPERATORE */}
              <Td className="align-top">
                <textarea
                  data-field="operatori"
                  value={row.operatori || ''}
                  onChange={(e) =>
                    onRowChange(index, 'operatori', e.target.value, e.target)
                  }
                  rows={1}
                  className="w-full resize-none border-none bg-transparent px-2 py-2 text-[11px] text-slate-900 leading-snug focus:outline-none focus:ring-0"
                  style={{ minHeight: 32 }}
                />
              </Td>

              {/* TEMPO IMPIEGATO */}
              <Td className="align-top">
                <textarea
                  data-field="tempo"
                  value={row.tempo || ''}
                  onChange={(e) =>
                    onRowChange(index, 'tempo', e.target.value, e.target)
                  }
                  rows={1}
                  className="w-full resize-none border-none bg-transparent px-2 py-2 text-[11px] text-center text-slate-900 leading-snug focus:outline-none focus:ring-0"
                  style={{ minHeight: 32 }}
                />
              </Td>

              {/* PREVISTO (nombre simple, pas besoin multi-ligne) */}
              <Td className="align-top text-right">
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.previsto || ''}
                  onChange={(e) =>
                    onRowChange(index, 'previsto', e.target.value)
                  }
                  className="w-full border-none bg-transparent px-2 py-2 text-[11px] text-right text-slate-900 focus:outline-none focus:ring-0"
                />
              </Td>

              {/* PRODOTTO : maintenant textarea multi-ligne synchronisé */}
              <Td className="align-top text-right">
                <textarea
                  data-field="prodotto"
                  value={row.prodotto || ''}
                  onChange={(e) =>
                    onRowChange(index, 'prodotto', e.target.value, e.target)
                  }
                  rows={1}
                  className="w-full resize-none border-none bg-transparent px-2 py-2 text-[11px] text-right text-slate-900 leading-snug focus:outline-none focus:ring-0"
                  style={{ minHeight: 32 }}
                />
              </Td>

              {/* NOTE */}
              <Td className="align-top">
                <textarea
                  value={row.note || ''}
                  onChange={(e) => onRowChange(index, 'note', e.target.value)}
                  rows={1}
                  className="w-full resize-none border-none bg-transparent px-2 py-2 text-[11px] text-slate-900 leading-snug focus:outline-none focus:ring-0"
                  style={{ minHeight: 32 }}
                />
              </Td>

              {/* SUPPRIMER LA LIGNE */}
              <Td className="align-top text-center">
                <button
                  type="button"
                  onClick={() => onRemoveRow(index)}
                  className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-[11px] text-slate-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600"
                >
                  ✕
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '' }) {
  return (
    <th
      className={`border-b border-slate-200 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return (
    <td className={`border-t border-slate-200 align-top ${className}`}>
      {children}
    </td>
  );
}
