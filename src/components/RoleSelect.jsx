// src/components/RoleSelect.jsx
import { useAuth } from '../auth/AuthProvider';

const CREW_ROLES = [
  {
    key: 'ELETTRICISTA',
    label: 'Elettricista',
    subtitle: 'Impianti, cavi, cabine, servizi.',
    badge: 'Cavi & impianti',
  },
  {
    key: 'CARPENTERIA',
    label: 'Carpenteria',
    subtitle: 'Supporti, staffe, passerelle cavi.',
    badge: 'Strutture',
  },
  {
    key: 'MONTAGGIO',
    label: 'Montaggio',
    subtitle: 'Quadri, macchine, apparecchi.',
    badge: 'Assemblaggi',
  },
];

export default function RoleSelect({ onSelect }) {
  const { profile } = useAuth();

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split('@')[0] ||
    'Capo';

  const appRole = profile?.app_role || 'CAPO';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="relative w-full max-w-2xl bg-slate-950/90 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(15,23,42,1)] overflow-hidden">
        {/* Glow de fond */}
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
        </div>

        <div className="relative p-6 md:p-7">
          {/* Header cockpit */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                CORE · Modulo Rapportino
              </div>

              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-50 mb-1">
                  Scelta della squadra
                </h1>

                <p className="text-[13px] text-slate-300">
                  Ciao{' '}
                  <span className="font-semibold text-slate-50">
                    {displayName}
                  </span>
                  , scegli il tipo squadra che userai oggi per compilare il
                  rapportino.
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  Passo 1 di 2 · Prima scegli la squadra, poi compili la
                  giornata.
                </p>
              </div>
            </div>

            {/* Badge utente */}
            <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700">
                Utente:{' '}
                <span className="text-slate-100 font-medium">
                  {displayName}
                </span>
              </span>
              <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/80 border border-sky-600 text-sky-300 font-semibold tracking-wide">
                Ruolo app: {appRole}
              </span>
            </div>
          </div>

          {/* Boutons de scelta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {CREW_ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onSelect(r.key)}
                className="
                  group relative px-4 py-3 rounded-xl text-left text-sm
                  border border-slate-700 bg-slate-900/80 text-slate-100
                  hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-50
                  transition-all duration-200
                  shadow-[0_0_15px_rgba(16,185,129,0)]
                  hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]
                  focus:outline-none focus:ring-1 focus:ring-emerald-400
                "
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-600 bg-slate-950/70 text-slate-300 group-hover:border-emerald-400/80 group-hover:text-emerald-200">
                    {r.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 group-hover:text-emerald-100 leading-snug">
                  {r.subtitle}
                </p>
                <span className="pointer-events-none absolute -right-1 -bottom-1 h-5 w-5 rounded-full border border-emerald-400/40 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* Note + info */}
          <p className="text-center text-[11px] text-slate-500 leading-relaxed">
            Il{' '}
            <span className="font-semibold text-slate-300">tipo squadra</span>{' '}
            (<span className="font-mono text-slate-300">crew_role</span>) viene
            usato solo nel modulo Rapportino.
            <br />
            Il tuo ruolo applicativo{' '}
            <span className="font-mono text-slate-300">app_role</span> rimane:{' '}
            <span className="font-semibold text-emerald-300">{appRole}</span>.
            Potrai cambiare squadra in qualsiasi momento dalla barra in alto.
          </p>
        </div>
      </div>
    </div>
  );
}
