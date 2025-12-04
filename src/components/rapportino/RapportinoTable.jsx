// src/components/rapportino/RapportinoTable.jsx
import React from 'react';

export default function RapportinoTable({
  rows,
  onRowChange,
  onRemoveRow,
}) {
  return (
    <div className="border border-slate-300 rounded-md overflow-hidden">
      <table className="w-full border-collapse text-[12px]">
        <thead className="bg-slate-100 border-b border-slate-300">
          <tr>
            <th className="w-28 border-r border-slate-300 px-2 py-1 text-left">
              CATEGORIA
            </th>
            <th className="w-72 border-r border-slate-300 px-2 py-1 text-left">
              DESCRIZIONE ATTIVITÀ
            </th>
            <th className="w-40 border-r border-slate-300 px-2 py-1 text-left">
              OPERATORE
            </th>
            <th className="w-32 border-r border-slate-300 px-2 py-1 text-left">
              Tempo impiegato
            </th>
            <th className="w-24 border-r border-slate-300 px-2 py-1 text-right">
              PREVISTO
            </th>
            <th className="w-24 border-r border-slate-300 px-2 py-1 text-right">
              PRODOTTO
            </th>
            <th className="border-slate-300 px-2 py-1 text-left">
              NOTE
            </th>
            <th className="border-slate-300 px-2 py-1 text-xs w-6 no-print">
              -
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t border-slate-200 align-top">
              {/* CATEGORIA */}
              <td className="border-r border-slate-200 px-2 py-1">
                <input
                  type="text"
                  value={r.categoria}
                  onChange={(e) =>
                    onRowChange(idx, 'categoria', e.target.value)
                  }
                  className="w-full border-none bg-transparent text-[12px] focus:outline-none"
                />
              </td>

              {/* DESCRIZIONE */}
              <td className="border-r border-slate-200 px-2 py-1">
                <textarea
                  value={r.descrizione}
                  onChange={(e) =>
                    onRowChange(idx, 'descrizione', e.target.value)
                  }
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none"
                  rows={3}
                />
              </td>

              {/* OPERATORE (multi-lignes, autosync) */}
              <td className="border-r border-slate-200 px-2 py-1">
                <textarea
                  data-optempo="1"
                  value={r.operatori}
                  onChange={(e) =>
                    onRowChange(
                      idx,
                      'operatori',
                      e.target.value,
                      e.target,
                    )
                  }
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none rapportino-textarea"
                  rows={3}
                  placeholder="Una riga per operatore"
                />
              </td>

              {/* TEMPO IMPIEGATO (multi-lignes, autosync) */}
              <td className="border-r border-slate-200 px-2 py-1">
                <textarea
                  data-optempo="1"
                  value={r.tempo}
                  onChange={(e) =>
                    onRowChange(
                      idx,
                      'tempo',
                      e.target.value,
                      e.target,
                    )
                  }
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none text-right rapportino-textarea"
                  rows={3}
                  placeholder="Stesse righe degli operatori"
                />
              </td>

              {/* PREVISTO */}
              <td className="border-r border-slate-200 px-2 py-1 text-right">
                <input
                  type="text"
                  value={r.previsto}
                  onChange={(e) =>
                    onRowChange(idx, 'previsto', e.target.value)
                  }
                  className="w-full border-none bg-transparent text-[12px] text-right focus:outline-none"
                />
              </td>

              {/* PRODOTTO → textarea multi-ligne pour groupes (ABCDE / FGH…) */}
              <td className="border-r border-slate-200 px-2 py-1 text-right">
                <textarea
                  value={r.prodotto}
                  onChange={(e) =>
                    onRowChange(idx, 'prodotto', e.target.value)
                  }
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none text-right rapportino-textarea"
                  rows={3}
                  placeholder="Possibile dividere per gruppi"
                />
              </td>

              {/* NOTE */}
              <td className="px-2 py-1 relative">
                <textarea
                  value={r.note}
                  onChange={(e) =>
                    onRowChange(idx, 'note', e.target.value)
                  }
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none rapportino-textarea"
                  rows={3}
                />
                {/* bouton suppression (non imprimé) */}
                <button
                  type="button"
                  onClick={() => onRemoveRow(idx)}
                  className="no-print absolute -right-2 top-1 text-xs text-slate-400 hover:text-rose-600"
                >
                  ×
                </button>
              </td>

              {/* Colonne vide pour alignement (non imprimé) */}
              <td className="px-2 py-1 text-center no-print" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
