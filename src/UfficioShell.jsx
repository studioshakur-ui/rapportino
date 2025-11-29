// src/UfficioShell.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header Ufficio */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/95">
        <div className="text-xs">
          <div className="font-semibold text-slate-50">
            Area Ufficio – Rapportini
          </div>
          <div className="text-slate-400">
            Utente:{' '}
            <span className="font-medium text-slate-100">{displayName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-sky-900 text-sky-100 border border-sky-600">
            Ruolo: {profile?.app_role || 'UFFICIO'}
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

      {/* Contenu routes Ufficio */}
      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<UfficioRapportiniList />} />
          <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
