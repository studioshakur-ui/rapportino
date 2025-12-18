// src/UfficioShell.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  NavLink,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { coreLayout } from "./ui/coreLayout";
import { corePills, themeIconBg } from "./ui/designSystem";

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

export default function UfficioShell() {
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
      console.error('Errore logout ufficio:', err);
    } finally {
      navigate('/login');
    }
  };

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      'Ufficio',
    [profile],
  );

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const navItemClasses = (active, section) => {
    const base =
      'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors';
    if (active) {
      if (section === 'inca') {
        return [
          base,
          isDark
            ? 'bg-emerald-500/15 border-emerald-500/70 text-emerald-100'
            : 'bg-emerald-50 border-emerald-400 text-emerald-800',
        ].join(' ');
      }
      if (section === 'core-drive') {
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
          ? 'bg-sky-500/15 border-sky-500/70 text-sky-100'
          : 'bg-sky-50 border-sky-400 text-sky-800',
      ].join(' ');
    }
    return [
      base,
      isDark
        ? 'text-slate-300 border-transparent hover:border-slate-700 hover:bg-slate-900'
        : 'text-slate-700 border-transparent hover:border-slate-300 hover:bg-slate-50',
    ].join(' ');
  };

  const isInca = location.pathname.startsWith('/ufficio/inca');
  const isCoreDrive = location.pathname.startsWith('/ufficio/archive');

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  return (
    <div
      className={[
        'min-h-screen flex flex-col',
        coreLayout.pageShell(isDark),
      ].join(' ')}
    >
      <header
        className={[
          'no-print border-b backdrop-blur flex items-center justify-between px-4 md:px-6 py-2',
          coreLayout.header(isDark),
        ].join(' ')}
      >
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            CORE · Sistema centrale di cantiere
          </div>
          <div className="text-xs text-slate-400">
            Modulo Ufficio · <span className="font-semibold">Certificazione · Archivio</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <button
            type="button"
            onClick={toggleTheme}
            className={[
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
              coreLayout.themeToggle(isDark),
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px]',
                themeIconBg(isDark),
              ].join(' ')}
            >
              {isDark ? '🌑' : '☀️'}
            </span>
            <span className="uppercase tracking-[0.16em]">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          <span
            className={corePills(
              isDark,
              'sky',
              'hidden sm:inline-flex items-center gap-1 px-2 py-0.5'
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
            <span className="uppercase tracking-[0.16em] text-[9px]">
              CORE Drive online
            </span>
          </span>

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-slate-400">
              Utente:{' '}
              <span className="text-slate-100 font-medium">
                {displayName}
              </span>
            </span>
          </div>

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

      <div className="flex flex-1 min-h-0">
        <aside
          className={[
            'no-print hidden md:flex md:flex-col w-64 border-r px-3 py-4',
            coreLayout.sidebar(isDark),
          ].join(' ')}
        >
          <div className="px-1 pb-3 border-b border-slate-800/60">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              Pannello
            </div>
            <div className="text-xs text-slate-300">
              Rapportini · INCA · CORE Drive
            </div>
          </div>

          <nav className="px-1 py-3 space-y-1.5">
            <NavLink
              to="/ufficio"
              end
              className={({ isActive }) => navItemClasses(isActive)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Rapportini</span>
            </NavLink>

            <NavLink
              to="/ufficio/inca"
              className={({ isActive }) =>
                navItemClasses(isActive, 'inca')
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>INCA</span>
            </NavLink>

            <NavLink
              to="/ufficio/archive"
              className={({ isActive }) =>
                navItemClasses(isActive, 'core-drive')
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>CORE Drive</span>
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · SHAKUR Engineering</div>
          </div>
        </aside>

        <main
          className={[
            'flex-1 min-h-0 overflow-y-auto',
            coreLayout.mainBg(isDark),
          ].join(' ')}
        >
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {isInca
                    ? 'INCA'
                    : isCoreDrive
                    ? 'CORE Drive'
                    : 'Rapportini'}
                </span>
              </div>
            </div>

            <div
              className={[
                'border rounded-2xl overflow-hidden',
                coreLayout.primaryPanel(isDark),
              ].join(' ')}
            >
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
