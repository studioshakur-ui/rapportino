import { useAuth } from '../auth/AuthProvider';

const CREW_ROLES = [
  { key: 'ELETTRICISTA', label: 'Elettricista' },
  { key: 'CARPENTERIA', label: 'Carpenteria' },
  { key: 'MONTAGGIO', label: 'Montaggio' }
];

export default function RoleSelect({ onSelect }) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-full max-w-lg bg-slate-800 rounded-xl shadow-lg p-6">
        <h1 className="text-xl font-semibold mb-2 text-center">
          CORE – Choix de la squadra
        </h1>
        <p className="text-sm text-center text-slate-300 mb-4">
          Bonjour{' '}
          <span className="font-semibold">
            {profile?.display_name || profile?.email || 'capo'}
          </span>
          , choisis le tipo squadra pour ton rapportino.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CREW_ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onSelect(r.key)}
              className="px-3 py-4 rounded-lg bg-slate-900 hover:bg-emerald-600/80 border border-slate-600 text-center text-sm font-medium"
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Tipo squadra = <span className="font-semibold">crew_role</span> utilisé
          seulement pour Rapportino. Ton rôle applicatif (app_role) reste :{' '}
          <span className="font-semibold">{profile?.app_role}</span>.
        </p>
      </div>
    </div>
  );
}
