import React, { useEffect, useMemo, useState } from 'react'
import HomeGate from './components/HomeGate'
import RoleSelect from './components/RoleSelect'
import RapportinoPage from './components/RapportinoPage'
import ArchivioModal from './components/ArchivioModal'
import ConnectionIndicator from './components/ConnectionIndicator'
import { ROLE_OPTIONS } from './App' // si tu as déjà ce fichier, sinon copie la const

import {
  getModel, upsertModel,
  getOrCreateReport, loadReportRows, saveReportFull,
  loadCables, saveCables,
  listOperators, listPatterns, bumpPattern, listArchivio,
} from './services/api'

import { useAuth } from './auth/AuthProvider'

/* helpers templates */
function defaultTemplateForRole(role) {
  // tu réutilises tes templates existants
  if (role === 'CARPENTERIA') return [
    { categoria: 'CARPENTERIA', descrizione: 'PREPARAZIONE STAFFE / STAFFE CAVI', previsto: '8,0' },
  ]
  if (role === 'MONTAGGIO') return [
    { categoria: 'MONTAGGIO', descrizione: 'MONTAGGIO APPARECCHIATURA MINORE DI 50 KG', previsto: '12,0' },
  ]
  return [
    { categoria: 'STESURA', descrizione: 'STESURA CAVI', previsto: '150,0' },
  ]
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
      assegnazioni: [],
      operatori: '',
      tempo: '',
      previsto: r.previsto || '',
      prodotto: '',
      note: '',
    })),
    totaleProdotto: 0,
    giornataSquadra: [],
  }
}

