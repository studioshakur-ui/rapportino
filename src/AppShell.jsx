// src/AppShell.jsx
import React, { useEffect, useState } from 'react';
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

export default function AppShell() {
  const { profile, loading, signOut } = useAuth();

  const [costruttore, setCostruttore] = useState(null); // ex: '6368' | '6358'
  const [selectedModule, setSelectedModule] = useState(null); // 'RAPPORTINO' | 'INCA'
  const [crewRole, setCrewRole] = useState(null);

  // lecture du contexte stocké
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedCostr = window.localStorage.getItem('core_costr');
      const storedModule = window.localStorage.getItem('core_module');
      const storedCrew = window.localStorage.getItem('core_crew_role');

      if (storedCostr) setCostruttore(storedCostr);
      if (storedModule) setSelectedModule(storedModule);
      if (storedCrew && CREW_VALUES.includes(storedCrew)) {
        setCrewRole(storedCrew);
      }
    } catch (e) {
      console.error('Errore lettura contesto CORE (localStorage):', e);
    }
  }, []);

  const handleSelectCostr = (value) => {
    setCostruttore(value);
    setSelectedModule(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('core_costr', value);
        window.localStorage.removeItem('core_module');
      } catch (e) {
        console.error('Errore scrittura core_costr:', e);
      }
    }
  };

  const handleChangeCostr = () => {
    setCostruttore(null);
    setSelectedModule(null);
    setCrewRole(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('core_costr');
        window.localStorage.removeItem('core_module');
        window.localStorage.removeItem('core_crew_role');
      } catch (e) {
        console.error('Errore reset contesto CORE:', e);
      }
    }
  };

  const handleSelectModule = (moduleKey) => {
    setSelectedModule(moduleKey);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('core_module', moduleKey);
      } catch (e) {
        console.error('Errore scrittura core_module:', e);
      }
    }
  };

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
    handleChangeCostr();
  };

  if (loading || !profile) {
    return <LoadingScreen message="Caricamento del profilo..." />;
  }

  // 1) pas de COSTR → choix navire
  if (!costruttore) {
    return <CostrSelect onSelect={handleSelectCostr} />;
  }

  // 2) pas encore de modulo → choix Rapportino / INCA
  if (!selectedModule) {
    return (
      <CapoModuleSelect
        costruttore={costruttore}
        onSelectModule={handleSelectModule}
        onChangeCostr={handleChangeCostr}
      />
    );
  }

  // 3) si module INCA → placeholder CAPO pour l’instant
  if (selectedModule === 'INCA') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <header className="no-print fixed top-0 inset-x-0 z-20 bg-slate-950/95 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-3 md:px-6 py-2 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-sky-500/60 bg-sky-500/10 text-sky-200">
                INCA · Vista CAPO
              </span>
              <span className="text-slate-400">
                COSTR {costruttore} · Lista Cavi (spec in sviluppo)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                className={btnSmall}
              >
                Torna ai moduli
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={
                  btnSmall +
                  ' border-rose-600 text-rose-100 hover:bg-rose-600 hover:text-white'
                }
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 pt-12 px-4 text-sm text-slate-200">
          <div className="max-w-4xl mx-auto mt-6 border border-slate-800 rounded-2xl bg-slate-900/70 p-6">
            <h1 className="text-lg font-semibold mb-2">
              Modulo INCA – Vista CAPO (placeholder)
            </h1>
            <p className="text-slate-300 mb-3">
              La vista completa Lista Cavi per il CAPO sarà integrata qui,
              sincronizzata con il COSTR selezionato e con il modulo UFFICIO.
            </p>
            <p className="text-[12px] text-slate-500">
              Per ora, continua a usare il modulo INCA lato Ufficio per l’import
              e il controllo avanzamento. Questo blocco serve solo a non
              interrompere il flusso CAPO.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 4) Module RAPPORTINO – il faut d’abord le crew_role
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Barre cockpit fine, sticky, non imprimée */}
      <header className="no-print fixed top-0 inset-x-0 z-20 bg-slate-950/95 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-1.5 flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span>Modalità online</span>
            </span>
            <span className="hidden sm:inline text-slate-400">
              CORE · Modulo Rapportino · COSTR {costruttore}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-200">
              <span className="font-medium capitalize">{displayName}</span>
              <span className="text-slate-500">·</span>
              <span className="text-sky-300 font-semibold">{appRole}</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300 font-semibold">
                {crewLabel}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">COSTR {costruttore}</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedModule(null)}
              className={btnSmall + ' hidden xs:inline-flex'}
            >
              Moduli
            </button>

            <button
              type="button"
              onClick={handleChangeCrewRole}
              className={btnSmall + ' hidden xs:inline-flex'}
            >
              Cambia squadra
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={
                btnSmall +
                ' border-rose-600 text-rose-100 hover:bg-rose-600 hover:text-white'
              }
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Contenu : la feuille rapportino fait le show */}
   
// ...

<main className="flex-1 overflow-auto bg-slate-100 pt-10">
  <Rapportino6358Emergency />
</main>
    </div>
  );
}
