// src/UfficioShell.jsx
import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import UfficioRapportiniList from './ufficio/UfficioRapportiniList';
import UfficioRapportinoDetail from './ufficio/UfficioRapportinoDetail';

export default function UfficioShell() {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const displayName =
    profile?.full_name || profile?.display_name || profile?.email || 'Ufficio';

  const ruolo = profile?.app_role || 'UFFICIO';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="hidden md:flex md:flex-col w-56 border-r border-slate-900 bg-slate-950/95">
        <div className="px-4 py-4 border-b border-slate-900">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
            CORE · UFFICIO
          </div>
          <div className="text-sm font-semibold text-slate-50">
            Pannello di controllo
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Dati da Rapportino + Archivio
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 text-[13px] space-y-1">
          <NavLink
            to="/ufficio"
            end
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-sky-500/10 border border-sky-500/60 text-sky-100'
                  : 'text-slate-300 border border-transparent hover:border-slate-700 hover:bg-slate-900',
              ].join(' ')
            }
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>Rapportini giornalieri</span>
          </NavLink>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 text-[13px] border border-dashed border-slate-800/60 cursor-default"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500/70" />
            <span>Archivio (in sviluppo)</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 text-[13px] border border-dashed border-slate-800/60 cursor-default"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
            <span>Anomalie / note critiche</span>
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-slate-900 text-[11px] text-slate-500">
          <div>
            Utente:{' '}
            <span className="text-slate-200 font-medium">{displayName}</span>
          </div>
          <div>
            Ruolo:{' '}
            <span className="text-sky-300 font-semibold tracking-wide">
              {ruolo}
            </span>
          </div>
        </div>
      </aside>

      {/* COLONNE PRINCIPALE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-900 bg-slate-950/95">
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Area Ufficio · Monitoraggio rapportini
            </div>
            <div className="text-sm text-slate-300">
              Vista unificata dei rapportini inviati dai Capi
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span>Archivio sincronizzato</span>
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md border border-slate-600 text-[11px] text-slate-100 hover:bg-slate-900"
            >
              Logout
            </button>
          </div>
        </header>

        {/* CONTENU */}
        <main className="flex-1 px-4 md:px-6 py-4 overflow-y-auto">
          <Routes>
            <Route path="/" element={<UfficioRapportiniList />} />
            <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
