import React from 'react'
import { ROLE_OPTIONS } from '../App'

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

export default function RoleSelect({
  capo,
  models,
  setModels,
  onBack,
  onChoose,
}) {
  const capoName = capo.trim() || 'CAPO'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-1">
              Ciao {capoName} 👋
            </h2>
            <p className="text-sm text-slate-500">
              Scegli il ruolo della tua squadra per oggi.
            </p>
          </div>
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-700">
            ← Home
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                const capoModels = models[capoName] || {}
                const existing =
                  capoModels[opt.key]?.righe && capoModels[opt.key].righe.length > 0
                    ? capoModels[opt.key].righe
                    : null

                const template = existing || defaultTemplateForRole(opt.key)

                if (!existing) {
                  const updatedModels = {
                    ...models,
                    [capoName]: {
                      ...(models[capoName] || {}),
                      [opt.key]: { righe: template },
                    },
                  }
                  setModels(updatedModels)
                }

                onChoose(opt.key, template)
              }}
              className="border border-slate-200 rounded-xl px-4 py-6 text-left hover:border-emerald-500 hover:shadow-sm flex flex-col justify-between"
            >
              <span className="font-semibold text-sm">{opt.label}</span>
              <span className="mt-2 text-[11px] text-slate-500">
                Modello preconfigurato e personalizzabile.
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
