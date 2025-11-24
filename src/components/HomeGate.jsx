import React from 'react'

export default function HomeGate({
  capo,
  setCapo,
  capoList,
  onEnterCapo,
  ufficioUser,
  setUfficioUser,
  onEnterUfficio,
  onEnterDirection,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CAPO */}
        <div className="bg-white shadow-lg rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">PERCORSO</h1>
            <p className="text-sm text-slate-500">
              Modulo <span className="font-semibold">RAPPORTINO</span> – Capo Squadra.
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
              Il tuo nome attiva i modelli personali per ruolo.
            </p>
          </div>

          <button
            onClick={() => {
              if (!capo.trim()) return alert('Inserisci il nome del Capo Squadra')
              onEnterCapo()
            }}
            className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700"
          >
            Entra come Capo
          </button>

          <div className="border border-dashed border-slate-300 rounded-lg px-4 py-3 text-xs text-slate-500">
            <div className="font-semibold mb-1">Percorso</div>
            <div>Modulo principale in sviluppo…</div>
            <div className="italic">Coming soon</div>
          </div>
        </div>

        {/* UFFICIO */}
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
          </div>

          <button
            onClick={() => {
              if (!ufficioUser.trim()) return alert("Inserisci il nome dell'operatore Ufficio")
              onEnterUfficio()
            }}
            className="w-full inline-flex items-center justify-center rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-900"
          >
            Entra come Ufficio
          </button>
        </div>

        {/* DIRECTION */}
        <div className="bg-white shadow-lg rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Direzione / Produzione</h2>
            <p className="text-sm text-slate-500">
              Obiettivi, curve produzione, ETA e KPI avanzati.
            </p>
          </div>

          <button
            onClick={onEnterDirection}
            className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-indigo-800"
          >
            Apri Produzione
          </button>
        </div>
      </div>
    </div>
  )
}
