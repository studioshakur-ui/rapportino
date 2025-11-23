import React from 'react'

export default function RapportinoSheet({
  data,
  rapportino,
  role,
  readOnly,
  onChange,
}) {
  const { cost = '', commessa = '', capoSquadra = '', righe = [] } =
    rapportino || {}

  const handleHeaderChange = (field, value) => {
    if (readOnly) return
    const nuovo = {
      ...rapportino,
      [field]: value,
    }
    onChange(nuovo)
  }

  const handleRowChange = (id, field, value) => {
    if (readOnly) return
    const nuoveRighe = (righe || []).map(r =>
      r.id === id ? { ...r, [field]: value } : r
    )
    const nuovo = {
      ...rapportino,
      righe: nuoveRighe,
    }
    onChange(nuovo)
  }

  const handleAddRow = () => {
    if (readOnly) return
    const nextId =
      (righe || []).reduce(
        (max, r) => (Number(r.id) > max ? Number(r.id) : max),
        0
      ) + 1

    const last = righe[righe.length - 1] || {}
    const newRow = {
      id: nextId,
      categoria: last.categoria || '',
      descrizione: '',
      operatori: '',
      tempo: '',
      previsto: last.previsto || '',
      prodotto: '',
      note: '',
    }

    const nuovo = {
      ...rapportino,
      righe: [...(righe || []), newRow],
    }
    onChange(nuovo)
  }

  const handleRemoveRow = id => {
    if (readOnly) return
    if ((righe || []).length <= 1) return
    const nuoveRighe = righe.filter(r => r.id !== id)
    const nuovo = {
      ...rapportino,
      righe: nuoveRighe,
    }
    onChange(nuovo)
  }

  const ruoloLabel = (() => {
    switch (role) {
      case 'CARPENTERIA':
        return {
          label: 'Carpenteria',
          className:
            'bg-amber-50 border-amber-200 text-amber-700',
        }
      case 'MONTAGGIO':
        return {
          label: 'Montaggio',
          className:
            'bg-violet-50 border-violet-200 text-violet-700',
        }
      case 'ELETTRICISTA':
      default:
        return {
          label: 'Elettricista',
          className:
            'bg-sky-50 border-sky-200 text-sky-700',
        }
    }
  })()

  return (
    <div className="space-y-3">
      {/* En-tête rapportino */}
      <div className="border border-slate-300 rounded-lg p-3 text-xs mb-2 print:border-slate-600">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {/* Cost */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">Cost.</span>
            <input
              type="text"
              className="border border-slate-300 rounded px-1 py-0.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={cost}
              onChange={e =>
                handleHeaderChange('cost', e.target.value.toUpperCase())
              }
              readOnly={readOnly}
            />
          </div>

          {/* Commessa */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">Commessa</span>
            <input
              type="text"
              className="border border-slate-300 rounded px-1 py-0.5 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={commessa}
              onChange={e =>
                handleHeaderChange('commessa', e.target.value.toUpperCase())
              }
              readOnly={readOnly}
            />
          </div>

          {/* Capo squadra */}
          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
            <span className="font-semibold text-slate-700">
              Capo squadra
            </span>
            <input
              type="text"
              className="border border-slate-300 rounded px-1 py-0.5 flex-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={capoSquadra}
              onChange={e =>
                handleHeaderChange('capoSquadra', e.target.value.toUpperCase())
              }
              readOnly={readOnly}
            />
          </div>

          {/* Data */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">Data</span>
            <input
              type="text"
              className="border border-slate-300 rounded px-1 py-0.5 w-28 text-xs bg-slate-50"
              value={data || ''}
              readOnly
            />
          </div>

          {/* Ruolo chip */}
          <div className="ml-auto flex items-center gap-1">
            <span
              className={
                'px-2 py-0.5 rounded-full border text-[10px] font-medium ' +
                ruoloLabel.className
              }
            >
              {ruoloLabel.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tableau des activités */}
      <div className="border border-slate-600 rounded-md overflow-hidden">
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="border border-slate-600 px-1 py-1 text-left"
                style={{ width: '10%' }}
              >
                Categoria
              </th>
              <th
                className="border border-slate-600 px-1 py-1 text-left"
                style={{ width: '25%' }}
              >
                Descrizione attività
              </th>
              <th
                className="border border-slate-600 px-1 py-1 text-left"
                style={{ width: '18%' }}
              >
                Operatore
              </th>
              <th
                className="border border-slate-600 px-1 py-1 text-center"
                style={{ width: '8%' }}
              >
                Tempo
              </th>
              <th
                className="border border-slate-600 px-1 py-1 text-center"
                style={{ width: '8%' }}
              >
                Previsto
              </th>
              <th
                className="border border-slate-600 px-1 py-1 text-center"
                style={{ width: '12%' }}
              >
                Prodotto
              </th>
              <th
                className="border border-slate-600 px-1 py-1 text-left"
                style={{ width: '19%' }}
              >
                Note
              </th>
              {!readOnly && (
                <th className="border border-slate-600 px-1 py-1 text-center no-print text-[10px] w-6">
                  -
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {righe && righe.length > 0 ? (
              righe.map(riga => (
                <tr key={riga.id}>
                  {/* Categoria */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={riga.categoria || ''}
                      onChange={e =>
                        handleRowChange(
                          riga.id,
                          'categoria',
                          e.target.value.toUpperCase()
                        )
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {/* Descrizione */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top">
                    <textarea
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] min-h-[32px] resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={riga.descrizione || ''}
                      onChange={e =>
                        handleRowChange(riga.id, 'descrizione', e.target.value)
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {/* Operatore */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top">
                    <textarea
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] min-h-[32px] resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="ROSSI 4h&#10;BIANCHI 3h"
                      value={riga.operatori || ''}
                      onChange={e =>
                        handleRowChange(riga.id, 'operatori', e.target.value)
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {/* Tempo */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top text-center">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={riga.tempo || ''}
                      onChange={e =>
                        handleRowChange(riga.id, 'tempo', e.target.value)
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {/* Previsto */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top text-center">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={riga.previsto || ''}
                      onChange={e =>
                        handleRowChange(riga.id, 'previsto', e.target.value)
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {/* Prodotto */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top text-center">
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={riga.prodotto || ''}
                      onChange={e =>
                        handleRowChange(riga.id, 'prodotto', e.target.value)
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {/* Note */}
                  <td className="border border-slate-600 px-1 py-0.5 align-top">
                    <textarea
                      className="w-full border border-slate-300 rounded px-1 py-0.5 text-[11px] min-h-[32px] resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={riga.note || ''}
                      onChange={e =>
                        handleRowChange(riga.id, 'note', e.target.value)
                      }
                      readOnly={readOnly}
                    />
                  </td>

                  {!readOnly && (
                    <td className="border border-slate-600 px-1 py-0.5 align-top text-center no-print">
                      <button
                        type="button"
                        className="text-[10px] text-slate-500 hover:text-red-600"
                        onClick={() => handleRemoveRow(riga.id)}
                        title="Rimuovi riga"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={readOnly ? 7 : 8}
                  className="border border-slate-600 px-2 py-2 text-center text-[11px] text-slate-500"
                >
                  Nessuna riga presente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bas de page */}
      <div className="flex items-center justify-between text-[11px] mt-1">
        {!readOnly && (
          <button
            type="button"
            className="no-print inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
            onClick={handleAddRow}
          >
            <span>+ Aggiungi riga</span>
          </button>
        )}

        <div className="ml-auto text-right text-slate-600">
          Totale prodotto (da lista cavi):{' '}
          <span className="font-semibold">
            {Number(rapportino.totaleProdotto || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
