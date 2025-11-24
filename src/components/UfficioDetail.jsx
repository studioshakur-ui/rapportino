import React from 'react'
import { ROLE_OPTIONS, STATUS_LABELS } from '../App'
import RapportinoSheet from './RapportinoSheet'

export default function UfficioDetail({
  archivio,
  setArchivio,
  ufficioUser,
  reportKey,
  onBack,
}) {
  const item = archivio[reportKey]
  if (!item) return null

  const handleApprove = () => {
    const updated = {
      ...archivio,
      [reportKey]: {
        ...item,
        status: 'APPROVED_UFFICIO',
        approvedByUfficioAt: new Date().toISOString(),
        approvedByUfficio: ufficioUser,
      },
    }
    setArchivio(updated)
    alert('Rapportino approvato.')
    onBack()
  }

  const handleReturn = () => {
    const motivo = window.prompt('Motivo del rimando (sarà visibile al Capo):')
    if (!motivo) return
    const updated = {
      ...archivio,
      [reportKey]: {
        ...item,
        status: 'RETURNED',
        ufficioNote: motivo,
        returnedByUfficioAt: new Date().toISOString(),
        returnedByUfficio: ufficioUser,
      },
    }
    setArchivio(updated)
    alert('Rapportino rimandato al Capo.')
    onBack()
  }

  const ruoloLabel =
    ROLE_OPTIONS.find(r => r.key === item.role)?.label || item.role

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800">
              ← Elenco
            </button>
            <h1 className="text-lg font-semibold">Verifica rapportino – {item.data}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span>Capo: <span className="font-semibold">{item.capo}</span></span>
            <span>Ruolo: <span className="font-semibold">{ruoloLabel}</span></span>
            <span className="px-2 py-0.5 rounded-full border bg-slate-50 border-slate-300 text-slate-600">
              {STATUS_LABELS[item.status] || item.status}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <RapportinoSheet
            data={item.data}
            rapportino={item.rapportino}
            role={item.role}
            readOnly
            onChange={() => {}}
          />
        </div>

        {item.role === 'ELETTRICISTA' && item.cavi?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold mb-2">
              Lista cavi del giorno ({item.cavi.length})
            </h2>
            <div className="max-h-64 overflow-auto border border-slate-200 rounded">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-1 text-left">Codice</th>
                    <th className="px-2 py-1 text-left">Descrizione</th>
                    <th className="px-2 py-1 text-right">Metri totali</th>
                    <th className="px-2 py-1 text-right">% posa</th>
                    <th className="px-2 py-1 text-right">Metri posati</th>
                  </tr>
                </thead>
                <tbody>
                  {item.cavi.map(c => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="px-2 py-1">{c.codice}</td>
                      <td className="px-2 py-1">{c.descrizione}</td>
                      <td className="px-2 py-1 text-right">{c.metriTotali}</td>
                      <td className="px-2 py-1 text-right">{c.percentuale}%</td>
                      <td className="px-2 py-1 text-right">{c.metriPosati}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Operatore Ufficio: <span className="font-semibold">{ufficioUser}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReturn}
              className="text-xs px-3 py-1.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              Rimanda al Capo
            </button>
            <button
              onClick={handleApprove}
              className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Approva e chiudi
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
