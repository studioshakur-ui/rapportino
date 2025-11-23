import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

/**
 * CablePanel – Version finale
 * - Import Excel/CSV réel
 * - Multi-import => liste unique (fusion par codice)
 * - Recherche + filtres % posa
 * - Sélection multiple + % massif
 * - Couleurs: 0 neutre, 1–99 amber, 100 vert
 */
export default function CablePanel({ cavi, onCaviChange }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL | ZERO | PARTIAL | FULL
  const [selectedIds, setSelectedIds] = useState([])
  const [massPercent, setMassPercent] = useState('')

  /* ===================== IMPORT EXCEL/CSV ===================== */

  const handleImport = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]

      // Extract rows as arrays
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (!rows || rows.length < 2) {
        alert('File vuoto o non valido.')
        return
      }

      const rawHeader = rows[0].map(h => String(h).trim().toLowerCase())
      const dataRows = rows.slice(1)

      const idxCodice = rawHeader.findIndex(h =>
        h.includes('cod') || h.includes('cavo') || h.includes('cable')
      )
      const idxDesc = rawHeader.findIndex(h =>
        h.includes('descr') || h.includes('desc') || h.includes('nome')
      )
      const idxMetri = rawHeader.findIndex(h =>
        h.includes('met') || h.includes('lung') || h.includes('len') || h.includes('mt')
      )

      if (idxCodice === -1 || idxMetri === -1) {
        alert("Header non riconosciuto. Serve almeno 'codice/cavo' e 'metri/lunghezza'.")
        return
      }

      const imported = dataRows
        .map((r, i) => {
          const codice = String(r[idxCodice] ?? '').trim()
          if (!codice) return null
          const descrizione = String(r[idxDesc] ?? '').trim()

          const metriRaw = String(r[idxMetri] ?? '').replace(',', '.')
          const metriTotali = Number(metriRaw)
          if (!Number.isFinite(metriTotali)) return null

          return {
            id: `${codice}-${i}-${Date.now()}`,
            codice,
            descrizione,
            metriTotali: Math.round(metriTotali * 100) / 100,
            percentuale: 0,
            metriPosati: 0,
            sourceFile: file.name,
          }
        })
        .filter(Boolean)

      if (imported.length === 0) {
        alert('Nessun cavo valido trovato nel file.')
        return
      }

      // Fusion par codice (liste multiples => liste unique)
      const map = new Map()
      cavi.forEach(c => {
        map.set(c.codice, { ...c })
      })

      imported.forEach(c => {
        const existing = map.get(c.codice)
        if (!existing) {
          map.set(c.codice, c)
        } else {
          // règle simple: garder la descrizione si vide, et ne pas dupliquer
          map.set(c.codice, {
            ...existing,
            descrizione: existing.descrizione || c.descrizione,
            metriTotali:
              existing.metriTotali && existing.metriTotali > 0
                ? existing.metriTotali
                : c.metriTotali,
          })
        }
      })

      const newCavi = Array.from(map.values())

      const totaleMetri = newCavi.reduce(
        (sum, c) => sum + (Number(c.metriPosati) || 0),
        0
      )

      onCaviChange(newCavi, totaleMetri)
      setSelectedIds([])
      e.target.value = ''

      alert(`Importati ${imported.length} cavi da ${file.name}. Totale lista: ${newCavi.length}`)
    } catch (err) {
      console.error(err)
      alert('Errore durante import Excel/CSV.')
    }
  }

  /* ===================== SELECTION ===================== */

  const handleToggleSelectAll = checked => {
    if (checked) {
      setSelectedIds(filteredCavi.map(c => c.id))
    } else {
      setSelectedIds([])
    }
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

  /* ===================== FILTERED VIEW ===================== */

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
      if (filterStatus === 'ZERO' && pct !== 0) return false
      if (filterStatus === 'PARTIAL' && (pct <= 0 || pct >= 100)) return false
      if (filterStatus === 'FULL' && pct !== 100) return false

      return true
    })
  }, [cavi, search, filterStatus])

  const totalMetriPosati = useMemo(
    () =>
      cavi.reduce((sum, c) => sum + (Number(c.metriPosati) || 0), 0),
    [cavi]
  )

  const allVisibleSelected =
    filteredCavi.length > 0 &&
    filteredCavi.every(c => selectedIds.includes(c.id))

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold mb-2">Lista cavi del giorno</h2>

      {/* Recherche + import */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Filtres */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-600">Filtro:</span>

            {[
              { k: 'ALL', t: 'Tutti' },
              { k: 'ZERO', t: '0%' },
              { k: 'PARTIAL', t: '1–99%' },
              { k: 'FULL', t: '100%' },
            ].map(b => (
              <button
                key={b.k}
                className={`px-2 py-0.5 rounded border text-[11px] ${
                  filterStatus === b.k
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setFilterStatus(b.k)}
              >
                {b.t}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500">
            Cavi: {cavi.length} · Filtrati: {filteredCavi.length}
          </div>
        </div>
      </div>

      {/* Barre sélection multiple */}
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
              onClick={() => applyPercentToSelection(0)}
            >
              0%
            </button>
            <button
              className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => applyPercentToSelection(50)}
            >
              50%
            </button>
            <button
              className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
              onClick={() => applyPercentToSelection(100)}
            >
              100%
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 border border-slate-200 rounded overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="px-1 py-1 text-center w-6">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={e => handleToggleSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-1 py-1 text-left">Codice</th>
              <th className="px-1 py-1 text-left">Descrizione</th>
              <th className="px-1 py-1 text-right">Metri totali</th>
              <th className="px-1 py-1 text-right">% posa</th>
              <th className="px-1 py-1 text-right">Metri posati</th>
            </tr>
          </thead>

          <tbody>
            {filteredCavi.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-2 text-center text-slate-500">
                  Nessun cavo trovato con i filtri attuali.
                </td>
              </tr>
            ) : (
              filteredCavi.map(c => {
                const pct = Number(c.percentuale || 0)
                let rowBg = ''
                if (pct > 0 && pct < 100) rowBg = 'bg-amber-50'
                if (pct === 100) rowBg = 'bg-emerald-50'

                return (
                  <tr key={c.id} className={`border-t border-slate-100 ${rowBg}`}>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => handleToggleRow(c.id)}
                      />
                    </td>
                    <td className="px-1 py-1 font-medium">{c.codice}</td>
                    <td className="px-1 py-1">{c.descrizione}</td>
                    <td className="px-1 py-1 text-right">{c.metriTotali}</td>
                    <td className="px-1 py-1 text-right">
                      <input
                        type="number"
                        className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right text-[11px] focus:ring-1 focus:ring-emerald-500"
                        value={c.percentuale ?? ''}
                        onChange={e => applyPercentToSingle(c.id, e.target.value)}
                      />
                    </td>
                    <td className="px-1 py-1 text-right">
                      {c.metriPosati ?? ''}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Totale */}
      <div className="mt-2 text-[11px] text-right text-slate-600">
        Totale metri posati oggi:{' '}
        <span className="font-semibold">{totalMetriPosati.toFixed(2)}</span>
      </div>
    </div>
  )
}
