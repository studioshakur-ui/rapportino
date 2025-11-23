import React, { useMemo, useState } from 'react'
import { ROLE_OPTIONS } from '../roleOptions' 

const LOCAL_ROLE_OPTIONS = [
  { key: 'ELETTRICISTA', label: 'Elettricista' },
  { key: 'CARPENTERIA', label: 'Carpenteria' },
  { key: 'MONTAGGIO', label: 'Montaggio' },
]

const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validato Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
}

export default function ArchivioModal({
  archivio,
  currentCapo,
  currentRole,
  onClose,
  onSelect,
}) {
  const capoUpper = (currentCapo || '').toUpperCase().trim()

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState(currentRole || 'ALL')

  const entries = useMemo(() => {
    return Object.entries(archivio || {})
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [archivio])

  const filtered = entries.filter(e => {
    if (capoUpper && e.capo !== capoUpper) return false
    if (roleFilter !== 'ALL' && e.role !== roleFilter) return false
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Archivio rapportini – {capoUpper || 'Capo'}
            </h2>
            <p className="text-[11px] text-slate-500">
              Seleziona un rapportino per ricaricarlo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ✕ Chiudi
          </button>
        </div>

        {/* Filtres */}
        <div className="px-4 py-2 border-b flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-600">Ruolo:</span>
            <select
              className="border border-slate-300 rounded px-2 py-0.5"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tutti</option>
              {LOCAL_ROLE_OPTIONS.map(r => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-600">Stato:</span>
            <select
              className="border border-slate-300 rounded px-2 py-0.5"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tutti</option>
              <option value="DRAFT">Bozze</option>
              <option value="VALIDATED_CAPO">Validati Capo</option>
              <option value="APPROVED_UFFICIO">Approvati Ufficio</option>
              <option value="RETURNED">Rimandati</option>
            </select>
          </div>

          <div className="ml-auto text-[11px] text-slate-500">
            Rapportini: {filtered.length}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11px] text-slate-500">
              Nessun rapportino trovato con i filtri attuali.
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Ruolo</th>
                  <th className="px-3 py-2 text-left">Commessa</th>
                  <th className="px-3 py-2 text-left">Stato</th>
                  <th className="px-3 py-2 text-right">Prodotto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const ruoloLabel =
                    LOCAL_ROLE_OPTIONS.find(r => r.key === item.role)?.label ||
                    item.role

                  let badgeClass =
                    'px-2 py-0.5 rounded-full border bg-slate-50 border-slate-300 text-slate-600'
                  if (item.status === 'APPROVED_UFFICIO') {
                    badgeClass =
                      'px-2 py-0.5 rounded-full border bg-emerald-50 border-emerald-300 text-emerald-700'
                  } else if (item.status === 'VALIDATED_CAPO') {
                    badgeClass =
                      'px-2 py-0.5 rounded-full border bg-sky-50 border-sky-300 text-sky-700'
                  } else if (item.status === 'RETURNED') {
                    badgeClass =
                      'px-2 py-0.5 rounded-full border bg-amber-50 border-amber-300 text-amber-700'
                  }

                  return (
                    <tr
                      key={item.key}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => onSelect(item.key)}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {item.data}
                      </td>
                      <td className="px-3 py-1.5">{ruoloLabel}</td>
                      <td className="px-3 py-1.5">
                        {item.rapportino?.commessa || ''}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={badgeClass}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {Number(item.rapportino?.totaleProdotto || 0).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
