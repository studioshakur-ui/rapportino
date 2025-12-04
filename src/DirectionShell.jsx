// src/DirectionShell.jsx
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import ConnectionIndicator from './components/ConnectionIndicator';
import DirectionDashboard from './components/DirectionDashboard';

export default function DirectionShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Direzione…
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Errore logout direzione:', err);
    } finally {
      navigate('/login');
    }
  };

  const navItemClasses = (active) =>
    [
      'block px-2.5 py-1.5 rounded-lg text-sm transition-colors border',
      active
        ? 'bg-sky-500/15 text-sky-100 border-sky-500/60'
        : 'text-slate-300 border-transparent hover:bg-slate-900 hover:border-slate-700',
    ].join(' ');

  const isActive = (prefix) => location.pathname.startsWith(prefix);

  const displayName =
    profile.display_name || profile.full_name || profile.email;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="no-print sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-slate-700 bg-slate-900/80 text-[11px] tracking-[0.16em] uppercase text-slate-300">
              Sistema centrale di cantiere
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-slate-400">Modulo Direzione</span>
              <span className="text-sm font-semibold text-slate-50">
                CORE – Controllo produzione & KPI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <ConnectionIndicator />
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-slate-400">Utente Direzione</span>
              <span className="text-slate-50 font-medium">{displayName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-rose-500 text-rose-200 hover:bg-rose-600 hover:text-white text-xs font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR */}
        <aside className="no-print w-60 bg-slate-950 border-r border-slate-800 px-3 py-4 flex flex-col gap-5">
          {/* Blocco principale */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Direzione
            </div>
            <nav className="space-y-1.5">
              <Link
                to="/direction"
                className={navItemClasses(isActive('/direction'))}
              >
                Panoramica & Presenze
              </Link>
            </nav>
          </div>

          {/* Sezione Ufficio */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Ufficio · Rapportini
            </div>
            <nav className="space-y-1.5">
              <Link
                to="/ufficio/rapportini"
                className={navItemClasses(isActive('/ufficio/rapportini'))}
              >
                Elenco rapportini
              </Link>
            </nav>
          </div>

          {/* Sezione INCA / tracciamento */}
          <div className="mt-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              INCA · Tracciamento cavi
            </div>
            <nav className="space-y-1.5">
              <Link
                to="/ufficio/inca"
                className={navItemClasses(isActive('/ufficio/inca'))}
              >
                Modulo INCA
              </Link>
            </nav>
          </div>

          {/* Bas de sidebar */}
          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · SHAKUR Engineering</div>
            <div className="text-slate-600">
              Direzione · Trieste · La Spezia · Dakar
            </div>
          </div>
        </aside>

        {/* CONTENT – Panoramica Direzione */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          <DirectionDashboard />
        </main>
      </div>
    </div>
  );
}
