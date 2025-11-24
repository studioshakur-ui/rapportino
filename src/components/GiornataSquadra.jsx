import React, { useMemo } from 'react'
import { ROLE_OPTIONS } from '../App'

export default function GiornataSquadra({
  role,
  operatorsRegistry,
  compatibleOperators,
  team,
  onChangeTeam,
}) {
  const roleLabel = ROLE_OPTIONS.find(r => r.key === role)?.label || role

  const compatibleNames = useMemo(
    () => compatibleOperators.map(o => o.name),
    [compatibleOperators]
  )

  const addOperatorToTeam = name => {
    if (team.find(t => t.name === name)) return
    const reg = operatorsRegistry[name]
    const newTeam = [
      ...team,
      {
        name,
        roles: reg?.roles || [roleLabel],
        totalHours: 8.0,
        remainingHours: 8.0,
      },
    ]
    onChangeTeam(newTeam)
  }

  const removeOperatorFromTeam = name => {
    onChangeTeam(team.filter(t => t.name !== name))
  }

  const setAllHours = val => {
    onChangeTeam(team.map(t => ({ ...t, totalHours: val })))
  }

  const updateOne = (name, totalHours) => {
    onChangeTeam(
      team.map(t =>
        t.name === name ? { ...t, totalHours } : t
      )
    )
  }

  const availableToAdd = compatibleNames.filter(n => !team.find(t => t.name === n))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Giornata Squadra – {roleLabel}
        </h2>

        <div className="flex items-center gap-2 text-xs">
          <button
            className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
            onClick={() => setAllHours(8.0)}
          >
            Metti 8h a tutti
          </button>
          <button
            className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
            onClick={() => setAllHours(9.0)}
          >
            Metti 9h a tutti
          </button>
          <button
            className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
            onClick={() => setAllHours(0.0)}
          >
            Metti 0h a tutti
          </button>
        </div>
      </div>

      {/* add operators */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-600">Aggiungi operatore:</span>
        {availableToAdd.length === 0 && (
          <span className="text-slate-400 italic">Nessuno disponibile</span>
        )}
        {availableToAdd.map(n => (
          <button
            key={n}
            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
            onClick={() => addOperatorToTeam(n)}
          >
            + {n}
          </button>
        ))}
      </div>

      {/* team table */}
      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-2 py-2 text-left">Operatore</th>
              <th className="px-2 py-2 text-center">Ore totali</th>
              <th className="px-2 py-2 text-center">Ore rimanenti</th>
              <th className="px-2 py-2 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-slate-500">
                  Nessun operatore assegnato (aggiungi sopra).
                </td>
              </tr>
            ) : (
              team.map(op => (
                <tr key={op.name} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-semibold">{op.name}</td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="w-16 border border-slate-300 rounded px-1 py-0.5 text-center"
                      value={op.totalHours ?? 0}
                      onChange={e => updateOne(op.name, Number(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {op.remainingHours?.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => removeOperatorFromTeam(op.name)}
                      className="text-rose-600 hover:underline"
                    >
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
