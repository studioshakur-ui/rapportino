import React, { useEffect, useMemo, useState } from 'react'
import RapportinoSheet from './components/RapportinoSheet'
import CablePanel from './components/CablePanel'
import ArchivioModal from './components/ArchivioModal'
import AuthScreen from './components/AuthScreen'
import { supabase } from './lib/supabaseClient'

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
      operai: [{ nome: '', tempo: '' }],
      previsto: r.previsto || '',
      prodotto: '',
      note: '',
    })),
    totaleProdotto: 0,
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(true)

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
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [ufficioStatusFilter, setUfficioStatusFilter] = useState('VALIDATED_CAPO')
  const [ufficioList, setUfficioList] = useState([])
  const [ufficioLoading, setUfficioLoading] = useState(false)

  const capoName = capo.trim() || rapportino.capoSquadra || profile?.full_name || 'CAPO'

  /* ===================== BOOT SESSION ===================== */
  useEffect(() => {
    const init = async () => {
      const { data: sess } = await supabase.auth.getSession()
      setSession(sess.session || null)
      if (sess.session) {
        const { data: prof } = await supabase.from('profiles').select('*').single()
        setProfile(prof || null)
      }
      setBooting(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      if (s) {
        const { data: prof } = await supabase.from('profiles').select('*').single()
        setProfile(prof || null)
      } else {
        setProfile(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-sm text-slate-500">
        Avvio Rapportino...
      </div>
    )
  }

  if (!session) return <AuthScreen />

  const isUfficio = profile?.app_role === 'UFFICIO' || profile?.app_role === 'ADMIN'

  /* ===================== HELPERS CLOUD ===================== */
  const fetchModelForRole = async roleKey => {
    const { data: model, error } = await supabase
      .from('models')
      .select('*')
      .eq('role', roleKey)
      .maybeSingle()
    if (error) throw error

    if (model?.righe && model.righe.length > 0) return model.righe

    const template = defaultTemplateForRole(roleKey)
    const { error: upErr } = await supabase
      .from('models')
      .upsert({ role: roleKey, righe: template }, { onConflict: 'capo_id,role' })
    if (upErr) throw upErr
    return template
  }

  const upsertRapportinoCloud = async (statusToSet = null) => {
    // 1) Upsert main rapportino
    const basePayload = {
      data,
      capo_name: capoName,
      role,
      status: statusToSet || 'DRAFT',
      cost: rapportino.cost || null,
      commessa: rapportino.commessa || null,
      totale_prodotto: Number(rapportino.totaleProdotto || 0),
      validated_by_capo_at: statusToSet === 'VALIDATED_CAPO' ? new Date().toISOString() : null,
    }

    const { data: saved, error } = await supabase
      .from('rapportini')
      .upsert(basePayload, { onConflict: 'data,capo_id,role' })
      .select()
      .single()
    if (error) throw error
    const rapportinoId = saved.id

    // 2) Replace righe
    await supabase.from('rapportino_righe').delete().eq('rapportino_id', rapportinoId)
    const righePayload = (rapportino.righe || []).map((r, i) => ({
      rapportino_id: rapportinoId,
      idx: i,
      categoria: r.categoria || null,
      descrizione: r.descrizione || null,
      previsto: r.previsto || null,
      prodotto: r.prodotto || null,
      note: r.note || null,
      operai: Array.isArray(r.operai) ? r.operai : [],
    }))
    if (righePayload.length) {
      const { error: e2 } = await supabase.from('rapportino_righe').insert(righePayload)
      if (e2) throw e2
    }

    // 3) Replace cavi
    await supabase.from('rapportino_cavi').delete().eq('rapportino_id', rapportinoId)
    const caviPayload = (cavi || []).map(c => ({
      rapportino_id: rapportinoId,
      codice: c.codice,
      descrizione: c.descrizione || null,
      metri_totali: Number(c.metriTotali || 0),
      percentuale: Number(c.percentuale || 0),
      metri_posati: Number(c.metriPosati || 0),
    }))
    if (caviPayload.length) {
      const { error: e3 } = await supabase.from('rapportino_cavi').insert(caviPayload)
      if (e3) throw e3
    }

    return saved
  }

  const loadRapportinoById = async id => {
    const { data: main, error } = await supabase
      .from('rapportini')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error

    const { data: righeDb } = await supabase
      .from('rapportino_righe')
      .select('*')
      .eq('rapportino_id', id)
      .order('idx', { ascending: true })

    const { data: caviDb } = await supabase
      .from('rapportino_cavi')
      .select('*')
      .eq('rapportino_id', id)
      .order('id', { ascending: true })

    setData(main.data)
    setCapo(main.capo_name)
    setRole(main.role)

    setRapportino({
      cost: main.cost || '',
      commessa: main.commessa || '',
      capoSquadra: main.capo_name || '',
      righe: (righeDb || []).map((r, i) => ({
        id: i + 1,
        categoria: r.categoria || '',
        descrizione: r.descrizione || '',
        operai: r.operai || [{ nome: '', tempo: '' }],
        previsto: r.previsto || '',
        prodotto: r.prodotto || '',
        note: r.note || '',
      })),
      totaleProdotto: Number(main.totale_prodotto || 0),
    })

    setCavi((caviDb || []).map((c, i) => ({
      id: i + 1,
      codice: c.codice,
      descrizione: c.descrizione || '',
      metriTotali: Number(c.metri_totali || 0),
      percentuale: Number(c.percentuale || 0),
      metriPosati: Number(c.metri_posati || 0),
    }))

    setView('rapportino')
  }

  const refreshUfficioList = async () => {
    setUfficioLoading(true)
    const query = supabase
      .from('rapportini')
      .select('id,data,capo_name,role,commessa,status,totale_prodotto')
      .order('data', { ascending: false })
      .limit(500)

    if (ufficioStatusFilter !== 'ALL') {
      query.eq('status', ufficioStatusFilter)
    }

    const { data, error } = await query
    setUfficioLoading(false)
    if (error) return alert(error.message)
    setUfficioList(data || [])
  }

  /* ===================== UI HANDLERS ===================== */
  const handleCaviChange = (newCavi, totaleMetri) => {
    const totale = round2(totaleMetri)
    setCavi(newCavi)
    setRapportino(prev => ({ ...prev, totaleProdotto: totale }))
  }

  const handleRapportinoChange = nuovo => setRapportino(nuovo)

  const handleNewGiornata = async () => {
    const template = await fetchModelForRole(role)
    setRapportino(createRapportinoFromTemplate(template, capoName))
    setCavi([])
    setData(new Date().toISOString().slice(0, 10))
  }

  const handleSaveGiornata = async () => {
    try {
      await upsertRapportinoCloud()
      alert('Giornata salvata in cloud')
    } catch (e) {
      alert(e.message)
    }
  }

  const handleValidateGiornata = async () => {
    try {
      await upsertRapportinoCloud('VALIDATED_CAPO')
      alert('Rapportino validato dal Capo.')
    } catch (e) {
      alert(e.message)
    }
  }

  const handlePrint = () => {
    const safeCost = rapportino.cost || 'COST'
    const safeCommessa = rapportino.commessa || 'COMMESSA'
    document.title = `Rapportino_${safeCost}_${safeCommessa}_${data}.pdf`
    window.print()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  /* ===================== CLOUD STATUS (pour locking) ===================== */
  const [cloudStatus, setCloudStatus] = useState('DRAFT')
  const [cloudUfficioNote, setCloudUfficioNote] = useState(null)

  useEffect(() => {
    const run = async () => {
      const { data: main } = await supabase
        .from('rapportini')
        .select('status, ufficio_note')
        .eq('data', data)
        .eq('role', role)
        .maybeSingle()

      setCloudStatus(main?.status || 'DRAFT')
      setCloudUfficioNote(main?.status === 'RETURNED' ? main?.ufficio_note : null)
    }
    run()
  }, [data, role])

  const isLockedForCapo = cloudStatus === 'VALIDATED_CAPO' || cloudStatus === 'APPROVED_UFFICIO'

  const statusBadgeClass =
    cloudStatus === 'APPROVED_UFFICIO'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
      : cloudStatus === 'VALIDATED_CAPO'
      ? 'bg-sky-50 border-sky-300 text-sky-700'
      : cloudStatus === 'RETURNED'
      ? 'bg-amber-50 border-amber-300 text-amber-700'
      : 'bg-slate-50 border-slate-300 text-slate-600'

  /* ===================== HOME ===================== */
  if (view === 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Capo */}
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
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Es. MAIGA, LO GIUDICE..."
                value={capo}
                onChange={e => setCapo(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-slate-500">
                Il tuo nome sarà associato ai rapportini cloud.
              </p>
            </div>

            <button
              onClick={() => {
                if (!capo.trim()) return alert('Inserisci il nome del Capo Squadra')
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

          {/* Ufficio */}
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
              {!isUfficio && (
                <p className="text-[11px] text-amber-700">
                  Il tuo account non è Ufficio: chiedi admin per il ruolo.
                </p>
              )}
            </div>

            <button
              onClick={async () => {
                if (!isUfficio) return alert('Account non autorizzato Ufficio.')
                if (!ufficioUser.trim()) return alert("Inserisci il nome dell'operatore Ufficio")
                await refreshUfficioList()
                setView('ufficio-list')
              }}
              className="w-full inline-flex items-center justify-center rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-900"
            >
              Entra come Ufficio tecnico
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-xs px-3 py-2 rounded border border-slate-300 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ===================== ROLE CHOICE ===================== */
  if (view === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-1">
                Ciao {capoName} 👋
              </h2>
              <p className="text-sm text-slate-500">
                Scegli il tipo di squadra per il rapportino.
              </p>
            </div>
            <button
              onClick={() => setView('home')}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Indietro
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={async () => {
                  try {
                    const template = await fetchModelForRole(opt.key)
                    setRole(opt.key)
                    setRapportino(createRapportinoFromTemplate(template, capoName))
                    setData(new Date().toISOString().slice(0, 10))
                    setCavi([])
                    setView('rapportino')
                  } catch (e) {
                    alert(e.message)
                  }
                }}
                className="border border-slate-200 rounded-xl px-4 py-6 text-left hover:border-emerald-500 hover:shadow-sm flex flex-col justify-between"
              >
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="mt-2 text-[11px] text-slate-500">
                  Modello preconfigurato, personalizzabile.
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ===================== UFFICIO LIST ===================== */
  if (view === 'ufficio-list') {
    const filtered = ufficioList.filter(e =>
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
                onChange={async e => {
                  setUfficioStatusFilter(e.target.value)
                  await refreshUfficioList()
                }}
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
            {ufficioLoading ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                Caricamento...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                Nessun rapportino trovato.
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
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedReportId(item.id)
                        setView('ufficio-detail')
                      }}
                    >
                      <td className="px-3 py-1.5">{item.data}</td>
                      <td className="px-3 py-1.5">{item.capo_name}</td>
                      <td className="px-3 py-1.5">
                        {ROLE_OPTIONS.find(r => r.key === item.role)?.label || item.role}
                      </td>
                      <td className="px-3 py-1.5">{item.commessa || ''}</td>
                      <td className="px-3 py-1.5">
                        {STATUS_LABELS[item.status] || item.status}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {Number(item.totale_prodotto || 0).toFixed(2)}
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

  /* ===================== UFFICIO DETAIL ===================== */
  if (view === 'ufficio-detail' && selectedReportId) {
    const [detail, setDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(true)

    useEffect(() => {
      const run = async () => {
        setDetailLoading(true)
        const { data, error } = await supabase
          .from('rapportini')
          .select('*')
          .eq('id', selectedReportId)
          .single()
        setDetailLoading(false)
        if (error) return alert(error.message)
        setDetail(data)
      }
      run()
    }, [selectedReportId])

    if (detailLoading || !detail) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 text-sm text-slate-500">
          Caricamento dettaglio...
        </div>
      )
    }

    const handleApprove = async () => {
      const { error } = await supabase
        .from('rapportini')
        .update({
          status: 'APPROVED_UFFICIO',
          approved_by_ufficio_at: new Date().toISOString(),
          approved_by_ufficio: session.user.id,
        })
        .eq('id', selectedReportId)
      if (error) return alert(error.message)
      alert('Rapportino approvato.')
      await refreshUfficioList()
      setView('ufficio-list')
    }

    const handleReturn = async () => {
      const motivo = window.prompt('Motivo del rimando (visibile al Capo):')
      if (!motivo) return
      const { error } = await supabase
        .from('rapportini')
        .update({
          status: 'RETURNED',
          ufficio_note: motivo,
          returned_by_ufficio_at: new Date().toISOString(),
          returned_by_ufficio: session.user.id,
        })
        .eq('id', selectedReportId)
      if (error) return alert(error.message)
      alert('Rapportino rimandato al Capo.')
      await refreshUfficioList()
      setView('ufficio-list')
    }

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
                Verifica rapportino – {detail.data}
              </h1>
            </div>
            <div className="text-xs text-slate-500">
              Capo: <span className="font-semibold">{detail.capo_name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <button
              className="text-xs mb-2 px-2 py-1 border rounded hover:bg-slate-50"
              onClick={() => loadRapportinoById(selectedReportId)}
            >
              Apri in lettura
            </button>
          </div>

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

  /* ===================== RAPPORTINO VIEW ===================== */
  const currentRoleLabel =
    ROLE_OPTIONS.find(r => r.key === role)?.label || 'Elettricista'

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="border-b bg-white shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('role')} className="text-xs text-slate-500 hover:text-slate-800">
              ← Indietro
            </button>
            <span className="font-semibold text-lg tracking-tight">Rapportino Cloud</span>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={data}
              onChange={e => setData(e.target.value)}
            />
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {currentRoleLabel}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
              {STATUS_LABELS[cloudStatus] || cloudStatus}
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
              disabled={cloudStatus === 'APPROVED_UFFICIO'}
            >
              Valida giornata
            </button>
            <button
              onClick={handlePrint}
              className="text-xs px-3 py-1 rounded bg-slate-800 text-white hover:bg-slate-900"
            >
              Stampa
            </button>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-3 flex items-center justify-between gap-4 no-print">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={printCavi}
              onChange={e => setPrintCavi(e.target.checked)}
            />
            <span>Includi lista cavi nella stampa (pagine successive)</span>
          </label>

          {cloudUfficioNote && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <span className="font-semibold">Nota Ufficio:&nbsp;</span>
              {cloudUfficioNote}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 print:max-w-none print:px-0 print:py-0">
          <div className="bg-white shadow-sm rounded-xl p-6 print:shadow-none print:rounded-none print:p-2">
            <div className="print-only mb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src="/conit-logo.png" alt="CONIT" className="w-16 h-auto" />
                  <span className="font-semibold text-lg">CONIT</span>
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-bold uppercase">Rapportino Giornaliero</h1>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-sm">Shakur – Ingegneria Digitale</span>
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

          {role === 'ELETTRICISTA' && (
            <div className="bg-white shadow-sm rounded-xl p-4 no-print">
              <CablePanel cavi={cavi} onCaviChange={handleCaviChange} />
            </div>
          )}
        </div>

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

      <footer className="print-only text-right text-[10px] text-slate-500 mt-1 pr-2">
        Rapportino – Shakur Studio ©
      </footer>

      {showArchivio && (
        <ArchivioModal
          currentRole={role}
          onClose={() => setShowArchivio(false)}
          onSelect={async id => {
            try {
              await loadRapportinoById(id)
              setShowArchivio(false)
            } catch (e) {
              alert(e.message)
            }
          }}
        />
      )}
    </div>
  )
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}
