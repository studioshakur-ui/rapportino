import React, { useMemo, useState } from 'react'
import { ROLE_OPTIONS, STATUS_LABELS } from '../App'

export default function UfficioList({ archivio, ufficioUser, onBack, onSelect }) {
  const [statusFilter, setStatusFilter] = useState('VALIDATED_CAPO')

  const entries = useMemo(() => {
    return Object.entries(archivio)
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [archivio])

  const filtered = entries.filter(e =>
    statusFilter === 'ALL' ? true : e.status === statusFilter
  )

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800">
              ← Home
            </button>
            <h1 className="text-lg font-semibold">Ufficio tecnico – Rapportini</h1>
          </div>
          <div className="text-xs text-slate-500">
            Operatore: <span className="font-semibold">{ufficioUser}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">Stato:</span>
            <select
              className="border border-slate-300 rounded px-2 py-1 text-xs"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="VALIDATED_CAPO">In attesa di verifica</option>
              <option value="APPROVED_UFFICIO">Approvati</option>
              <option value="RETURNED">Rimandati</option>
              <option value="DRAFT">Bozze</option>
              <option value="ALL">Tutti</option>
            </select>
          </div>
          <div className="text-[11px] text-slate-500">
            Rapportini: {filtered.length}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              Nessun rapportino trovato per lo stato selezionato.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Capo</th>
                  <th className="px-3 py-2 text-left">Ruolo</th>
                  <th className="px-3 py-2 text-left">Commessa</th>
                  <th className="px-3 py-2 text-left">Stato</th>
                  <th className="px-3 py-2 text-right">Prodotto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr
                    key={item.key}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => onSelect(item.key)}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">{item.data}</td>
                    <td className="px-3 py-1.5">{item.capo}</td>
                    <td className="px-3 py-1.5">
                      {ROLE_OPTIONS.find(r => r.key === item.role)?.label || item.role}
                    </td>
                    <td className="px-3 py-1.5">{item.rapportino?.commessa || ''}</td>
                    <td className="px-3 py-1.5">{STATUS_LABELS[item.status] || item.status}</td>
                    <td className="px-3 py-1.5 text-right">
                      {item.rapportino?.totaleProdotto || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
