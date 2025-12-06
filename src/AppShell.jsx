// src/AppShell.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import ConnectionIndicator from './components/ConnectionIndicator';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem('core-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'dark';
}

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === 'dark';

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
    } catch (err) {
      console.error('Errore logout capo:', err);
    } finally {
      navigate('/login');
    }
  };

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      'Capo squadra',
    [profile],
  );

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const navItemClasses = (active, section) => {
    const base =
      'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors';
    if (active) {
      if (section === 'archive') {
        return [
          base,
          isDark
            ? 'bg-violet-500/15 border-violet-500/70 text-violet-100'
            : 'bg-violet-50 border-violet-400 text-violet-800',
        ].join(' ');
      }
      return [
        base,
        isDark
          ? 'bg-emerald-500/15 border-emerald-500/70 text-emerald-100'
          : 'bg-emerald-50 border-emerald-400 text-emerald-800',
      ].join(' ');
    }
    return [
      base,
      isDark
        ? 'text-slate-300 border-transparent hover:border-slate-700 hover:bg-slate-900'
        : 'text-slate-700 border-transparent hover:border-slate-300 hover:bg-slate-50',
    ].join(' ');
  };

  const isArchive = location.pathname.startsWith('/app/archive');

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Capo…
      </div>
    );
  }

  return (
    <div
      className={[
        'min-h-screen flex flex-col',
        isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-100 text-slate-900',
      ].join(' ')}
    >
      {/* HEADER CAPO */}
      <header
        className={[
          'no-print border-b backdrop-blur flex items-center justify-between px-4 md:px-6 py-2',
          isDark
            ? 'bg-slate-950/95 border-slate-900'
            : 'bg-white/95 border-slate-200 shadow-sm',
        ].join(' ')}
      >
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            CORE · Sistema centrale di cantiere
          </div>
          <div className="text-xs text-slate-400">
            Modulo Capo ·{' '}
            <span className="font-semibold">
              Rapportino giornaliero &amp; Archivio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* Theme switch */}
          <button
            type="button"
            onClick={toggleTheme}
            className={[
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
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

          {/* Connexion */}
          <ConnectionIndicator />

          {/* User */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-slate-400 text-xs">Capo squadra</span>
            <span className="text-slate-100 font-medium">
              {displayName}
            </span>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className={[
              'px-3 py-1.5 rounded-full border text-xs font-medium',
              isDark
                ? 'border-rose-500 text-rose-100 hover:bg-rose-600/20'
                : 'border-rose-400 text-rose-700 hover:bg-rose-50',
            ].join(' ')}
          >
            Logout
          </button>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR CAPO */}
        <aside
          className={[
            'no-print hidden md:flex md:flex-col w-64 border-r px-3 py-4',
            isDark
              ? 'bg-slate-950 border-slate-900'
              : 'bg-slate-50 border-slate-200',
          ].join(' ')}
        >
          <div className="px-1 pb-3 border-b border-slate-800/60">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              Area Capo
            </div>
            <div className="text-xs text-slate-300">
              Rapportino · squadre · archivio rapportini
            </div>
          </div>

          <nav className="px-1 py-3 space-y-1.5">
            <NavLink
              to="/app"
              end
              className={({ isActive }) => navItemClasses(isActive)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Rapportino giornaliero</span>
            </NavLink>

            <NavLink
              to="/app/archive"
              className={({ isActive }) => navItemClasses(isActive, 'archive')}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>Archivio · Rapportini v1</span>
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · SHAKUR Engineering</div>
            <div className="text-slate-600">
              Capo · bordo · linea · cantiere
            </div>
          </div>
        </aside>

        {/* CONTENU CAPO */}
        <main
          className={[
            'flex-1 min-h-0 overflow-y-auto',
            isDark ? 'bg-slate-950' : 'bg-slate-100',
          ].join(' ')}
        >
          <section className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Bandeau contextuel */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {isArchive
                    ? 'Archivio storico rapportini v1'
                    : 'Rapportino giornata squadra'}
                </span>
                <span className="text-xs text-slate-400">
                  {isArchive
                    ? 'Consultazione in sola lettura dei vecchi rapportini (v1)'
                    : 'Compilazione, firma e invio del rapportino digitale'}
                </span>
              </div>
            </div>

            {/* Ici, React Router insère soit RapportinoPage, soit ArchivePage */}
            <div className="border border-slate-800/60 rounded-2xl bg-slate-950/90 shadow-xl overflow-hidden">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
