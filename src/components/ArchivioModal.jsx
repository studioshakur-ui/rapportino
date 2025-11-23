import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROLE_OPTIONS = [
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
  onClose,
  onSelect,
  currentRole,
}) {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('rapportini')
        .select('id,data,role,status,commessa,totale_prodotto,capo_name')
        .order('data', { ascending: false })
        .limit(200)

      setLoading(false)
      if (error) return alert(error.message)
      setEntries(data || [])
    }
    run()
  }, [])

  const filtered = entries.filter(e =>
    currentRole ? e.role === currentRole : true
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Archivio Rapportini</div>
            <div className="text-[11px] text-slate-500">
              Ultimi {filtered.length} rapportini
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
          >
            Chiudi
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Caricamento archivio...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Nessun rapportino trovato.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
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
                {filtered.map(it => (
                  <tr
                    key={it.id}
                    className="border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() => onSelect(it.id)}
                  >
                    <td className="px-3 py-1.5">{it.data}</td>
                    <td className="px-3 py-1.5">{it.capo_name}</td>
                    <td className="px-3 py-1.5">
                      {ROLE_OPTIONS.find(r => r.key === it.role)?.label || it.role}
                    </td>
                    <td className="px-3 py-1.5">{it.commessa || ''}</td>
                    <td className="px-3 py-1.5">
                      {STATUS_LABELS[it.status] || it.status}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {Number(it.totale_prodotto || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