export default function AppShell() {
  const { user, profile, signOut } = useAuth()

  const [view, setView] = useState('home') // home | role | rapportino
  const [showArchivio, setShowArchivio] = useState(false)

  const [data, setData] = useState(() => new Date().toISOString().slice(0,10))
  const [role, setRole] = useState('ELETTRICISTA')

  const [reportId, setReportId] = useState(null)
  const [rapportino, setRapportino] = useState(() =>
    createRapportinoFromTemplate(defaultTemplateForRole('ELETTRICISTA'), profile?.full_name || '')
  )
  const [cavi, setCavi] = useState([])
  const [printCavi, setPrintCavi] = useState(true)

  const [operatorsRegistry, setOperatorsRegistry] = useState([])
  const [patterns, setPatterns] = useState([])
  const [archivio, setArchivio] = useState([])

  const capoName = (profile?.full_name || user?.email || 'CAPO').toUpperCase()
  const capoId = user.id

  /* load global registries */
  useEffect(() => {
    const run = async () => {
      const ops = await listOperators()
      setOperatorsRegistry(ops)
      const pats = await listPatterns(capoId)
      setPatterns(pats)
      const arc = await listArchivio({ capo_id: capoId })
      setArchivio(arc)
    }
    run()
  }, [capoId])

  const handleRoleChoose = async (roleKey, templateFromUI) => {
    // 1) model perso
    const existingModel = await getModel(capoId, roleKey)
    const template = existingModel?.righe?.length
      ? existingModel.righe
      : (templateFromUI || defaultTemplateForRole(roleKey))

    if (!existingModel) {
      await upsertModel(capoId, roleKey, template)
    }

    setRole(roleKey)
    setRapportino(createRapportinoFromTemplate(template, capoName))
    setData(new Date().toISOString().slice(0,10))
    setCavi([])
    setView('rapportino')

    // 2) load/create report in DB
    const rep = await getOrCreateReport({
      date: new Date().toISOString().slice(0,10),
      capoId, capoName, roleKey,
    })
    setReportId(rep.id)

    const rows = await loadReportRows(rep.id)
    if (rows.length) {
      setRapportino(prev => ({ 
        ...prev,
        cost: rep.cost,
        commessa: rep.commessa,
        capoSquadra: rep.capo_name,
        giornataSquadra: rep.giornata_squadra || [],
        totaleProdotto: rep.totale_prodotto || 0,
        righe: rows.map((r, i) => ({
          id: i+1,
          categoria: r.categoria,
          descrizione: r.descrizione,
          assegnazioni: r.assegnazioni || [],
          operatori: r.operatori || '',
          tempo: r.tempo || '',
          previsto: r.previsto || '',
          prodotto: r.prodotto || '',
          note: r.note || '',
        }))
      }))
    }

    if (roleKey === 'ELETTRICISTA') {
      const cables = await loadCables(rep.id)
      setCavi(cables.map(c => ({
        id: c.id,
        codice: c.codice,
        descrizione: c.descrizione,
        metriTotali: c.metri_totali,
        percentuale: c.percentuale,
        metriPosati: c.metri_posati,
        sourceFile: c.source_file,
      })))
    }
  }

  const handleCaviChange = async (newCavi, totaleMetri) => {
    setCavi(newCavi)
    setRapportino(prev => ({ ...prev, totaleProdotto: totaleMetri }))

    if (reportId) {
      await saveCables(reportId, newCavi)
      await saveReportFull(
        reportId,
        { totale_prodotto: totaleMetri },
        rapportino.righe
      )
    }
  }

  const handleSave = async () => {
    if (!reportId) return

    const reportPatch = {
      cost: rapportino.cost,
      commessa: rapportino.commessa,
      capo_name: capoName,
      totale_prodotto: Number(rapportino.totaleProdotto || 0),
      giornata_squadra: rapportino.giornataSquadra || [],
      status: 'DRAFT',
    }

    await saveReportFull(reportId, reportPatch, rapportino.righe)

    // learn patterns
    for (const r of rapportino.righe) {
      const ops = (r.assegnazioni || []).map(a => a.name).sort()
      if (!r.descrizione || ops.length === 0) continue
      const opsKey = ops.join('+')
      await bumpPattern({
        capoId, roleKey: role,
        commessa: (rapportino.commessa || '').toUpperCase(),
        descrizione: r.descrizione.trim().toUpperCase(),
        opsKey, ops
      })
    }

    alert('Salvato su Supabase')
  }

  const handleValidate = async () => {
    if (!reportId) return
    await saveReportFull(
      reportId,
      { status: 'VALIDATED_CAPO', validated_by_capo_at: new Date().toISOString() },
      rapportino.righe
    )
    alert('Validato')
  }

  const handleNewDay = async () => {
    const newDate = new Date().toISOString().slice(0,10)
    setData(newDate)
    const rep = await getOrCreateReport({ date: newDate, capoId, capoName, roleKey: role })
    setReportId(rep.id)
    setRapportino(createRapportinoFromTemplate(defaultTemplateForRole(role), capoName))
    setCavi([])
  }

  if (view === 'home') {
    return (
      <div>
        <div className="no-print bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Logged as <b>{capoName}</b> (CAPO)
            </div>
            <div className="flex items-center gap-3">
              <ConnectionIndicator />
              <button onClick={signOut} className="text-xs px-2 py-1 border rounded">
                Logout
              </button>
            </div>
          </div>
        </div>

        <HomeGate
          capo={capoName}
          setCapo={() => {}}
          capoList={[]}
          onEnterCapo={() => setView('role')}
          ufficioUser=""
          setUfficioUser={() => {}}
          onEnterUfficio={() => {}}
          onEnterDirection={() => {}}
        />
      </div>
    )
  }

  if (view === 'role') {
    return (
      <RoleSelect
        capo={capoName}
        models={{}}           // models perso lues depuis DB
        setModels={() => {}}
        onBack={() => setView('home')}
        onChoose={handleRoleChoose}
      />
    )
  }

  return (
    <>
      <div className="no-print bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {capoName} · {ROLE_OPTIONS.find(r=>r.key===role)?.label}
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <button onClick={signOut} className="text-xs px-2 py-1 border rounded">
              Logout
            </button>
          </div>
        </div>
      </div>

      <RapportinoPage
        data={data}
        setData={setData}
        capo={capoName}
        role={role}
        rapportino={rapportino}
        onChangeRapportino={setRapportino}
        operators={
          operatorsRegistry.reduce((acc,o)=>({ ...acc, [o.name]: o }), {})
        }
        setOperators={() => {}}
        patterns={
          patterns.reduce((acc,p)=>({ ...acc, [p.id]: p }), {})
        }
        setPatterns={() => {}}
        cavi={cavi}
        onCaviChange={handleCaviChange}
        printCavi={printCavi}
        setPrintCavi={setPrintCavi}
        isLockedForCapo={false}
        currentStatus={'DRAFT'}
        ufficioNote={null}
        onBackRole={() => setView('role')}
        onNew={handleNewDay}
        onSave={handleSave}
        onValidate={handleValidate}
        onPrint={() => window.print()}
        onOpenArchivio={() => setShowArchivio(true)}
      >
        {showArchivio && (
          <ArchivioModal
            archivio={archivio.reduce((acc,r)=>({ ...acc, [r.id]: r }), {})}
            currentCapo={capoName}
            currentRole={role}
            onClose={() => setShowArchivio(false)}
            onSelect={async (key) => {
              const rep = archivio.find(x => x.id === key)
              if (!rep) return
              setReportId(rep.id)
              setData(rep.report_date)
              const rows = await loadReportRows(rep.id)
              setRapportino(prev => ({
                ...prev,
                cost: rep.cost,
                commessa: rep.commessa,
                capoSquadra: rep.capo_name,
                giornataSquadra: rep.giornata_squadra || [],
                totaleProdotto: rep.totale_prodotto || 0,
                righe: rows.map((r, i) => ({
                  id: i+1,
                  categoria: r.categoria,
                  descrizione: r.descrizione,
                  assegnazioni: r.assegnazioni || [],
                  operatori: r.operatori || '',
                  tempo: r.tempo || '',
                  previsto: r.previsto || '',
                  prodotto: r.prodotto || '',
                  note: r.note || '',
                }))
              }))
              if (rep.role_key === 'ELETTRICISTA') {
                const cables = await loadCables(rep.id)
                setCavi(cables.map(c => ({
                  id: c.id,
                  codice: c.codice,
                  descrizione: c.descrizione,
                  metriTotali: c.metri_totali,
                  percentuale: c.percentuale,
                  metriPosati: c.metri_posati,
                  sourceFile: c.source_file,
                })))
              }
              setShowArchivio(false)
            }}
          />
        )}
      </RapportinoPage>
    </>
  )
}
