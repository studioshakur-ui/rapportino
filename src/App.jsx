import React, { useState } from 'react'
import RapportinoSheet from './components/RapportinoSheet'
import CablePanel from './components/CablePanel'
import ArchivioModal from './components/ArchivioModal'

const STORAGE_ARCHIVIO_KEY = 'rapportino-v3-archivio'
const STORAGE_MODELS_KEY = 'rapportino-v3-modelli'

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

/* ===================== ARCHIVIO BLINDATO ===================== */
/**
 * Clé unique d’un rapport: date + capo + role
 * => un capo peut être approuvé sur Elettricista mais pas sur Carpenteria, etc.
 */
function makeArchivioKey(date, capo, role) {
  const d = date || ''
  const c = (capo || '').trim().toUpperCase() || 'CAPO'
  const r = role || 'ELETTRICISTA'
  return `${d}__${c}__${r}`
}

// Migration douce si anciens items étaient stockés seulement par date.
function migrateOldArchivio(rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return {}
  const migrated = {}
  for (const [k, v] of Object.entries(rawObj)) {
    if (k.includes('__')) {
      migrated[k] = v
    } else {
      const capo = v?.capo || v?.rapportino?.capoSquadra || 'CAPO'
      const role = v?.role || 'ELETTRICISTA'
      const newKey = makeArchivioKey(k, capo, role)
      migrated[newKey] = { ...v, data: k, capo, role }
    }
  }
  return migrated
}

