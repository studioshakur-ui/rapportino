import { useAuth } from '../auth/AuthProvider';
import RapportinoSheet from './RapportinoSheet';

export default function RapportinoPage({ crewRole, onChangeCrewRole, onLogout }) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">
            {profile?.display_name || profile?.email || 'Utilisateur'}
          </div>
          <div className="text-sm text-slate-300">
            Rôle applicatif : <span className="font-medium">{profile?.app_role}</span>
          </div>
          <div className="text-sm text-slate-300">
            Tipo squadra : <span className="font-medium">{crewRole}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onChangeCrewRole}
            className="px-3 py-1.5 text-sm rounded border border-slate-500 hover:bg-slate-800"
          >
            Changer squadra
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

      <main className="p-4 max-w-4xl mx-auto">
        <RapportinoSheet crewRole={crewRole} />
      </main>
    </div>
  );
}
