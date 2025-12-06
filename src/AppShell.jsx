// src/AppShell.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import RoleSelect from './components/RoleSelect';
// en haut
import Rapportino6358Emergency from './components/Rapportino6358Emergency';
import CostrSelect from './components/CostrSelect';
import CapoModuleSelect from './components/CapoModuleSelect';
import { btnSmall } from './ui/designSystem';

const CREW_VALUES = ['ELETTRICISTA', 'CARPENTERIA', 'MONTAGGIO'];

const CREW_LABELS = {
  ELETTRICISTA: 'Elettricista',
  CARPENTERIA: 'Carpenteria',
  MONTAGGIO: 'Montaggio',
};

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem('core-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'dark';
}

export default function AppShell() {
  const navigate = useNavigate();
  const { profile, loading, signOut } = useAuth();
  const [crewRole, setCrewRole] = useState(null);
  const navigate = useNavigate();

  // lire crew_role depuis localStorage
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
    try {
      await signOut();
    } catch (err) {
      console.error('[AppShell] Errore logout:', err);
    } finally {
      handleChangeCrewRole();
      navigate('/login');
    }
  };

  if (loading || !profile) {
    return <LoadingScreen message="Caricamento del profilo..." />;
  }

  // pas encore de tipo squadra → écran de sélection
  if (!crewRole) {
    return <RoleSelect onSelect={handleSelectCrewRole} />;
  }

  const displayName = useMemo(() => {
    if (!profile) return 'Capo';
    return (
      profile.display_name ||
      profile.full_name ||
      profile.email?.split('@')[0] ||
      'Capo'
    );
  }, [profile]);

  const appRole = profile?.app_role || 'CAPO';
  const crewLabel = CREW_LABELS[crewRole] ?? 'Squadra';

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Barre cockpit fine, sticky, non imprimée */}
      <header className="no-print fixed top-0 inset-x-0 z-20 bg-slate-950/95 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-1.5 flex items-center justify-between gap-3 text-[11px]">
          {/* Gauche : status */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span>Modalità online</span>
            </span>
            <span className="hidden sm:inline text-slate-500">
              CORE · Modulo Rapportino
            </span>
          </div>

          {/* Droite : user + actions */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-200">
              <span className="font-medium capitalize">{displayName}</span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-300 font-semibold">{appRole}</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300 font-semibold">
                {crewLabel}
              </span>
            </span>

            <button
              type="button"
              onClick={handleChangeCrewRole}
              className="px-2.5 py-1 rounded-md border border-slate-600 bg-slate-900/80 text-[11px] text-slate-100 hover:bg-slate-800"
            >
              Cambia squadra
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-md border border-slate-600 bg-slate-900/80 text-[11px] text-slate-100 hover:bg-rose-600 hover:border-rose-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Contenu : on laisse la feuille faire le show */}
      <main className="flex-1 overflow-auto bg-slate-100 pt-10">
        {/* pt-10 pour ne pas que la barre fixe recouvre le haut de la feuille */}
        <RapportinoPage
          crewRole={crewRole}
          onChangeCrewRole={handleChangeCrewRole}
          onLogout={handleLogout}
        />
      </main>
    </div>
  );
}