function loadArchivio() {
  try {
    const raw = localStorage.getItem(STORAGE_ARCHIVIO_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return migrateOldArchivio(parsed)
  } catch {
    return {}
  }
}

function saveArchivio(archivio) {
  localStorage.setItem(STORAGE_ARCHIVIO_KEY, JSON.stringify(archivio))
}

function loadModels() {
  try {
    const raw = localStorage.getItem(STORAGE_MODELS_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveModels(models) {
  localStorage.setItem(STORAGE_MODELS_KEY, JSON.stringify(models))
}

/** Modèles par rôle */
function templateElettricista() {
  return [
    { categoria: 'STESURA', descrizione: 'STESURA CAVI', previsto: '150,0' },
    { categoria: 'STESURA', descrizione: 'FASCETTATURA CAVI', previsto: '600,0' },
    { categoria: 'STESURA', descrizione: 'RIPRESA CAVI', previsto: '150,0' },
    { categoria: 'STESURA', descrizione: 'VARI STESURA CAVI', previsto: '0,2' },
  ]
}

function templateCarpenteria() {
  return [
    { categoria: 'CARPENTERIA', descrizione: 'PREPARAZIONE STAFFE / STAFFE CAVI', previsto: '8,0' },
    { categoria: 'CARPENTERIA', descrizione: 'SALDATURA STAFFE STRADE CAVI', previsto: '8,0' },
    { categoria: 'CARPENTERIA', descrizione: 'TRACCIATURA KIEPE / COLLARI', previsto: '7,0' },
    { categoria: 'CARPENTERIA', descrizione: 'SALDATURA KIEPE / COLLARI', previsto: '8,0' },
    { categoria: 'CARPENTERIA', descrizione: 'MOLATURA KIEPE', previsto: '4,0' },
    { categoria: 'CARPENTERIA', descrizione: 'MOLATURA STAFFE / TONDINI / BASAMENTI', previsto: '8,0' },
    { categoria: 'CARPENTERIA', descrizione: 'VARIE CARPENTERIE', previsto: '0,2' },
  ]
}

function templateMontaggio() {
  return [
    { categoria: 'IMBARCHI', descrizione: 'VARI IMBARCHI (LOGISTICA E TRASPORTO)', previsto: '0,2' },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA MINORE DI 50 KG', previsto: '12,0' },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA DA 51 KG A 150 KG', previsto: '1,0' },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA DA 151 KG A 400 KG', previsto: '1,0' },
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA DA 401 KG A 1400 KG', previsto: '0,1' },
  ]
}

function defaultTemplateForRole(role) {
  switch (role) {
    case 'CARPENTERIA':
      return templateCarpenteria()
    case 'MONTAGGIO':
      return templateMontaggio()
    case 'ELETTRICISTA':
    default:
      return templateElettricista()
  }
}

function createRapportinoFromTemplate(template, capoName) {
  return {
    cost: '',
    commessa: 'SDC',
    capoSquadra: capoName || '',
    righe: template.map((r, idx) => ({
      id: idx + 1,
      categoria: r.categoria || '',
      descrizione: r.descrizione || '',
      operatori: '',
      tempo: '',
      previsto: r.previsto || '',
      prodotto: '',
      note: '',
    })),
    totaleProdotto: 0,
  }
}

export default function App() {
  const [archivio, setArchivio] = useState(loadArchivio)
  const [models, setModels] = useState(loadModels)

  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [capo, setCapo] = useState('')
  const [role, setRole] = useState('ELETTRICISTA')
  const [view, setView] = useState('home') // home | role | rapportino | ufficio-list | ufficio-detail

  const [rapportino, setRapportino] = useState(() =>
    createRapportinoFromTemplate(templateElettricista(), '')
  )
  const [cavi, setCavi] = useState([])
  const [printCavi, setPrintCavi] = useState(true)

  const [showArchivio, setShowArchivio] = useState(false)

  const [ufficioUser, setUfficioUser] = useState('')
  const [selectedReportKey, setSelectedReportKey] = useState(null)
  const [ufficioStatusFilter, setUfficioStatusFilter] = useState('VALIDATED_CAPO')

  const capoList = Object.keys(models).sort()

  const handleCaviChange = (newCavi, totaleMetri) => {
    const totale = Math.round((totaleMetri + Number.EPSILON) * 100) / 100
    setCavi(newCavi)
    setRapportino(prev => ({
      ...prev,
      totaleProdotto: totale,
    }))
  }

  const handleRapportinoChange = nuovo => {
    setRapportino(nuovo)
  }

  // clé courante (blindage)
  const currentCapoName = capo.trim() || rapportino.capoSquadra || 'CAPO'
  const currentKey = makeArchivioKey(data, currentCapoName, role)
  const currentEntry = archivio[currentKey]
  const currentStatus = currentEntry?.status || 'DRAFT'

  /* ================= HOME ================= */

  if (view === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Carte Capo */}
          <div className="bg-white shadow-lg rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">PERCORSO</h1>
              <p className="text-sm text-slate-500">
                Accesso al modulo <span className="font-semibold">RAPPORTINO</span> – Capo Squadra.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Capo Squadra
              </label>
              <input
                list="capo-list"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Es. MAIGA, LO GIUDICE..."
                value={capo}
                onChange={e => setCapo(e.target.value.toUpperCase())}
              />
              <datalist id="capo-list">
                {capoList.map(nome => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
              <p className="text-xs text-slate-500">
                Scrivi il tuo nome (o scegli dalla lista) per usare i tuoi modelli personali.
              </p>
            </div>

            <button
              onClick={() => {
                if (!capo.trim()) {
                  alert('Inserisci il nome del Capo Squadra')
                  return
                }
                setView('role')
              }}
              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700"
            >
              Entra come Capo Squadra
            </button>

            <div className="border border-dashed border-slate-300 rounded-lg px-4 py-3 text-xs text-slate-500">
              <div className="font-semibold mb-1">Percorso</div>
              <div>Modulo principale in sviluppo…</div>
              <div className="italic">Coming soon</div>
            </div>
          </div>

          {/* Carte Ufficio */}
          <div className="bg-white shadow-lg rounded-2xl p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Ufficio tecnico</h2>
              <p className="text-sm text-slate-500">
                Verifica, approvazione o rimando dei rapportini digitali.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Operatore Ufficio
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Es. VINCENZO, RESPONSABILE..."
                value={ufficioUser}
                onChange={e => setUfficioUser(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-slate-500">
                Nome usato per registrare chi approva o rimanda i rapportini.
              </p>
            </div>

            <button
              onClick={() => {
                if (!ufficioUser.trim()) {
                  alert("Inserisci il nome dell'operatore Ufficio")
                  return
                }
                setView('ufficio-list')
              }}
              className="w-full inline-flex items-center justify-center rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-900"
            >
              Entra come Ufficio tecnico
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ============ CHOIX RÔLE (CAPO) ============ */

  if (view === 'role') {
    const capoName = capo.trim()

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-1">
                Ciao {capoName || 'Capo'} 👋
              </h2>
              <p className="text-sm text-slate-500">
                Scegli il tipo di squadra per il tuo rapportino di oggi.
              </p>
            </div>
            <button
              onClick={() => setView('home')}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Cambia Capo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  const rKey = opt.key
                  const name = capoName || 'CAPO'

                  const capoModels = models[name] || {}
                  const existing =
                    capoModels[rKey]?.righe && capoModels[rKey].righe.length > 0
                      ? capoModels[rKey].righe
                      : null

                  const template = existing || defaultTemplateForRole(rKey)

                  if (!existing) {
                    const updatedModels = {
                      ...models,
                      [name]: {
                        ...(models[name] || {}),
                        [rKey]: { righe: template },
                      },
                    }
                    setModels(updatedModels)
                    saveModels(updatedModels)
                  }

                  setRole(rKey)
                  setRapportino(createRapportinoFromTemplate(template, name))
                  setData(new Date().toISOString().slice(0, 10))
                  setCavi([])
                  setView('rapportino')
                }}
                className="border border-slate-200 rounded-xl px-4 py-6 text-left hover:border-emerald-500 hover:shadow-sm flex flex-col justify-between"
              >
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="mt-2 text-[11px] text-slate-500">
                  Modello preconfigurato per {opt.label.toLowerCase()}, modificabile secondo le tue esigenze.
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ============ VUE UFFICIO – LISTE ============ */

  if (view === 'ufficio-list') {
    const entries = Object.entries(archivio)
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => (a.data < b.data ? 1 : -1))

    const filtered = entries.filter(e =>
      ufficioStatusFilter === 'ALL' ? true : e.status === ufficioStatusFilter
    )

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('home')}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
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
                value={ufficioStatusFilter}
                onChange={e => setUfficioStatusFilter(e.target.value)}
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
                      onClick={() => {
                        setSelectedReportKey(item.key)
                        setView('ufficio-detail')
                      }}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">{item.data}</td>
                      <td className="px-3 py-1.5">{item.capo}</td>
                      <td className="px-3 py-1.5">
                        {ROLE_OPTIONS.find(r => r.key === item.role)?.label || item.role}
                      </td>
                      <td className="px-3 py-1.5">{item.rapportino?.commessa || ''}</td>
                      <td className="px-3 py-1.5">
                        {STATUS_LABELS[item.status] || item.status}
                      </td>
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

  /* ============ VUE UFFICIO – DETAIL ============ */

  if (view === 'ufficio-detail' && selectedReportKey) {
    const item = archivio[selectedReportKey]
    if (!item) {
      setView('ufficio-list')
      return null
    }

    const handleApprove = () => {
      const updated = {
        ...archivio,
        [selectedReportKey]: {
          ...item,
          status: 'APPROVED_UFFICIO',
          approvedByUfficioAt: new Date().toISOString(),
          approvedByUfficio: ufficioUser,
        },
      }
      setArchivio(updated)
      saveArchivio(updated)
      alert('Rapportino approvato.')
      setView('ufficio-list')
    }

    const handleReturn = () => {
      const motivo = window.prompt('Motivo del rimando (sarà visibile al Capo):')
      if (!motivo) return
      const updated = {
        ...archivio,
        [selectedReportKey]: {
          ...item,
          status: 'RETURNED',
          ufficioNote: motivo,
          returnedByUfficioAt: new Date().toISOString(),
          returnedByUfficio: ufficioUser,
        },
      }
      setArchivio(updated)
      saveArchivio(updated)
      alert('Rapportino rimandato al Capo.')
      setView('ufficio-list')
    }

    const ruoloLabel =
      ROLE_OPTIONS.find(r => r.key === item.role)?.label || item.role

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('ufficio-list')}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                ← Elenco
              </button>
              <h1 className="text-lg font-semibold">
                Verifica rapportino – {item.data}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span>Capo: <span className="font-semibold">{item.capo}</span></span>
              <span>Ruolo: <span className="font-semibold">{ruoloLabel}</span></span>
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  item.status === 'APPROVED_UFFICIO'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : item.status === 'RETURNED'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-slate-50 border-slate-300 text-slate-600'
                }`}
              >
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

          {item.role === 'ELETTRICISTA' && item.cavi && item.cavi.length > 0 && (
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

  /* ============ VUE RAPPORTINO (CAPO) ============ */

  const handleNewGiornata = () => {
    const name = capo.trim() || rapportino.capoSquadra || 'CAPO'
    const roleKey = role || 'ELETTRICISTA'
    const capoModels = models[name] || {}

    const existing =
      capoModels[roleKey]?.righe && capoModels[roleKey].righe.length > 0
        ? capoModels[roleKey].righe
        : null

    const template = existing || defaultTemplateForRole(roleKey)

    setRapportino(createRapportinoFromTemplate(template, name))
    setCavi([])
    setData(new Date().toISOString().slice(0, 10))
  }

  const handleSaveGiornata = () => {
    const name = capo.trim() || rapportino.capoSquadra || 'CAPO'
    const roleKey = role || 'ELETTRICISTA'
    const key = makeArchivioKey(data, name, roleKey)

    const existing = archivio[key]
    const statusToKeep = existing?.status || 'DRAFT'

    const nuovo = {
      data,
      capo: name,
      role: roleKey,
      status: statusToKeep,
      rapportino,
      cavi,
      validatedByCapoAt: existing?.validatedByCapoAt || null,
      approvedByUfficioAt: existing?.approvedByUfficioAt || null,
      approvedByUfficio: existing?.approvedByUfficio || null,
      ufficioNote: existing?.ufficioNote || null,
      returnedByUfficioAt: existing?.returnedByUfficioAt || null,
      returnedByUfficio: existing?.returnedByUfficio || null,
    }

    const nuovoArchivio = { ...archivio, [key]: nuovo }
    setArchivio(nuovoArchivio)
    saveArchivio(nuovoArchivio)

    // Mise à jour du modèle propre au capo + rôle
    const strutturaRighe = rapportino.righe.map(r => ({
      categoria: r.categoria,
      descrizione: r.descrizione,
      previsto: r.previsto,
    }))

    const updatedModels = {
      ...models,
      [name]: {
        ...(models[name] || {}),
        [roleKey]: { righe: strutturaRighe },
      },
    }
    setModels(updatedModels)
    saveModels(updatedModels)

    alert('Giornata salvata')
  }

  const handleValidateGiornata = () => {
    const name = capo.trim() || rapportino.capoSquadra || 'CAPO'
    const roleKey = role || 'ELETTRICISTA'
    const key = makeArchivioKey(data, name, roleKey)

    const existing = archivio[key]

    const nuovo = {
      data,
      capo: name,
      role: roleKey,
      status: 'VALIDATED_CAPO',
      rapportino,
      cavi,
      validatedByCapoAt: new Date().toISOString(),
      approvedByUfficioAt: existing?.approvedByUfficioAt || null,
      approvedByUfficio: existing?.approvedByUfficio || null,
      ufficioNote: existing?.ufficioNote || null,
      returnedByUfficioAt: existing?.returnedByUfficioAt || null,
      returnedByUfficio: existing?.returnedByUfficio || null,
    }

    const nuovoArchivio = { ...archivio, [key]: nuovo }
    setArchivio(nuovoArchivio)
    saveArchivio(nuovoArchivio)
    alert('Rapportino validato digitalmente dal Capo.')
  }

  const handleLoadGiornata = (keyOrDate) => {
    // ArchivioModal te passera la clé complète
    const item = archivio[keyOrDate]
    if (!item) return

    setData(item.data)
    setRapportino(item.rapportino)
    setCavi(item.cavi || [])
    if (item.capo) setCapo(item.capo)
    if (item.role) setRole(item.role)
    setView('rapportino')
    setShowArchivio(false)
  }

  const handlePrint = () => {
    const safeCost = rapportino.cost || 'COST'
    const safeCommessa = rapportino.commessa || 'COMMESSA'
    const name = `Rapportino_${safeCost}_${safeCommessa}_${data}.pdf`
    document.title = name
    window.print()
  }

  const currentRoleLabel =
    ROLE_OPTIONS.find(r => r.key === role)?.label || 'Elettricista'

  const statusBadgeClass =
    currentStatus === 'APPROVED_UFFICIO'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
      : currentStatus === 'VALIDATED_CAPO'
      ? 'bg-sky-50 border-sky-300 text-sky-700'
      : currentStatus === 'RETURNED'
      ? 'bg-amber-50 border-amber-300 text-amber-700'
      : 'bg-slate-50 border-slate-300 text-slate-600'

  const ufficioNote =
    currentEntry?.ufficioNote && currentStatus === 'RETURNED'
      ? currentEntry.ufficioNote
      : null

  // verrouillage blindé uniquement pour CE capo + CE rôle + CE jour
  const isLockedForCapo =
    currentStatus === 'VALIDATED_CAPO' || currentStatus === 'APPROVED_UFFICIO'

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Barre d’actions – écran seulement */}
      <header className="border-b bg-white shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('role')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ← Indietro
            </button>
            <span className="font-semibold text-lg tracking-tight">
              Rapportino V3
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
              onClick={handleNewGiornata}
              className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-100"
              disabled={isLockedForCapo}
            >
              Nuova giornata
            </button>
            <button
              onClick={() => setShowArchivio(true)}
              className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-100"
            >
              Archivio
            </button>
            <button
              onClick={handleSaveGiornata}
              className="text-xs px-3 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              Salva
            </button>
            <button
              onClick={handleValidateGiornata}
              className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={currentStatus === 'APPROVED_UFFICIO'}
            >
              Valida giornata
            </button>
            <button
              onClick={handlePrint}
              className="text-xs px-3 py-1 rounded bg-slate-800 text-white hover:bg-slate-900"
            >
              Stampa
            </button>
          </div>
        </div>

        {/* Option impression cavi + note ufficio */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex items-center justify-between gap-4 no-print">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={printCavi}
              onChange={e => setPrintCavi(e.target.checked)}
            />
            <span>Includi lista cavi nella stampa (pagine successive)</span>
          </label>

          {ufficioNote && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <span className="font-semibold">Nota Ufficio:&nbsp;</span>
              {ufficioNote}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 print:max-w-none print:px-0 print:py-0">
          {/* Bloc Rapportino */}
          <div className="bg-white shadow-sm rounded-xl p-6 print:shadow-none print:rounded-none print:p-2">
            {/* Header impression (logos) */}
            <div className="print-only mb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src="/conit-logo.png" alt="CONIT" className="w-16 h-auto" />
                  <span className="font-semibold text-lg">CONIT</span>
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-bold uppercase">
                    Rapportino Giornaliero
                  </h1>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-sm">
                    Shakur – Ingegneria Digitale
                  </span>
                </div>
              </div>
            </div>

            <RapportinoSheet
              data={data}
              rapportino={rapportino}
              role={role}
              readOnly={isLockedForCapo}
              onChange={handleRapportinoChange}
            />
          </div>

          {/* Lista cavi en bas (écran seulement) */}
          {role === 'ELETTRICISTA' && (
            <div className="bg-white shadow-sm rounded-xl p-4 no-print">
              <CablePanel
                cavi={cavi}
                onCaviChange={handleCaviChange}
              />
            </div>
          )}
        </div>

        {/* Liste cavi imprimable pages suivantes (sans %0) */}
        {role === 'ELETTRICISTA' && cavi.length > 0 && printCavi && (
          <div className="print-only page-break-before px-4">
            <h2 className="text-sm font-semibold mb-2">
              Lista cavi del giorno – {data}
            </h2>

            {cavi.filter(c => Number(c.percentuale || 0) > 0).length === 0 ? (
              <div className="text-[11px] text-slate-500 italic">
                Nessun cavo con % posa &gt; 0 da stampare.
              </div>
            ) : (
              <table className="w-full text-[11px] rapportino-table border border-slate-600 border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-600 px-1 py-1 text-left">Codice</th>
                    <th className="border border-slate-600 px-1 py-1 text-left">Descrizione</th>
                    <th className="border border-slate-600 px-1 py-1 text-right">Metri totali</th>
                    <th className="border border-slate-600 px-1 py-1 text-right">% posa</th>
                    <th className="border border-slate-600 px-1 py-1 text-right">Metri posati</th>
                  </tr>
                </thead>
                <tbody>
                  {cavi
                    .filter(c => Number(c.percentuale || 0) > 0)
                    .map(c => (
                      <tr key={c.id} className="border-t border-slate-300">
                        <td className="border border-slate-300 px-1 py-1">{c.codice}</td>
                        <td className="border border-slate-300 px-1 py-1">{c.descrizione}</td>
                        <td className="border border-slate-300 px-1 py-1 text-right">{c.metriTotali}</td>
                        <td className="border border-slate-300 px-1 py-1 text-right">{c.percentuale}%</td>
                        <td className="border border-slate-300 px-1 py-1 text-right">{c.metriPosati}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Footer Shakur – impression seulement */}
      <footer className="print-only text-right text-[10px] text-slate-500 mt-1 pr-2">
        Rapportino – Shakur Studio ©
      </footer>

      {showArchivio && (
        <ArchivioModal
          archivio={archivio}
          currentCapo={capo}
          currentRole={role}
          onClose={() => setShowArchivio(false)}
          onSelect={handleLoadGiornata}
        />
      )}
    </div>
  )
}
