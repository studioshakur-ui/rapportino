// src/AppShell.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import RoleSelect from './components/RoleSelect';
import RapportinoPage from './components/RapportinoPage';

// Valeurs possibles de crew_role
const CREW_VALUES = ['ELETTRICISTA', 'CARPENTERIA', 'MONTAGGIO'];

const CREW_LABELS = {
  ELETTRICISTA: 'Elettricista',
  CARPENTERIA: 'Carpenteria',
  MONTAGGIO: 'Montaggio'
};

export default function AppShell() {
  const { profile, loading, signOut } = useAuth();
  const [crewRole, setCrewRole] = useState(null);

  // Lecture du tipo squadra depuis localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('core_crew_role');
      if (stored && CREW_VALUES.includes(stored)) {
        setCrewRole(stored);
      }
    } catch (e) {
      console.error('Errore lettura core_crew_role:', e);
    }
  }, []);

  const handleSelectCrewRole = (role) => {
    setCrewRole(role);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('core_crew_role', role);
      } catch (e) {
        console.error('Errore scrittura core_crew_role:', e);
      }
    }
  };

  const handleChangeCrewRole = () => {
    setCrewRole(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('core_crew_role');
      } catch (e) {
        console.error('Errore rimozione core_crew_role:', e);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    handleChangeCrewRole();
  };

  if (loading || !profile) {
    return <LoadingScreen message="Caricamento del profilo..." />;
  }

  // Pas encore de tipo squadra choisi → écran de sélection
  if (!crewRole) {
    return <RoleSelect onSelect={handleSelectCrewRole} />;
  }

  const displayName =
    profile.display_name ||
    profile.full_name ||
    profile.email?.split('@')[0] ||
    'Capo';

  const appRole = profile.app_role || 'CAPO';
  const crewLabel = CREW_LABELS[crewRole] || crewRole;

  // Shell CAPO : on enveloppe RapportinoPage avec un header
  // La barre du haut est en .no-print pour ne pas toucher à la feuille à l'impression.
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* HEADER CAPO – non imprimé */}
      <header className="no-print flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-900 bg-slate-950/95">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            CORE · Area Capo
          </div>
          <div className="text-sm text-slate-200">
            Sistema centrale di cantiere – Rapportino giornaliero
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* Stato sync (placeholder online) */}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span>Modalità online</span>
          </span>

          {/* Info utente */}
          <div className="hidden sm:flex flex-col text-right text-slate-400">
            <span>
              Capo:{' '}
              <span className="text-slate-100 font-medium">{displayName}</span>
            </span>
            <span>
              Ruolo app:{' '}
              <span className="text-sky-300 font-semibold">{appRole}</span> ·
              Squadra:{' '}
              <span className="text-emerald-300 font-semibold">
                {crewLabel}
              </span>
            </span>
          </div>

          {/* Boutons actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleChangeCrewRole}
              className="px-3 py-1.5 rounded-md border border-slate-600 text-[11px] text-slate-100 hover:bg-slate-900"
            >
              Cambia squadra
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-slate-600 text-[11px] text-slate-100 hover:bg-slate-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU – ta feuille rapportino reste intacte */}
      <main className="flex-1 overflow-auto bg-slate-900/90">
        <RapportinoPage
          crewRole={crewRole}
          onChangeCrewRole={handleChangeCrewRole}
          onLogout={handleLogout}
        />
      </main>
    </div>
  );
}
