import React, { useEffect, useMemo, useState } from 'react'
import HomeGate from './components/HomeGate'
import RoleSelect from './components/RoleSelect'
import RapportinoPage from './components/RapportinoPage'
import UfficioList from './components/UfficioList'
import UfficioDetail from './components/UfficioDetail'
import ArchivioModal from './components/ArchivioModal'
import DirectionProduction from './components/DirectionProduction'

/* =================== CONSTS =================== */

export const STORAGE_ARCHIVIO_KEY = 'rapportino-v4-archivio'
export const STORAGE_MODELS_KEY = 'rapportino-v4-modelli'
export const STORAGE_OPERATORS_KEY = 'rapportino-v4-operators'
export const STORAGE_ACTIVITY_PATTERNS_KEY = 'rapportino-v4-activity-patterns'
export const STORAGE_OBJECTIVES_KEY = 'rapportino-v4-objectives'

export const ROLE_OPTIONS = [
  { key: 'ELETTRICISTA', label: 'Elettricista' },
  { key: 'CARPENTERIA', label: 'Carpenteria' },
  { key: 'MONTAGGIO', label: 'Montaggio' },
]

export const STATUS_LABELS = {
  DRAFT: 'Bozza',
  VALIDATED_CAPO: 'Validato Capo',
  APPROVED_UFFICIO: 'Approvato Ufficio',
  RETURNED: 'Rimandato',
}

/* =================== STORAGE HELPERS =================== */

const safeLoad = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const safeSave = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

/* =================== DEFAULT TEMPLATES =================== */

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
    case 'CARPENTERIA': return templateCarpenteria()
    case 'MONTAGGIO': return templateMontaggio()
    case 'ELETTRICISTA':
    default: return templateElettricista()
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
      // nouveau: assegnazioni structurées
      assegnazioni: [], // [{name, hours}]
      operatori: '', // string multi-lignes (print)
      tempo: '',      // string multi-lignes (print)
      previsto: r.previsto || '',
      prodotto: '',
      note: '',
    })),
    totaleProdotto: 0,
    giornataSquadra: [], // [{name, roles:[], totalHours, remainingHours}]
  }
}

function makeReportKey(date, capo, role) {
  const safeCapo = (capo || 'CAPO').trim().toUpperCase()
  const safeRole = (role || 'ELETTRICISTA').trim().toUpperCase()
  return `${date}__${safeCapo}__${safeRole}`
}

/* =================== APP =================== */

