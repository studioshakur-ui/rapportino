import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

export default function CablePanel({ cavi, onCaviChange }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL | ZERO | PARTIAL | FULL
  const [selectedIds, setSelectedIds] = useState([])
  const [massPercent, setMassPercent] = useState('')

  /* ====================== IMPORT EXCEL / CSV ====================== */

  const handleImport = async e => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      const importedCaviArrays = []
      for (const file of files) {
        const ext = (file.name.split('.').pop() || '').toLowerCase()

        if (ext === 'csv') {
          const text = await readFileAsText(file)
          const rows = parseCSV(text)
          const caviFromCSV = mapRowsToCavi(rows)
          importedCaviArrays.push(caviFromCSV)
        } else {
          // xlsx / xls (ou autre lisible par XLSX)
          const data = await readFileAsArrayBuffer(file)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            blankrows: false,
          })
          const caviFromXlsx = mapRowsToCavi(rows)
          importedCaviArrays.push(caviFromXlsx)
        }
      }

      const importedFlat = importedCaviArrays.flat()

      if (importedFlat.length === 0) {
        alert('Nessun cavo riconosciuto nei file importati.')
        e.target.value = ''
        return
      }

      // Fusion avec la liste existante (merge multi-fichiers)
      const maxExistingId = cavi.reduce(
        (max, c) => (typeof c.id === 'number' ? Math.max(max, c.id) : max),
        0
      )

      // Option léger anti-doublons: (codice+descrizione)
      const existingKeySet = new Set(
        cavi.map(c => `${(c.codice || '').trim()}__${(c.descrizione || '').trim()}`)
      )

      let nextId = maxExistingId + 1
      const newCaviToAdd = []

      for (const row of importedFlat) {
        const key = `${(row.codice || '').trim()}__${(row.descrizione || '').trim()}`
        if (!row.codice && !row.descrizione) continue
        if (existingKeySet.has(key)) continue // on ne ré-importe pas les mêmes câbles

        newCaviToAdd.push({
          id: nextId++,
          codice: row.codice || '',
          descrizione: row.descrizione || '',
          metriTotali: row.metriTotali ?? 0,
          percentuale: 0,
          metriPosati: 0,
        })
      }

      if (newCaviToAdd.length === 0) {
        alert('I file sono stati letti, ma nessun nuovo cavo da aggiungere.')
        e.target.value = ''
        return
      }

      const merged = [...cavi, ...newCaviToAdd]

      const totaleMetri = merged.reduce(
        (sum, c) => sum + (Number(c.metriPosati) || 0),
        0
      )

      onCaviChange(merged, totaleMetri)
      setSelectedIds([])
      setFilterStatus('ALL')
      setSearch('')

      alert(`Import completato. Cavi aggiunti: ${newCaviToAdd.length}`)
    } catch (err) {
      console.error('Errore import:', err)
      alert('Errore durante l\'importazione. Verifica il formato dei file.')
    } finally {
      e.target.value = ''
    }
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = err => reject(err)
      reader.readAsArrayBuffer(file)
    })
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = err => reject(err)
      reader.readAsText(file)
    })
  }

  function parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (lines.length === 0) return []

    const rows = lines.map(line => {
      // Split très simple ; si tu as des CSV complexes, on pourra renforcer.
      return line.split(';').length > 1
        ? line.split(';')
        : line.split(',')
    })

    return rows
  }

  /**
   * rows = tableau 2D (première ligne = en-têtes)
   * On essaie de retrouver:
   *  - codice   -> colonne "CODICE", "CAVO", "CABLE", ...
   *  - descrizione -> "DESCRIZIONE", "DESC", ...
   *  - metriTotali -> "METRI", "LUNGHEZZA", "LUNG", "METRATURA"
   */
  function mapRowsToCavi(rows) {
    if (!rows || rows.length < 2) return []

    const headerRow = rows[0]
    const dataRows = rows.slice(1)

    const headerNorm = headerRow.map(h =>
      String(h || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
    )

    const idxCodice =
      findIndexInHeader(headerNorm, ['CODICE', 'CAVO', 'CABLE', 'COD']) ?? -1
    const idxDescrizione =
      findIndexInHeader(headerNorm, ['DESCRIZIONE', 'DESC', 'DESCR', 'DESCRIZ']) ??
      -1
    const idxMetri =
      findIndexInHeader(headerNorm, ['METRI', 'LUNGHEZZA', 'LUNG', 'METRATURA']) ??
      -1

    const result = []

    for (const row of dataRows) {
      if (!row || row.length === 0) continue

      const codice =
        idxCodice >= 0 ? String(row[idxCodice] || '').trim() : ''
      const descrizione =
        idxDescrizione >= 0 ? String(row[idxDescrizione] || '').trim() : ''
      const metriRaw = idxMetri >= 0 ? String(row[idxMetri] || '').trim() : ''

      if (!codice && !descrizione && !metriRaw) continue

      const metriTotali = cleanNumber(metriRaw)

      result.push({
        codice,
        descrizione,
        metriTotali,
      })
    }

    return result
  }

  function findIndexInHeader(headerNorm, candidates) {
    for (let i = 0; i < headerNorm.length; i++) {
      const h = headerNorm[i]
      for (const c of candidates) {
        if (h === c) return i
        if (h.includes(c)) return i
      }
    }
    return null
  }

  function cleanNumber(value) {
    if (value === null || value === undefined) return 0
    const str = String(value).trim()
    if (!str) return 0
    // virgule -> point
    const normalized = str.replace(',', '.')
    const n = Number(normalized)
    return Number.isNaN(n) ? 0 : n
  }

  /* ====================== LOGIQUE EXISTANTE ====================== */

  const handleToggleSelectAll = checked => {
    if (checked) {
      setSelectedIds(cavi.map(c => c.id))
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
      return {
        ...c,
        percentuale: pct,
        metriPosati,
      }
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
      if (filterStatus === 'ZERO' && pct !== 0) return false
      if (filterStatus === 'PARTIAL' && (pct <= 0 || pct >= 100)) return false
      if (filterStatus === 'FULL' && pct !== 100) return false

      return true
    })
  }, [cavi, search, filterStatus])

  const totalMetriPosati = cavi.reduce(
    (sum, c) => sum + (Number(c.metriPosati) || 0),
    0
  )

  const allVisibleSelected =
    filteredCavi.length > 0 &&
    filteredCavi.every(c => selectedIds.includes(c.id))

  function applyPercentToSelectionForSingle(id, value) {
    const perc = Number(value)
    if (Number.isNaN(perc)) return
    const pct = Math.max(0, Math.min(100, perc))

    const newCavi = cavi.map(c => {
      if (c.id !== id) return c
      const metriTot = Number(c.metriTotali || 0)
      const metriPosati = Math.round((metriTot * pct) / 100 * 100) / 100
      return {
        ...c,
        percentuale: pct,
        metriPosati,
      }
    })

    const totaleMetri = newCavi.reduce(
      (sum, c) => sum + (Number(c.metriPosati) || 0),
      0
    )

    onCaviChange(newCavi, totaleMetri)
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold mb-2">Lista cavi del giorno</h2>

      {/* Barre recherche + import */}
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
            <span className="mr-1 border border-slate-300 rounded px-2 py-1 inline-block">
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

        {/* Filtres */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-600">Filtro:</span>
            <button
              className={`px-2 py-0.5 rounded border text-[11px] ${
                filterStatus === 'ALL'
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setFilterStatus('ALL')}
            >
              Tutti
            </button>
            <button
              className={`px-2 py-0.5 rounded border text-[11px] ${
                filterStatus === 'ZERO'
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setFilterStatus('ZERO')}
            >
              0%
            </button>
            <button
              className={`px-2 py-0.5 rounded border text-[11px] ${
                filterStatus === 'PARTIAL'
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setFilterStatus('PARTIAL')}
            >
              1–99%
            </button>
            <button
              className={`px-2 py-0.5 rounded border text-[11px] ${
                filterStatus === 'FULL'
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setFilterStatus('FULL')}
            >
              100%
            </button>
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
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-1 py-1 text-center">
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
                <td colSpan={6} className="px-2 py-2 text-center text-[11px] text-slate-500">
                  Nessun cavo trovato con i filtri attuali.
                </td>
              </tr>
            ) : (
              filteredCavi.map(c => {
                const pct = Number(c.percentuale || 0)
                let rowBg = ''
                if (pct > 0 && pct < 100) rowBg = 'bg-amber-50'
                else if (pct === 100) rowBg = 'bg-emerald-50'

                return (
                  <tr key={c.id} className={`border-t border-slate-100 ${rowBg}`}>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => handleToggleRow(c.id)}
                      />
                    </td>
                    <td className="px-1 py-1">{c.codice}</td>
                    <td className="px-1 py-1">{c.descrizione}</td>
                    <td className="px-1 py-1 text-right">{c.metriTotali}</td>
                    <td className="px-1 py-1 text-right">
                      <input
                        type="number"
                        className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]"
                        value={c.percentuale ?? ''}
                        onChange={e => {
                          const value = Number(e.target.value || 0)
                          applyPercentToSelectionForSingle(c.id, value)
                        }}
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

      {/* Totale metri */}
      <div className="mt-2 text-[11px] text-right text-slate-600">
        Totale metri posati oggi:{' '}
        <span className="font-semibold">{totalMetriPosati.toFixed(2)}</span>
      </div>
    </div>
  )
}
