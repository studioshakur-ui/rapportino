import { useAuth } from '../auth/AuthProvider';
import RapportinoSheet from './RapportinoSheet';

export default function RapportinoPage({ crewRole, onChangeCrewRole, onLogout }) {
  const { profile } = useAuth();

  const displayName =
    (profile?.display_name || profile?.email || 'Utente').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Navbar uniquement à l'écran */}
      <header className="no-print bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">{displayName}</div>
          <div className="text-sm text-slate-300">
            Ruolo applicativo:{' '}
            <span className="font-medium">
              {profile?.app_role || 'N/D'}
            </span>
          </div>
          <div className="text-sm text-slate-300">
            Tipo squadra:{' '}
            <span className="font-medium">
              {crewRole || 'N/D'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onChangeCrewRole}
            className="px-3 py-1.5 text-sm rounded border border-slate-500 hover:bg-slate-800"
          >
            Cambia squadra
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Zone centrale rapportino (s'adapte écran / impression) */}
      <main className="rapportino-page">
        <div className="rapportino-sheet-container">
          <RapportinoSheet crewRole={crewRole} />
        </div>
      </main>
    </div>
  );
}
