import React, { useMemo, useState } from 'react'
import { ROLE_OPTIONS, STATUS_LABELS } from '../App'

export default function ArchivioModal({
  archivio,
  currentCapo,
  currentRole,
  onClose,
  onSelect,
}) {
  const [filterCapo, setFilterCapo] = useState('ALL')
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [term, setTerm] = useState('')

  const entries = useMemo(() => {
    return Object.entries(archivio)
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [archivio])

  const capi = useMemo(() => {
    const s = new Set(entries.map(e => e.capo))
    return ['ALL', ...Array.from(s).sort()]
  }, [entries])

  const filtered = entries.filter(e => {
    if (filterCapo !== 'ALL' && e.capo !== filterCapo) return false
    if (filterRole !== 'ALL' && e.role !== filterRole) return false
    if (filterStatus !== 'ALL' && e.status !== filterStatus) return false

    const t = term.trim().toLowerCase()
    if (t) {
      const match =
        (e.capo || '').toLowerCase().includes(t) ||
        (e.role || '').toLowerCase().includes(t) ||
        (e.rapportino?.commessa || '').toLowerCase().includes(t) ||
        (e.data || '').toLowerCase().includes(t)
      if (!match) return false
    }

    return true
  })

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 no-print">
      <div className="bg-white rounded-2xl shadow-xl w-[900px] max-w-[95vw] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Archivio Rapportini</h2>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800">
            Chiudi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 text-xs">
          <input
            className="border rounded px-2 py-1"
            placeholder="Cerca..."
            value={term}
            onChange={e => setTerm(e.target.value)}
          />

          <select
            className="border rounded px-2 py-1"
            value={filterCapo}
            onChange={e => setFilterCapo(e.target.value)}
          >
            {capi.map(c => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'Tutti i capi' : c}
              </option>
            ))}
          </select>

          <select
            className="border rounded px-2 py-1"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="ALL">Tutti i ruoli</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>

          <select
            className="border rounded px-2 py-1"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Tutti gli stati</option>
            {Object.keys(STATUS_LABELS).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="border border-slate-200 rounded overflow-auto max-h-[65vh]">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left">Data</th>
                <th className="px-2 py-2 text-left">Capo</th>
                <th className="px-2 py-2 text-left">Ruolo</th>
                <th className="px-2 py-2 text-left">Commessa</th>
                <th className="px-2 py-2 text-left">Stato</th>
                <th className="px-2 py-2 text-right">Prodotto</th>
                <th className="px-2 py-2 text-right">Cavi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-slate-500">
                    Nessun rapportino trovato.
                  </td>
                </tr>
              ) : (
                filtered.map(e => (
                  <tr
                    key={e.key}
                    className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${
                      e.capo === currentCapo && e.role === currentRole ? 'bg-emerald-50/40' : ''
                    }`}
                    onClick={() => onSelect(e.key)}
                  >
                    <td className="px-2 py-1.5">{e.data}</td>
                    <td className="px-2 py-1.5">{e.capo}</td>
                    <td className="px-2 py-1.5">
                      {ROLE_OPTIONS.find(r => r.key === e.role)?.label || e.role}
                    </td>
                    <td className="px-2 py-1.5">{e.rapportino?.commessa || ''}</td>
                    <td className="px-2 py-1.5">{STATUS_LABELS[e.status] || e.status}</td>
                    <td className="px-2 py-1.5 text-right">{e.rapportino?.totaleProdotto || 0}</td>
                    <td className="px-2 py-1.5 text-right">{e.cavi?.length || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          Chiave industriale: <span className="font-semibold">data + capo + ruolo</span>
        </div>
      </div>
    </div>
  )
}
