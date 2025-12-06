// src/AppShell.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import LoadingScreen from './components/LoadingScreen';
import RoleSelect from './components/RoleSelect';
import RapportinoPage from './components/RapportinoPage';

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

  const [crewRole, setCrewRole] = useState(CREW_VALUES[0]);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/login', { replace: true });
    }
  }, [loading, profile, navigate]);

  useEffect(() => {
    try {
      window.localStorage.setItem('core-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erreur logout:', error);
    }
  };

  const handleChangeCrewRole = () => {
    setShowRoleSelect(true);
  };

  const handleRoleSelected = (nextRole) => {
    if (nextRole && CREW_VALUES.includes(nextRole)) {
      setCrewRole(nextRole);
    }
    setShowRoleSelect(false);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

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
    <div
      className={[
        'min-h-screen flex flex-col',
        isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-100 text-slate-900',
      ].join(' ')}
    >
      {/* Overlay sélection équipe */}
      {showRoleSelect && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div
            className={[
              'w-full max-w-md mx-4 rounded-2xl shadow-2xl border',
              isDark
                ? 'bg-slate-900 text-slate-50 border-slate-700'
                : 'bg-white text-slate-900 border-slate-200',
            ].join(' ')}
          >
            <RoleSelect
              currentRole={crewRole}
              onSelect={handleRoleSelected}
              onClose={() => setShowRoleSelect(false)}
            />
          </div>
        </div>
      )}

      {/* HEADER UNIQUE – fin, cockpit */}
      <header
        className={[
          'no-print fixed inset-x-0 top-0 z-30 border-b backdrop-blur',
          isDark
            ? 'bg-slate-950/95 border-slate-800'
            : 'bg-white/95 border-slate-200 shadow-sm',
        ].join(' ')}
      >
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          <div className="flex h-11 items-center justify-between gap-3">
            {/* Gauche : brand + module */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  CORE · Sistema centrale di cantiere
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold">
                    Modulo Rapportino ·{' '}
                    <span className="text-emerald-500">
                      Capo squadra
                    </span>
                  </span>
                </div>
              </div>

              {/* Etat Online */}
              <div
                className={[
                  'hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                  isDark
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                    : 'border-emerald-500/50 bg-emerald-50 text-emerald-700',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-1.5 w-1.5 rounded-full',
                    'shadow-[0_0_0_3px_rgba(16,185,129,0.35)]',
                    'bg-emerald-400',
                  ].join(' ')}
                />
                <span className="uppercase tracking-[0.16em] text-[9px]">
                  Online
                </span>
              </div>
            </div>

            {/* Droite : thème + user + crew + logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Switch Dark / Light */}
              <button
                type="button"
                onClick={toggleTheme}
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                  isDark
                    ? 'border-slate-600 bg-slate-900/70 text-slate-200'
                    : 'border-slate-300 bg-slate-50 text-slate-700',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px]',
                    isDark ? 'bg-slate-800' : 'bg-amber-200',
                  ].join(' ')}
                >
                  {isDark ? '🌑' : '☀️'}
                </span>
                <span className="uppercase tracking-[0.16em]">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>

              {/* Info utilisateur + équipe */}
              <div
                className={[
                  'hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
                  isDark
                    ? 'border-slate-700 bg-slate-900/80 text-slate-100'
                    : 'border-slate-300 bg-slate-50 text-slate-800',
                ].join(' ')}
              >
                <span className="font-medium truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-xs font-semibold text-sky-400">
                  {appRole}
                </span>
                <span className="text-slate-500">·</span>
                <button
                  type="button"
                  onClick={handleChangeCrewRole}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  <span>{crewLabel}</span>
                  <span className="text-[9px] opacity-80">▼</span>
                </button>
              </div>

              {/* Version compacte mobile : crew only */}
              <button
                type="button"
                onClick={handleChangeCrewRole}
                className="sm:hidden inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{crewLabel}</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className={[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                  isDark
                    ? 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100',
                ].join(' ')}
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu, avec offset pour le header */}
      <main
        className={[
          'flex-1 overflow-auto pt-12',
          isDark ? 'bg-slate-950' : 'bg-slate-100',
        ].join(' ')}
      >
        <RapportinoPage
          crewRole={crewRole}
          onChangeCrewRole={handleChangeCrewRole}
          onLogout={handleLogout}
          theme={theme}
        />
      </main>
    </div>
  );
}
