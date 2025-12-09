// src/components/rapportino/RapportinoTable.jsx
import React from 'react';

function Th({ children, className = '' }) {
  return (
    <th
      className={
        'px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 border-b border-slate-200 text-left ' +
        className
      }
    >
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return (
    <td
      className={
        'px-3 py-2 text-[11px] align-top border-t border-slate-200 ' +
        className
      }
    >
      {children}
    </td>
  );
}

export default function RapportinoTable({
  rows,
  onRowChange,
  onRemoveRow,
}) {
  return (
    <div className="mt-4">
      {/* Table "A4" plus large, scrollable si écran étroit */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border border-slate-200 border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <Th className="w-[130px]">Categoria</Th>
              <Th className="w-[260px]">Descrizione attività</Th>
              <Th className="w-[190px]">Operatore</Th>
              <Th className="w-[110px] text-center">
                Tempo impiegato
                <div className="text-[9px] font-normal tracking-normal">
                  (ore)
                </div>
              </Th>
              <Th className="w-[90px] text-center">Previsto</Th>
              <Th className="w-[110px] text-center">
                Prodotto
                <div className="text-[9px] font-normal tracking-normal">
                  (mt)
                </div>
              </Th>
              <Th className="w-[160px]">Note</Th>
              <Th className="w-[40px] text-center">✕</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {/* CATEGORIA */}
                <Td className="whitespace-pre-line">
                  <input
                    type="text"
                    value={row.categoria || ''}
                    onChange={(e) =>
                      onRowChange(index, 'categoria', e.target.value)
                    }
                    className="w-full bg-transparent border-none text-[11px] font-semibold text-slate-800 focus:outline-none"
                  />
                </Td>

                {/* DESCRIZIONE ATTIVITÀ */}
                <Td>
                  <textarea
                    value={row.descrizione || ''}
                    onChange={(e) =>
                      onRowChange(index, 'descrizione', e.target.value)
                    }
                    rows={3}
                    className="w-full bg-transparent border-none text-[11px] text-slate-800 resize-none leading-snug focus:outline-none"
                  />
                </Td>

                {/* OPERATORE */}
                <Td>
                  <textarea
                    value={row.operatori || ''}
                    onChange={(e) =>
                      onRowChange(
                        index,
                        'operatori',
                        e.target.value,
                        e.target
                      )
                    }
                    rows={3}
                    className="w-full bg-transparent border-none text-[11px] text-slate-800 resize-none leading-snug focus:outline-none"
                  />
                </Td>

                {/* TEMPO IMPIEGATO */}
                <Td className="text-center">
                  <textarea
                    value={row.tempo || ''}
                    onChange={(e) =>
                      onRowChange(
                        index,
                        'tempo',
                        e.target.value,
                        e.target
                      )
                    }
                    rows={3}
                    className="w-full bg-transparent border-none text-[11px] text-slate-800 resize-none leading-snug text-center focus:outline-none"
                  />
                </Td>

                {/* PREVISTO */}
                <Td className="text-center">
                  <input
                    type="number"
                    step="0.1"
                    value={row.previsto || ''}
                    onChange={(e) =>
                      onRowChange(index, 'previsto', e.target.value)
                    }
                    className="w-full bg-transparent border-none text-[11px] text-slate-800 text-center focus:outline-none"
                  />
                </Td>

                {/* PRODOTTO */}
                <Td className="text-center">
                  <input
                    type="number"
                    step="0.1"
                    value={row.prodotto || ''}
                    onChange={(e) =>
                      onRowChange(index, 'prodotto', e.target.value)
                    }
                    className="w-full bg-transparent border-none text-[11px] text-slate-800 text-center focus:outline-none"
                  />
                </Td>

                {/* NOTE */}
                <Td>
                  <textarea
                    value={row.note || ''}
                    onChange={(e) =>
                      onRowChange(index, 'note', e.target.value)
                    }
                    rows={3}
                    className="w-full bg-transparent border-none text-[11px] text-slate-800 resize-none leading-snug focus:outline-none"
                  />
                </Td>

                {/* SUPPRIMER LIGNE */}
                <Td className="text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(index)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-400 text-[11px] text-slate-600 hover:bg-slate-100"
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
    </div>
  );
}
