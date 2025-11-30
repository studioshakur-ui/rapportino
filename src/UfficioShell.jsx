// src/UfficioShell.jsx
import React from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import UfficioRapportiniList from './ufficio/UfficioRapportiniList';
import UfficioRapportinoDetail from './ufficio/UfficioRapportinoDetail';
import IncaRoot from './inca';

export default function UfficioShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[UfficioShell] Errore logout:', err);
    } finally {
      // On force le retour au login pour éviter tout état zombie
      navigate('/login');
    }
  };

  const displayName =
    profile?.full_name || profile?.display_name || profile?.email || 'Ufficio';

  const ruolo = profile?.app_role || 'UFFICIO';

  const navItemClasses = (active, variant = 'default') => {
    const base =
      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-[13px] border';
    if (variant === 'inca') {
      return [
        base,
        active
          ? 'bg-emerald-500/15 border-emerald-500/70 text-emerald-100'
          : 'text-slate-300 border-transparent hover:border-slate-700 hover:bg-slate-900',
      ].join(' ');
    }
    return [
      base,
      active
        ? 'bg-sky-500/10 border-sky-500/70 text-sky-100'
        : 'text-slate-300 border-transparent hover:border-slate-700 hover:bg-slate-900',
    ].join(' ');
  };

  const isInca = location.pathname.startsWith('/ufficio/inca');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header Ufficio – cockpit, cohérent avec le Capo */}
      <header className="no-print flex items-center justify-between px-4 md:px-6 py-2 border-b border-slate-900 bg-slate-950/95">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            CORE · Area Ufficio
          </div>
          <div className="text-xs text-slate-300">
            Rapportini · stati · INCA · note di ritorno
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/60 bg-sky-500/10 text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
            <span>Archivio sincronizzato</span>
          </span>
          <div className="hidden sm:flex flex-col text-right text-slate-400">
            <span>
              Utente:{' '}
              <span className="text-slate-100 font-medium">{displayName}</span>
            </span>
            <span>
              Ruolo:{' '}
              <span className="text-sky-300 font-semibold tracking-wide">
                {ruolo}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-md border border-slate-600 text-[11px] text-slate-100 bg-slate-900/80 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Corps Mission Control */}
      <div className="flex flex-1 min-h-0">
        {/* Colonne gauche : navigation + liste (Mission Control feel) */}
        <aside className="no-print hidden md:flex md:flex-col w-64 border-r border-slate-900 bg-slate-950/98">
          <div className="px-4 py-3 border-b border-slate-900">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              Pannello di controllo
            </div>
            <div className="text-xs text-slate-300">
              Rapportini · stati · INCA · note di ritorno
            </div>
          </div>

          <nav className="px-2 py-3 space-y-1">
            <NavLink
              to="/ufficio"
              end
              className={({ isActive }) => navItemClasses(isActive)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Rapportini giornalieri</span>
            </NavLink>

            <NavLink
              to="/ufficio/inca"
              className={({ isActive }) => navItemClasses(isActive, 'inca')}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Percorso cavi · INCA</span>
            </NavLink>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 text-[13px] border border-dashed border-slate-800/70 cursor-default"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500/80" />
              <span>Archivio (prossima fase)</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 text-[13px] border border-dashed border-slate-800/70 cursor-default"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
              <span>Anomalie / note critiche</span>
            </button>
          </nav>

          <div className="mt-auto px-4 py-3 border-t border-slate-900 text-[11px] text-slate-500">
            <div>Accesso riservato al personale Ufficio / Direzione.</div>
            <div>Ogni azione viene tracciata in Archivio.</div>
          </div>
        </aside>

        {/* Colonne principale : layout 2 colonnes liste + dettaglio */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Liste (mobile + desktop) */}
            {!isInca && (
              <section className="md:w-1/2 lg:w-2/5 border-b md:border-b-0 md:border-r border-slate-900 min-h-0">
                <div className="h-full overflow-auto px-3 md:px-4 py-3">
                  <UfficioRapportiniList />
                </div>
              </section>
            )}

            {/* Détail rapportino / INCA */}
            <section className="flex-1 min-h-0">
              <div className="h-full overflow-auto px-3 md:px-4 py-3 bg-slate-950/90">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <div className="h-full flex items-center justify-center text-[13px] text-slate-500">
                        <div className="text-center max-w-sm">
                          <div className="mb-1 text-slate-300 font-medium">
                            Seleziona un rapportino dalla lista
                          </div>
                          <p>
                            A sinistra vedi i rapportini inviati dai Capi.
                            Clicca su una riga per aprire il dettaglio,
                            verificare le ore e aggiungere eventuali note di
                            ritorno.
                          </p>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="rapportini/:id"
                    element={<UfficioRapportinoDetail />}
                  />
                  <Route
                    path="inca/*"
                    element={
                      <div className="max-w-5xl mx-auto">
                        <IncaRoot />
                      </div>
                    }
                  />
                  <Route path="*" element={<Navigate to="/ufficio" replace />} />
                </Routes>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
