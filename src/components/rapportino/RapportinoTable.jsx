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
            {/* colonne un peu plus étroite */}
            <th className="w-64 border-r border-slate-300 px-2 py-1 text-left">
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
            {/* colonne NOTE un peu plus large */}
            <th className="w-40 border-slate-300 px-2 py-1 text-left">
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
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none rapportino-textarea"
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
                />
              </td>

              {/* TEMPO IMPIEGATO (multi-lignes, autosync, texte à gauche) */}
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
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none rapportino-textarea"
                  rows={3}
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

              {/* PRODOTTO → textarea multi-ligne, on pourra mettre 980 + détail par groupe */}
              <td className="border-r border-slate-200 px-2 py-1 text-right">
                <textarea
                  value={r.prodotto}
                  onChange={(e) =>
                    onRowChange(idx, 'prodotto', e.target.value)
                  }
                  className="w-full border-none bg-transparent text-[12px] resize-none focus:outline-none text-right rapportino-textarea"
                  rows={3}
                />
              </td>

              {/* NOTE (plus large) */}
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