export default function App() {
  const [archivio, setArchivio] = useState(() => safeLoad(STORAGE_ARCHIVIO_KEY, {}))
  const [models, setModels] = useState(() => safeLoad(STORAGE_MODELS_KEY, {}))
  const [operators, setOperators] = useState(() =>
    safeLoad(STORAGE_OPERATORS_KEY, {
      // base initiale (éditable dans RapportinoPage si tu veux)
      MAIGA: { name: 'MAIGA', roles: ['ELETTRICISTA'] },
      JEAN: { name: 'JEAN', roles: ['ELETTRICISTA', 'CARPENTERIA'] },
    })
  )
  const [patterns, setPatterns] = useState(() =>
    safeLoad(STORAGE_ACTIVITY_PATTERNS_KEY, {})
  )
  const [objectives, setObjectives] = useState(() =>
    safeLoad(STORAGE_OBJECTIVES_KEY, [])
  )

  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [capo, setCapo] = useState('')
  const [role, setRole] = useState('ELETTRICISTA')
  const [rapportino, setRapportino] = useState(() =>
    createRapportinoFromTemplate(templateElettricista(), '')
  )
  const [cavi, setCavi] = useState([])
  const [printCavi, setPrintCavi] = useState(true)

  const [view, setView] = useState('home') 
  // home | role | rapportino | ufficio-list | ufficio-detail | direction
  const [ufficioUser, setUfficioUser] = useState('')
  const [selectedReportKey, setSelectedReportKey] = useState(null)
  const [showArchivio, setShowArchivio] = useState(false)

  // persist local
  useEffect(() => safeSave(STORAGE_ARCHIVIO_KEY, archivio), [archivio])
  useEffect(() => safeSave(STORAGE_MODELS_KEY, models), [models])
  useEffect(() => safeSave(STORAGE_OPERATORS_KEY, operators), [operators])
  useEffect(() => safeSave(STORAGE_ACTIVITY_PATTERNS_KEY, patterns), [patterns])
  useEffect(() => safeSave(STORAGE_OBJECTIVES_KEY, objectives), [objectives])

  const capoList = useMemo(() => Object.keys(models).sort(), [models])

  const reportKey = makeReportKey(data, capo || rapportino.capoSquadra, role)
  const currentEntry = archivio[reportKey]
  const currentStatus = currentEntry?.status || 'DRAFT'
  const isLockedForCapo =
    currentStatus === 'VALIDATED_CAPO' ||
    currentStatus === 'APPROVED_UFFICIO'

  const ufficioNote =
    currentEntry?.ufficioNote && currentStatus === 'RETURNED'
      ? currentEntry.ufficioNote
      : null

  /* ================= handlers ================= */

  const handleCaviChange = (newCavi, totaleMetri) => {
    const totale = Math.round((totaleMetri + Number.EPSILON) * 100) / 100
    setCavi(newCavi)
    setRapportino(prev => ({ ...prev, totaleProdotto: totale }))
  }

  const handleRapportinoChange = nuovo => setRapportino(nuovo)

  const persistArchivio = payload => {
    setArchivio(prev => ({ ...prev, [reportKey]: payload }))
  }

  const handleNewGiornata = () => {
    const name = capo.trim() || rapportino.capoSquadra || 'CAPO'
    const capoModels = models[name] || {}
    const roleKey = role || 'ELETTRICISTA'

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
    const existing = archivio[reportKey]
    const status = existing?.status || 'DRAFT'

    const payload = {
      data,
      capo: name,
      role: roleKey,
      status,
      rapportino,
      cavi,
      validatedByCapoAt: existing?.validatedByCapoAt || null,
      approvedByUfficioAt: existing?.approvedByUfficioAt || null,
      approvedByUfficio: existing?.approvedByUfficio || null,
      ufficioNote: existing?.ufficioNote || null,
      returnedByUfficioAt: existing?.returnedByUfficioAt || null,
      returnedByUfficio: existing?.returnedByUfficio || null,
    }

    persistArchivio(payload)

    // Mise à jour du modèle perso (structure lignes)
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

    alert('Giornata salvata')
  }

  const handleValidateGiornata = () => {
    const existing = archivio[reportKey]
    const name = capo.trim() || rapportino.capoSquadra || 'CAPO'
    const roleKey = role || 'ELETTRICISTA'

    const payload = {
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

    persistArchivio(payload)
    alert('Rapportino validato digitalmente dal Capo.')
  }

  const handleLoadGiornata = key => {
    const item = archivio[key]
    if (!item) return
    setData(item.data)
    setRapportino(item.rapportino)
    setCavi(item.cavi || [])
    setCapo(item.capo || capo)
    setRole(item.role || role)
    setView('rapportino')
    setShowArchivio(false)
  }

  const handlePrint = () => {
    const safeCost = rapportino.cost || 'COST'
    const safeCommessa = rapportino.commessa || 'COMMESSA'
    document.title = `Rapportino_${safeCost}_${safeCommessa}_${data}.pdf`
    window.print()
  }

  /* ================== VIEWS ================== */

  if (view === 'home') {
    return (
      <HomeGate
        capo={capo}
        setCapo={setCapo}
        capoList={capoList}
        onEnterCapo={() => setView('role')}
        ufficioUser={ufficioUser}
        setUfficioUser={setUfficioUser}
        onEnterUfficio={() => setView('ufficio-list')}
        onEnterDirection={() => setView('direction')}
      />
    )
  }

  if (view === 'role') {
    return (
      <RoleSelect
        capo={capo}
        models={models}
        setModels={setModels}
        onBack={() => setView('home')}
        onChoose={(roleKey, template) => {
          const name = capo.trim() || 'CAPO'
          setRole(roleKey)
          setRapportino(createRapportinoFromTemplate(template, name))
          setData(new Date().toISOString().slice(0, 10))
          setCavi([])
          setView('rapportino')
        }}
      />
    )
  }

  if (view === 'ufficio-list') {
    return (
      <UfficioList
        archivio={archivio}
        ufficioUser={ufficioUser}
        onBack={() => setView('home')}
        onSelect={key => {
          setSelectedReportKey(key)
          setView('ufficio-detail')
        }}
      />
    )
  }

  if (view === 'ufficio-detail' && selectedReportKey) {
    return (
      <UfficioDetail
        archivio={archivio}
        setArchivio={setArchivio}
        ufficioUser={ufficioUser}
        reportKey={selectedReportKey}
        onBack={() => setView('ufficio-list')}
      />
    )
  }

  if (view === 'direction') {
    return (
      <DirectionProduction
        archivio={archivio}
        objectives={objectives}
        setObjectives={setObjectives}
        onBack={() => setView('home')}
      />
    )
  }

  // rapportino capo
  return (
    <RapportinoPage
      data={data}
      setData={setData}
      capo={capo}
      role={role}
      rapportino={rapportino}
      onChangeRapportino={handleRapportinoChange}
      operators={operators}
      setOperators={setOperators}
      patterns={patterns}
      setPatterns={setPatterns}
      cavi={cavi}
      onCaviChange={handleCaviChange}
      printCavi={printCavi}
      setPrintCavi={setPrintCavi}
      isLockedForCapo={isLockedForCapo}
      currentStatus={currentStatus}
      ufficioNote={ufficioNote}
      onBackRole={() => setView('role')}
      onNew={handleNewGiornata}
      onSave={handleSaveGiornata}
      onValidate={handleValidateGiornata}
      onPrint={handlePrint}
      onOpenArchivio={() => setShowArchivio(true)}
    >
      {showArchivio && (
        <ArchivioModal
          archivio={archivio}
          currentCapo={capo}
          currentRole={role}
          onClose={() => setShowArchivio(false)}
          onSelect={handleLoadGiornata}
        />
      )}
    </RapportinoPage>
  )
}
