import React, { useEffect, useMemo } from 'react'

/**
 * RapportinoSheet v4c
 * - Operatore = textarea multi-lignes (1 opérateur par ligne)
 * - Tempo = textarea multi-lignes (1 temps par ligne)
 * - Alignement automatique des lignes entre les deux colonnes
 * - Colonnes s'agrandissent en hauteur quand on va à la ligne
 * - Backward compatible: r.operatori et r.tempo restent des strings
 */

function splitLines(str) {
  return (str ?? '').toString().split('\n')
}

function joinLines(lines) {
  return lines.join('\n')
}

function normalizePair(opStr, timeStr) {
  const ops = splitLines(opStr)
  const times = splitLines(timeStr)

  const maxLen = Math.max(ops.length, times.length, 1)

  const opsNorm = Array.from({ length: maxLen }, (_, i) => ops[i] ?? '')
  const timesNorm = Array.from({ length: maxLen }, (_, i) => times[i] ?? '')

  return {
    operatori: joinLines(opsNorm),
    tempo: joinLines(timesNorm),
  }
}

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export default function RapportinoSheet({
  data,
  rapportino,
  role,
  readOnly = false,
  onChange,
}) {
  const righe = rapportino?.righe || []

  const totaleProdotto = useMemo(() => {
    return righe.reduce((s, r) => s + (Number(r.prodotto) || 0), 0)
  }, [righe])

  const updateRiga = (id, patch) => {
    const newRighe = righe.map(r => (r.id === id ? { ...r, ...patch } : r))
    onChange({ ...rapportino, righe: newRighe })
  }

  const addRiga = () => {
    const nextId =
      righe.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
    const newRighe = [
      ...righe,
      {
        id: nextId,
        categoria: '',
        descrizione: '',
        operatori: '',
        tempo: '',
        previsto: '',
        prodotto: '',
        note: '',
      },
    ]
    onChange({ ...rapportino, righe: newRighe })
  }

  const removeRiga = id => {
    const newRighe = righe.filter(r => r.id !== id)
    onChange({ ...rapportino, righe: newRighe })
  }

  useEffect(() => {
    const els = document.querySelectorAll('[data-autosize="1"]')
    els.forEach(el => autoResize(el))
  }, [righe, readOnly])

  return (
    <div className="w-full">
      {/* Header infos */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-slate-600">Cost.</span>
          <input
            className="border border-slate-300 rounded px-2 py-1 min-w-[90px]"
            value={rapportino.cost || ''}
            onChange={e => onChange({ ...rapportino, cost: e.target.value })}
            disabled={readOnly}
          />
        </label>

        <label className="flex items-center gap-1">
          <span className="text-slate-600">Commessa</span>
          <input
            className="border border-slate-300 rounded px-2 py-1 min-w-[90px]"
            value={rapportino.commessa || ''}
            onChange={e => onChange({ ...rapportino, commessa: e.target.value })}
            disabled={readOnly}
          />
        </label>

        <label className="flex items-center gap-1 flex-1 min-w-[220px]">
          <span className="text-slate-600">Capo squadra</span>
          <input
            className="border border-slate-300 rounded px-2 py-1 flex-1"
            value={rapportino.capoSquadra || ''}
            onChange={e =>
              onChange({ ...rapportino, capoSquadra: e.target.value.toUpperCase() })
            }
            disabled={readOnly}
          />
        </label>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-slate-600">Data</span>
          <span className="font-semibold">{data}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
            {role}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-[12px] table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-[110px] px-2 py-2 text-left">Categoria</th>
              <th className="w-[240px] px-2 py-2 text-left">Descrizione attività</th>
              <th className="px-2 py-2 text-left">Operatore</th>
              <th className="w-[110px] px-2 py-2 text-center">Tempo</th>
              <th className="w-[90px] px-2 py-2 text-center">Previsto</th>
              <th className="w-[90px] px-2 py-2 text-center">Prodotto</th>
              <th className="w-[210px] px-2 py-2 text-left">Note</th>
              {!readOnly && <th className="w-[40px] px-2 py-2 text-center">–</th>}
            </tr>
          </thead>

          <tbody>
            {righe.map(r => {
              const norm = normalizePair(r.operatori, r.tempo)

              return (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  {/* Categoria */}
                  <td className="px-2 py-1">
                    {readOnly ? (
                      <div className="py-1">{r.categoria}</div>
                    ) : (
                      <input
                        className="w-full border border-slate-200 rounded px-2 py-1"
                        value={r.categoria || ''}
                        onChange={e =>
                          updateRiga(r.id, { categoria: e.target.value.toUpperCase() })
                        }
                      />
                    )}
                  </td>

                  {/* Descrizione */}
                  <td className="px-2 py-1">
                    {readOnly ? (
                      <div className="py-1 whitespace-pre-wrap">{r.descrizione}</div>
                    ) : (
                      <textarea
                        rows={1}
                        data-autosize="1"
                        className="w-full border border-slate-200 rounded px-2 py-1 resize-none leading-5"
                        value={r.descrizione || ''}
                        onChange={e => updateRiga(r.id, { descrizione: e.target.value })}
                        onInput={e => autoResize(e.currentTarget)}
                      />
                    )}
                  </td>

                  {/* Operatore multiline */}
                  <td className="px-2 py-1">
                    {readOnly ? (
                      <div className="py-1 whitespace-pre-wrap">{norm.operatori}</div>
                    ) : (
                      <textarea
                        rows={1}
                        data-autosize="1"
                        className="w-full border border-slate-200 rounded px-2 py-1 resize-none leading-5"
                        placeholder="1 operatore per riga"
                        value={norm.operatori}
                        onChange={e => {
                          const nextOps = e.target.value.toUpperCase()
                          const synced = normalizePair(nextOps, norm.tempo)
                          updateRiga(r.id, synced)
                        }}
                        onInput={e => autoResize(e.currentTarget)}
                      />
                    )}
                  </td>

                  {/* Tempo multiline aligné */}
                  <td className="px-2 py-1">
                    {readOnly ? (
                      <div className="py-1 whitespace-pre-wrap text-center">{norm.tempo}</div>
                    ) : (
                      <textarea
                        rows={1}
                        data-autosize="1"
                        className="w-full border border-slate-200 rounded px-2 py-1 resize-none leading-5 text-center"
                        placeholder="1 tempo per riga"
                        value={norm.tempo}
                        onChange={e => {
                          const nextTempo = e.target.value
                          const synced = normalizePair(norm.operatori, nextTempo)
                          updateRiga(r.id, synced)
                        }}
                        onInput={e => autoResize(e.currentTarget)}
                      />
                    )}
                  </td>

                  {/* Previsto */}
                  <td className="px-2 py-1 text-center">
                    {readOnly ? (
                      <div className="py-1">{r.previsto}</div>
                    ) : (
                      <input
                        className="w-full border border-slate-200 rounded px-2 py-1 text-center"
                        value={r.previsto || ''}
                        onChange={e => updateRiga(r.id, { previsto: e.target.value })}
                      />
                    )}
                  </td>

                  {/* Prodotto */}
                  <td className="px-2 py-1 text-center">
                    {readOnly ? (
                      <div className="py-1">{r.prodotto}</div>
                    ) : (
                      <input
                        type="number"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-center"
                        value={r.prodotto || ''}
                        onChange={e => updateRiga(r.id, { prodotto: e.target.value })}
                      />
                    )}
                  </td>

                  {/* Note */}
                  <td className="px-2 py-1">
                    {readOnly ? (
                      <div className="py-1 whitespace-pre-wrap">{r.note}</div>
                    ) : (
                      <textarea
                        rows={1}
                        data-autosize="1"
                        className="w-full border border-slate-200 rounded px-2 py-1 resize-none leading-5"
                        value={r.note || ''}
                        onChange={e => updateRiga(r.id, { note: e.target.value })}
                        onInput={e => autoResize(e.currentTarget)}
                      />
                    )}
                  </td>

                  {!readOnly && (
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => removeRiga(r.id)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Rimuovi riga"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between mt-2">
          <button
            className="text-xs px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"
            onClick={addRiga}
          >
            + Aggiungi riga
          </button>

          <div className="text-[11px] text-slate-600">
            Totale prodotto (da lista cavi):{' '}
            <span className="font-semibold">
              {Number(rapportino.totaleProdotto || totaleProdotto).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
