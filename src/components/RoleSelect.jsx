import { useAuth } from '../auth/AuthProvider';

const CREW_ROLES = [
  { key: 'ELETTRICISTA', label: 'Elettricista' },
  { key: 'CARPENTERIA', label: 'Carpenteria' },
  { key: 'MONTAGGIO', label: 'Montaggio' }
];

export default function RoleSelect({ onSelect }) {
  const { profile } = useAuth();

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split('@')[0] ||
    'Capo';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="w-full max-w-xl bg-slate-950/90 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(15,23,42,1)] p-7">

        {/* Header cockpit */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-1.5 mb-2 rounded-full border border-slate-700 bg-slate-900/80 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Sistema Centrale di Cantiere
          </div>

          <h1 className="text-2xl font-semibold text-slate-50 mb-1">
            CORE – Scelta della squadra
          </h1>

          <p className="text-[13px] text-slate-300">
            Ciao <span className="font-semibold">{displayName}</span>, scegli il tipo squadra da usare oggi per il tuo rapportino.
          </p>
        </div>

        {/* Boutons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {CREW_ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onSelect(r.key)}
              className="
                px-4 py-3 rounded-lg text-center text-sm font-medium 
                border border-slate-700 bg-slate-900/80 text-slate-100
                hover:border-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-200
                transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0)]
                hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]
              "
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Note + info */}
        <p className="text-center text-[11px] text-slate-500 leading-relaxed">
          Il <span className="font-semibold text-slate-300">tipo squadra</span> 
          (crew_role) viene usato solo nel modulo Rapportino.
          <br />
          Il tuo ruolo applicativo (app_role) rimane:{" "}
          <span className="font-semibold text-emerald-300">
            {profile?.app_role}
          </span>.
        </p>
      </div>
    </div>
  );
}
