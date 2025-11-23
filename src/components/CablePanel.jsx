import React, { useMemo, useState, useEffect } from 'react'
import { FixedSizeList as List } from 'react-window'
import * as XLSX from 'xlsx'

export default function CablePanel({ cavi, onCaviChange, readOnly = false }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL | ZERO | PARTIAL | FULL
  const [hideZero, setHideZero] = useState(true) // ON par défaut
  const [selectedIds, setSelectedIds] = useState([])
  const [massPercent, setMassPercent] = useState('')
  const [listHeight, setListHeight] = useState(360)

  // hauteur responsive du viewport câbles
  useEffect(() => {
    const calc = () => {
      const h = Math.max(260, Math.min(520, window.innerHeight * 0.38))
      setListHeight(h)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  /* ===================== IMPORT EXCEL MULTI-FICHIERS ===================== */
  const handleImport = async e => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    try {
      const importedRows = []

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: 'array' })

        // on prend la première feuille non vide
        const sheetName =
          wb.SheetNames.find(n => wb.Sheets[n]) || wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        if (!ws) continue

        // json brut (SheetJS)
        const raw = XLSX.utils.sheet_to_json(ws, {
          defval: '',
          raw: false,
        })

        if (!raw.length) continue

        const parsed = parseCableSheet(raw)
        importedRows.push(...parsed)
      }

      if (!importedRows.length) {
        alert('Nessun cavo trovato nei file importati.')
        e.target.value = ''
        return
      }

      // merge avec cavi existants + dédoublonnage par "codice"
      const merged = mergeCaviByCodice(cavi, importedRows)

      // recalcul totale metri posati (avec % déjà annotés)
      const totaleMetri = merged.reduce(
        (sum, c) => sum + (Number(c.metriPosati) || 0),
        0
      )

      onCaviChange(merged, totaleMetri)

      alert(
        `Import completato: ${importedRows.length} righe lette.\n` +
        `Cavi totali del giorno: ${merged.length} (doppioni unificati).`
      )
    } catch (err) {
      console.error(err)
      alert(`Errore import Excel: ${err.message || err}`)
    } finally {
      e.target.value = ''
    }
  }

  /* ===================== SELECTION / MASS UPDATE ===================== */
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
    const pct = clampPct(perc)

    const newCavi = cavi.map(c => {
      if (!selectedIds.includes(c.id)) return c
      const metriTot = Number(c.metriTotali || 0)
      const metriPosati = round2((metriTot * pct) / 100)
      return { ...c, percentuale: pct, metriPosati }
    })

    const totaleMetri = newCavi.reduce(
      (sum, c) => sum + (Number(c.metriPosati) || 0),
      0
    )

    onCaviChange(newCavi, totaleMetri)
  }

  const applyPercentToSingle = (id, value) => {
    const perc = Number(value)
    if (Number.isNaN(perc)) return
    const pct = clampPct(perc)

    const newCavi = cavi.map(c => {
      if (c.id !== id) return c
      const metriTot = Number(c.metriTotali || 0)
      const metriPosati = round2((metriTot * pct) / 100)
      return { ...c, percentuale: pct, metriPosati }
    })

    const totaleMetri = newCavi.reduce(
      (sum, c) => sum + (Number(c.metriPosati) || 0),
      0
    )

    onCaviChange(newCavi, totaleMetri)
  }

  /* ===================== FILTERING / VIRTUALISATION ===================== */
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
      if (hideZero && pct === 0) return false

      if (filterStatus === 'ZERO' && pct !== 0) return false
      if (filterStatus === 'PARTIAL' && (pct <= 0 || pct >= 100)) return false
      if (filterStatus === 'FULL' && pct !== 100) return false

      return true
    })
  }, [cavi, search, filterStatus, hideZero])

  const totalMetriPosati = cavi.reduce(
    (sum, c) => sum + (Number(c.metriPosati) || 0),
    0
  )

  const allVisibleSelected =
    filteredCavi.length > 0 &&
    filteredCavi.every(c => selectedIds.includes(c.id))

  const useVirtual = filteredCavi.length > 120

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold mb-2">Lista cavi del giorno</h2>

      {/* Search + import */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-[11px]"
            placeholder="🔍 Cerca per codice o descrizione..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {!readOnly && (
            <label className="text-[11px] text-slate-500 cursor-pointer">
              <span className="mr-1 border border-slate-300 rounded px-2 py-1 inline-block">
                Importa Excel
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={handleImport}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* filtres */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] flex-wrap">
            <span className="text-slate-600">Filtro:</span>
            {['ALL', 'ZERO', 'PARTIAL', 'FULL'].map(k => (
              <button
                key={k}
                className={`px-2 py-0.5 rounded border text-[11px] ${
                  filterStatus === k
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setFilterStatus(k)}
              >
                {k === 'ALL'
                  ? 'Tutti'
                  : k === 'ZERO'
                  ? '0%'
                  : k === 'PARTIAL'
                  ? '1–99%'
                  : '100%'}
              </button>
            ))}

            <label className="ml-2 flex items-center gap-1 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={hideZero}
                onChange={e => setHideZero(e.target.checked)}
              />
              Nascondi 0%
            </label>
          </div>

          <div className="text-[11px] text-slate-500">
            Cavi: {cavi.length} · Visibili: {filteredCavi.length}
          </div>
        </div>
      </div>

      {/* Barre sélection multiple */}
      {selectedIds.length > 0 && !readOnly && (
        <div className="mb-2 border border-emerald-200 bg-emerald-50 rounded px-2 py-1 flex items-center justify-between">
          <div className="text-[11px] text-emerald-900">
            Cavi selezionati:{' '}
            <span className="font-semibold">{selectedIds.length}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] flex-wrap">
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

      {/* Header sticky */}
      <div className="border border-slate-200 rounded overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_2fr_90px_70px_90px] text-[11px] bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <div className="p-1 text-center">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={e => handleToggleSelectAll(e.target.checked)}
              disabled={readOnly || filteredCavi.length === 0}
            />
          </div>
          <div className="p-1 font-semibold">Codice</div>
          <div className="p-1 font-semibold">Descrizione</div>
          <div className="p-1 font-semibold text-right">Metri tot</div>
          <div className="p-1 font-semibold text-right">% posa</div>
          <div className="p-1 font-semibold text-right">Metri posati</div>
        </div>

        {/* Liste */}
        {filteredCavi.length === 0 ? (
          <div className="px-2 py-3 text-center text-[11px] text-slate-500">
            Nessun cavo trovato con i filtri attuali.
          </div>
        ) : useVirtual ? (
          <List
            height={listHeight}
            itemCount={filteredCavi.length}
            itemSize={32}
            width="100%"
          >
            {({ index, style }) => (
              <Row
                style={style}
                cavo={filteredCavi[index]}
                selected={selectedIds.includes(filteredCavi[index].id)}
                onToggle={() => handleToggleRow(filteredCavi[index].id)}
                onPctChange={v =>
                  applyPercentToSingle(filteredCavi[index].id, v)
                }
                readOnly={readOnly}
              />
            )}
          </List>
        ) : (
          <div>
            {filteredCavi.map(c => (
              <Row
                key={c.id}
                cavo={c}
                selected={selectedIds.includes(c.id)}
                onToggle={() => handleToggleRow(c.id)}
                onPctChange={v => applyPercentToSingle(c.id, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* Totale + validation (placeholder futur) */}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <div className="text-slate-600">
          Totale metri posati oggi:{' '}
          <span className="font-semibold">{totalMetriPosati.toFixed(2)}</span>
        </div>

        {!readOnly && (
          <button
            className="px-2 py-1 rounded border border-slate-400 hover:bg-slate-50"
            onClick={() =>
              alert(
                'Valida lista cavi: già pronta lato DB, la colleghiamo allo status quando vuoi.'
              )
            }
          >
            Valida lista cavi
          </button>
        )}
      </div>
    </div>
  )
}

/* ===================== ROW ===================== */
function Row({ cavo, selected, onToggle, onPctChange, style, readOnly }) {
  const pct = Number(cavo.percentuale || 0)
  let rowBg = ''
  if (pct > 0 && pct < 100) rowBg = 'bg-amber-50'
  else if (pct === 100) rowBg = 'bg-emerald-50'

  return (
    <div
      style={style}
      className={`grid grid-cols-[28px_1fr_2fr_90px_70px_90px] text-[11px] border-t border-slate-100 items-center ${rowBg}`}
    >
      <div className="p-1 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={readOnly}
        />
      </div>
      <div className="p-1 truncate">{cavo.codice}</div>
      <div className="p-1 truncate">{cavo.descrizione}</div>
      <div className="p-1 text-right">{cavo.metriTotali}</div>
      <div className="p-1 text-right">
        <input
          type="number"
          className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]"
          value={cavo.percentuale ?? ''}
          onChange={e => onPctChange(e.target.value || 0)}
          disabled={readOnly}
        />
      </div>
      <div className="p-1 text-right">{cavo.metriPosati ?? ''}</div>
    </div>
  )
}

/* ===================== PARSE / MERGE HELPERS ===================== */

/**
 * Parse une feuille Excel (array of objects) en liste cavi normalisée.
 * Auto-détection des colonnes: codice, descrizione, metri_totali
 */
function parseCableSheet(rawRows) {
  const keys = Object.keys(rawRows[0] || {}).map(k => k.trim())
  const normalizedKeys = keys.map(k => k.toLowerCase())

  const findKey = regexes => {
    for (let i = 0; i < normalizedKeys.length; i++) {
      const nk = normalizedKeys[i]
      if (regexes.some(rx => rx.test(nk))) return keys[i]
    }
    return null
  }

  const codiceKey =
    findKey([/cod/i, /cavo/i, /cable/i, /sigla/i, /id/i, /rif/i]) || keys[0]

  const descrKey =
    findKey([/descr/i, /desc/i, /tipo/i, /tratta/i, /da-a/i, /from/i]) ||
    keys.find(k => k !== codiceKey) ||
    keys[1]

  const metriKey =
    findKey([/metri/i, /metratura/i, /lunghezza/i, /len/i, /totale/i, /mt/i]) ||
    keys.find(k => isMostlyNumeric(rawRows, k)) ||
    keys[2]

  const out = []
  for (const r of rawRows) {
    const codice = String(r[codiceKey] || '').trim()
    if (!codice) continue

    const descrizione = String(r[descrKey] || '').trim()
    const metriTotali = toNumber(r[metriKey])

    out.push({
      id: null, // assigné après merge
      codice,
      descrizione,
      metriTotali: round2(metriTotali),
      percentuale: 0,
      metriPosati: 0,
    })
  }

  return out
}

/**
 * Merge:
 * - dédoublonne par codice
 * - conserve annotations existantes (% et metriPosati)
 * - met à jour descrizione/metriTotali si besoin
 */
function mergeCaviByCodice(existing, imported) {
  const byCodice = new Map()

  // seed avec existants
  existing.forEach(c => {
    const key = normalizeCodice(c.codice)
    byCodice.set(key, { ...c })
  })

  // merge imports
  imported.forEach(c => {
    const key = normalizeCodice(c.codice)
    const prev = byCodice.get(key)

    if (!prev) {
      byCodice.set(key, { ...c })
      return
    }

    byCodice.set(key, {
      ...prev,
      codice: prev.codice || c.codice,
      descrizione: prev.descrizione || c.descrizione,
      metriTotali:
        Number(prev.metriTotali || 0) > 0
          ? prev.metriTotali
          : c.metriTotali,
      // on garde les annotations de l’existant
      percentuale: Number(prev.percentuale || 0),
      metriPosati: Number(prev.metriPosati || 0),
    })
  })

  // re-id stable
  const merged = Array.from(byCodice.values())
    .sort((a, b) => (a.codice > b.codice ? 1 : -1))
    .map((c, i) => ({
      ...c,
      id: i + 1,
    }))

  return merged
}

function normalizeCodice(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function toNumber(v) {
  if (v == null) return 0
  const s = String(v).replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function isMostlyNumeric(rows, key) {
  let numeric = 0
  let total = 0
  for (const r of rows.slice(0, 30)) {
    const v = toNumber(r[key])
    if (String(r[key] || '').trim() !== '') {
      total++
      if (v !== 0) numeric++
    }
  }
  return total > 0 && numeric / total > 0.6
}

function clampPct(n) {
  return Math.max(0, Math.min(100, Number(n)))
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}
