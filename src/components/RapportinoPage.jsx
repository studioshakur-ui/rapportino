import React, { useMemo, useState } from 'react'
import { ROLE_OPTIONS, STATUS_LABELS } from '../App'
import RapportinoSheet from './RapportinoSheet'
import GiornataSquadra from './GiornataSquadra'
import CablePanel from './CablePanel'

function keyPattern(commessa, role, capo, descrizione, opsKey) {
  return `${(commessa||'').toUpperCase()}__${role}__${capo}__${descrizione.trim().toUpperCase()}__${opsKey}`
}

export default function RapportinoPage({
  data,
  setData,
  capo,
  role,
  rapportino,
  onChangeRapportino,
  operators,
  setOperators,
  patterns,
  setPatterns,
  cavi,
  onCaviChange,
  printCavi,
  setPrintCavi,
  isLockedForCapo,
  currentStatus,
  ufficioNote,
  onBackRole,
  onNew,
  onSave,
  onValidate,
  onPrint,
  onOpenArchivio,
  children,
}) {
  const [showCompletedOps, setShowCompletedOps] = useState(false)

  // 1) liste opérateurs compatibles avec rôle
  const compatibleOperators = useMemo(() => {
    const roleLabel = ROLE_OPTIONS.find(r => r.key === role)?.label
    return Object.values(operators).filter(op =>
      (op.roles || []).includes(roleLabel)
    )
  }, [operators, role])

  // 2) recompute allocations by operator across righe
  const allocations = useMemo(() => {
    const map = {}
    for (const r of rapportino.righe) {
      for (const a of (r.assegnazioni || [])) {
        if (!map[a.name]) map[a.name] = 0
        map[a.name] += Number(a.hours || 0)
      }
    }
    return map
  }, [rapportino.righe])

  // 3) build giornataSquadra with remainingHours
  const giornataSquadra = useMemo(() => {
    const base = (rapportino.giornataSquadra || []).map(x => ({ ...x }))
    const byName = new Map(base.map(x => [x.name, x]))

    // assure que tous les compatibles sont visibles si déjà en équipe
    for (const op of compatibleOperators) {
      if (!byName.has(op.name)) continue
      byName.set(op.name, { ...byName.get(op.name) })
    }

    const res = Array.from(byName.values()).map(op => {
      const used = allocations[op.name] || 0
      const total = Number(op.totalHours || 0)
      const remaining = Math.max(0, Math.round((total - used + Number.EPSILON) * 100) / 100)
      return { ...op, remainingHours: remaining }
    })

    return res.sort((a,b) => a.name.localeCompare(b.name))
  }, [rapportino.giornataSquadra, compatibleOperators, allocations])

  const updateGiornata = newTeam => {
    onChangeRapportino({ ...rapportino, giornataSquadra: newTeam })
  }

  // 4) operators pool offered for a row
  const availablePool = (showCompletedOps ? giornataSquadra : giornataSquadra.filter(o => o.remainingHours > 0))

  // 5) suggestions patterns
  const suggestions = useMemo(() => {
    const list = []
    const capoName = capo.trim().toUpperCase()
    const commessa = (rapportino.commessa || '').toUpperCase()

    for (const r of rapportino.righe) {
      const ops = (r.assegnazioni || []).map(a => a.name).sort().join('+')
      if (!r.descrizione || !ops) continue
      const pKey = keyPattern(commessa, role, capoName, r.descrizione, ops)
      const count = patterns[pKey]?.count || 0
      if (count >= 2) {
        list.push({ rowId: r.id, pKey, message: `Modello rilevato: ${ops}` })
      }
    }
    return list
  }, [patterns, rapportino.righe, rapportino.commessa, role, capo])

  const acceptSuggestion = (rowId, pKey) => {
    const pat = patterns[pKey]
    if (!pat) return
    const row = rapportino.righe.find(r => r.id === rowId)
    if (!row) return
    const assegnazioni = (pat.ops || []).map(o => ({ name: o, hours: '' }))
    onChangeRapportino({
      ...rapportino,
      righe: rapportino.righe.map(r =>
        r.id === rowId ? { ...r, assegnazioni, operatori: assegnazioni.map(a=>a.name).join('\n'), tempo: assegnazioni.map(a=>a.hours).join('\n') } : r
      )
    })
  }

  // 6) increment patterns when saving (learning)
  const learnPatternsOnSave = () => {
    const capoName = capo.trim().toUpperCase()
    const commessa = (rapportino.commessa || '').toUpperCase()
    const next = { ...patterns }

    for (const r of rapportino.righe) {
      const ops = (r.assegnazioni || []).map(a => a.name).sort()
      if (!r.descrizione || ops.length === 0) continue
      const opsKey = ops.join('+')
      const pKey = keyPattern(commessa, role, capoName, r.descrizione, opsKey)
      const prev = next[pKey] || { count: 0, ops }
      next[pKey] = { count: prev.count + 1, ops }
    }
    setPatterns(next)
  }

  const handleSaveWrapped = () => {
    learnPatternsOnSave()
    onSave()
  }

  const currentRoleLabel =
    ROLE_OPTIONS.find(r => r.key === role)?.label || role

  const statusBadgeClass =
    currentStatus === 'APPROVED_UFFICIO'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
      : currentStatus === 'VALIDATED_CAPO'
      ? 'bg-sky-50 border-sky-300 text-sky-700'
      : currentStatus === 'RETURNED'
      ? 'bg-amber-50 border-amber-300 text-amber-700'
      : 'bg-slate-50 border-slate-300 text-slate-600'

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* header actions */}
      <header className="border-b bg-white shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBackRole} className="text-xs text-slate-500 hover:text-slate-800">
              ← Indietro
            </button>
            <span className="font-semibold text-lg tracking-tight">
              Rapportino V4
            </span>

            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={data}
              onChange={e => setData(e.target.value)}
            />

            {capo && (
              <span className="text-xs text-slate-500">
                Capo: <span className="font-semibold">{capo}</span>
              </span>
            )}

            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {currentRoleLabel}
            </span>

            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
              {STATUS_LABELS[currentStatus] || currentStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNew}
              className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-100"
              disabled={isLockedForCapo}
            >
              Nuova giornata
            </button>
            <button
              onClick={onOpenArchivio}
              className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-100"
            >
              Archivio
            </button>
            <button
              onClick={handleSaveWrapped}
              className="text-xs px-3 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
              disabled={isLockedForCapo}
            >
              Salva
            </button>
            <button
              onClick={onValidate}
              className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={currentStatus === 'APPROVED_UFFICIO'}
            >
              Valida giornata
            </button>
            <button
              onClick={onPrint}
              className="text-xs px-3 py-1 rounded bg-slate-800 text-white hover:bg-slate-900"
            >
              Stampa
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-3 flex items-center justify-between gap-4 no-print">
          {role === 'ELETTRICISTA' && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={printCavi}
                onChange={e => setPrintCavi(e.target.checked)}
              />
              <span>Includi lista cavi nella stampa (pagine successive)</span>
            </label>
          )}

          {ufficioNote && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <span className="font-semibold">Nota Ufficio:&nbsp;</span>
              {ufficioNote}
            </div>
          )}
        </div>
      </header>

      {/* main */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 print:max-w-none print:px-0 print:py-0">

        {/* suggestions banner */}
        {suggestions.length > 0 && !isLockedForCapo && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs flex flex-col gap-2">
            {suggestions.map(s => (
              <div key={s.pKey} className="flex items-center justify-between">
                <div className="text-emerald-900">
                  {s.message}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptSuggestion(s.rowId, s.pKey)}
                    className="px-2 py-0.5 rounded bg-emerald-600 text-white"
                  >
                    Accetta
                  </button>
                  <button
                    onClick={() => {
                      const next = { ...patterns }
                      delete next[s.pKey]
                      setPatterns(next)
                    }}
                    className="px-2 py-0.5 rounded border border-emerald-400 text-emerald-700"
                  >
                    Cancella
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Giornata Squadra (banque heures) */}
        <div className="bg-white shadow-sm rounded-xl p-4 no-print">
          <GiornataSquadra
            role={role}
            operatorsRegistry={operators}
            compatibleOperators={compatibleOperators}
            team={giornataSquadra}
            onChangeTeam={updateGiornata}
          />
        </div>

        {/* Rapportino sheet */}
        <div className="bg-white shadow-sm rounded-xl p-6 print:shadow-none print:rounded-none print:p-2">
          <RapportinoSheet
            data={data}
            rapportino={rapportino}
            role={role}
            readOnly={isLockedForCapo}
            operatorPool={availablePool}
            allocations={allocations}
            onChange={onChangeRapportino}
            showCompletedOps={showCompletedOps}
            onToggleShowCompleted={() => setShowCompletedOps(v => !v)}
          />
        </div>

        {/* Lista cavi en bas */}
        {role === 'ELETTRICISTA' && (
          <div className="bg-white shadow-sm rounded-xl p-4 no-print">
            <CablePanel cavi={cavi} onCaviChange={onCaviChange} />
          </div>
        )}
      </main>

      {children}
    </div>
  )
}
