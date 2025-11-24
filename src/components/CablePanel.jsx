import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

export default function CablePanel({ cavi, onCaviChange }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL | ZERO | PARTIAL | FULL
  const [selectedIds, setSelectedIds] = useState([])
  const [massPercent, setMassPercent] = useState('')
  const [showZero, setShowZero] = useState(false)

  const handleImport = async e => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    let imported = []
    for (const file of files) {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 })

      if (!json.length) continue
      const header = json[0].map(h => String(h).toLowerCase())
      const rows = json.slice(1)

      const idxCodice = header.findIndex(h => h.includes('cod') || h.includes('cavo'))
      const idxDesc = header.findIndex(h => h.includes('descr'))
      const idxMetratura = header.findIndex(h => h.includes('met') || h.includes('lung'))

      rows.forEach((r, i) => {
        const codice = String(r[idxCodice] ?? '').trim()
        const descrizione = String(r[idxDesc] ?? '').trim()
        const metriTotali = Number(String(r[idxMetratura] ?? '0').replace(',', '.')) || 0
        if (!codice && !descrizione) return

        imported.push({
          id: `${file.name}-${i}-${codice}`,
          codice,
          descrizione,
          metriTotali,
          percentuale: 0,
          metriPosati: 0,
        })
      })
    }

    // merge unique by codice+descrizione
    const map = new Map()
    ;[...cavi, ...imported].forEach(c => {
      const key = `${c.codice}__${c.descrizione}`
      if (!map.has(key)) map.set(key, c)
      else {
        const prev = map.get(key)
        const pct = Math.max(Number(prev.percentuale || 0), Number(c.percentuale || 0))
        const metriTot = Number(prev.metriTotali || 0) || Number(c.metriTotali || 0)
        const metriPosati = Math.round((metriTot * pct) / 100 * 100) / 100
        map.set(key, { ...prev, metriTotali: metriTot, percentuale: pct, metriPosati })
      }
    })

    const newCavi = Array.from(map.values())
    const totaleMetri = newCavi.reduce((sum, c) => sum + (Number(c.metriPosati) || 0), 0)
    onCaviChange(newCavi, totaleMetri)

    e.target.value = ''
  }

  const handleToggleSelectAll = checked => {
    if (checked) setSelectedIds(filteredCavi.map(c => c.id))
    else setSelectedIds([])
  }

  const handleToggleRow = id => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const applyPercentToSelection = value => {
    const perc = Number(value)
    if (Number.isNaN(perc)) return
    const pct = Math.max(0, Math.min(100, perc))

    const newCavi = cavi.map(c => {
      if (!selectedIds.includes(c.id)) return c
      const metriTot = Number(c.metriTotali || 0)
      const metriPosati = Math.round((metriTot * pct) / 100 * 100) / 100
      return { ...c, percentuale: pct, metriPosati }
    })

    const totaleMetri = newCavi.reduce(
      (sum, c) => sum + (Number(c.metriPosati) || 0),
      0
    )

    onCaviChange(newCavi, totaleMetri)
  }

  function applyPercentToSingle(id, value) {
    const perc = Number(value)
    if (Number.isNaN(perc)) return
    const pct = Math.max(0, Math.min(100, perc))

    const newCavi = cavi.map(c => {
      if (c.id !== id) return c
      const metriTot = Number(c.metriTotali || 0)
      const metriPosati = Math.round((metriTot * pct) / 100 * 100) / 100
      return { ...c, percentuale: pct, metriPosati }
    })

    const totaleMetri = newCavi.reduce(
      (sum, c) => sum + (Number(c.metriPosati) || 0),
      0
    )

    onCaviChange(newCavi, totaleMetri)
  }

  const filteredCavi = useMemo(() => {
    return cavi.filter(c => {
      const term = search.trim().toLowerCase()
      if (term) {
        const match =
          (c.codice || '').toLowerCase().includes(term) ||
          (c.descrizione || '').toLowerCase().includes(term)
        if (!match) return false
      }

      const pct = Number(c.percentuale || 0)
      if (!showZero && pct === 0) return false

      if (filterStatus === 'ZERO' && pct !== 0) return false
      if (filterStatus === 'PARTIAL' && (pct <= 0 || pct >= 100)) return false
      if (filterStatus === 'FULL' && pct !== 100) return false

      return true
    })
  }, [cavi, search, filterStatus, showZero])

  const totalMetriPosati = useMemo(() => {
    return cavi.reduce((sum, c) => sum + (Number(c.metriPosati) || 0), 0)
  }, [cavi])

  const allVisibleSelected =
    filteredCavi.length > 0 &&
    filteredCavi.every(c => selectedIds.includes(c.id))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Lista cavi del giorno</h2>
        <label className="text-[11px] text-slate-600 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showZero}
            onChange={e => setShowZero(e.target.checked)}
          />
          Mostra anche 0%
        </label>
      </div>

      {/* Search + Import */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-[11px]"
            placeholder="🔍 Cerca per codice o descrizione..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <label className="text-[11px] text-slate-500 cursor-pointer">
            <span className="mr-1 border border-slate-300 rounded px-2 py-1 inline-block hover:bg-slate-50">
              Importa
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-600">Filtro:</span>
            {[
              ['ALL', 'Tutti'],
              ['ZERO', '0%'],
              ['PARTIAL', '1–99%'],
              ['FULL', '100%'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`px-2 py-0.5 rounded border text-[11px] ${
                  filterStatus === key
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setFilterStatus(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500">
            Cavi: {cavi.length} · Filtrati: {filteredCavi.length}
          </div>
        </div>
      </div>

      {/* Selection bar */}
      {selectedIds.length > 0 && (
        <div className="mb-2 border border-emerald-200 bg-emerald-50 rounded px-2 py-1 flex items-center justify-between">
          <div className="text-[11px] text-emerald-900">
            Cavi selezionati: <span className="font-semibold">{selectedIds.length}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <input
              type="number"
              className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right"
              value={massPercent}
              onChange={e => setMassPercent(e.target.value)}
              placeholder="%"
            />
            <button
              className="px-2 py-0.5 rounded border border-emerald-500 text-emerald-700 hover:bg-emerald-100"
              onClick={() => applyPercentToSelection(massPercent)}
            >
              Imposta %
            </button>
            <button
              className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => applyPercentToSelection(100)}
            >
              100%
            </button>
            <button
              className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => applyPercentToSelection(0)}
            >
              0%
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-200 rounded overflow-auto max-h-[420px]">
        <table className="w-full text-[11px] table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="w-8 px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={e => handleToggleSelectAll(e.target.checked)}
                />
              </th>
              <th className="w-40 px-1 py-1 text-left">Codice</th>
              <th className="px-1 py-1 text-left">Descrizione</th>
              <th className="w-20 px-1 py-1 text-right">Metri</th>
              <th className="w-20 px-1 py-1 text-right">% posa</th>
              <th className="w-24 px-1 py-1 text-right">Posati</th>
            </tr>
          </thead>
          <tbody>
            {filteredCavi.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                  Nessun cavo trovato con i filtri attuali.
                </td>
              </tr>
            ) : (
              filteredCavi.map(c => {
                const pct = Number(c.percentuale || 0)
                const rowBg =
                  pct === 0 ? '' : pct < 100 ? 'bg-amber-50' : 'bg-emerald-50'

                return (
                  <tr key={c.id} className={`border-t border-slate-100 ${rowBg}`}>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => handleToggleRow(c.id)}
                      />
                    </td>
                    <td className="px-1 py-1 truncate">{c.codice}</td>
                    <td className="px-1 py-1 truncate">{c.descrizione}</td>
                    <td className="px-1 py-1 text-right">{c.metriTotali}</td>
                    <td className="px-1 py-1 text-right">
                      <input
                        type="number"
                        className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right"
                        value={c.percentuale ?? ''}
                        onChange={e => applyPercentToSingle(c.id, e.target.value)}
                      />
                    </td>
                    <td className="px-1 py-1 text-right">{c.metriPosati ?? ''}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-[11px] text-right text-slate-600">
        Totale metri posati oggi:{' '}
        <span className="font-semibold">{totalMetriPosati.toFixed(2)}</span>
      </div>
    </div>
  )
}
