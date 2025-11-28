import { useAuth } from '../auth/AuthProvider';
import RapportinoSheet from './RapportinoSheet';

export default function RapportinoPage({ crewRole, onChangeCrewRole, onLogout }) {
  const { profile } = useAuth();

  const displayName =
    (profile?.display_name || profile?.email || 'Utente').toUpperCase();

  const appRole = profile?.app_role || 'CAPO';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* BARRA ALTA – solo schermo, non nell'export PDF */}
      <header className="no-print bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm sm:text-base">
            {displayName}
          </div>
          <div className="text-xs sm:text-sm text-slate-300">
            Ruolo applicativo:{' '}
            <span className="font-medium">{appRole}</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-300">
            Tipo squadra:{' '}
            <span className="font-medium">
              {crewRole === 'ELETTRICISTA'
                ? 'Elettricista'
                : crewRole === 'CARPENTERIA'
                ? 'Carpenteria'
                : crewRole === 'MONTAGGIO'
                ? 'Montaggio'
                : crewRole}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onChangeCrewRole}
            className="px-3 py-1.5 text-xs sm:text-sm rounded border border-slate-500 hover:bg-slate-800"
          >
            Cambia squadra
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 text-xs sm:text-sm rounded bg-red-600 hover:bg-red-700"
          >
            Esci
          </button>
        </div>
      </header>

      {/* CONTENUTO PRINCIPALE */}
      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        <RapportinoSheet crewRole={crewRole} />
      </main>
    </div>
  );
}
