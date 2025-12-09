// src/DirectionShell.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useLocation,
  Routes,
  Route,
} from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import ConnectionIndicator from './components/ConnectionIndicator';
import DirectionDashboard from './components/DirectionDashboard';
import ArchivePage from './pages/Archive';
import CorePresentationPopup from './components/CorePresentationPopup';
import CorePresentation from './pages/CorePresentation';

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

export default function DirectionShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === 'dark';

  // Popup de présentation CORE
  const [showPresentationModal, setShowPresentationModal] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('core-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Afficher le popup une seule fois par navigateur tant qu'il n'a pas été explicitement fermé
  useEffect(() => {
    if (!profile) return;
    try {
      const dismissed = window.localStorage.getItem(
        'core-presentation-dismissed',
      );
      if (!dismissed) {
        setShowPresentationModal(true);
      }
    } catch {
      setShowPresentationModal(true);
    }
  }, [profile]);

  const handleDismissPresentation = () => {
    try {
      window.localStorage.setItem('core-presentation-dismissed', '1');
    } catch {
      // ignore
    }
    setShowPresentationModal(false);
  };

  const handleOpenPresentation = () => {
    try {
      window.localStorage.setItem('core-presentation-dismissed', '1');
    } catch {
      // ignore
    }
    setShowPresentationModal(false);
    navigate('/direction/presentazione');
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Errore logout direzione:', err);
    } finally {
      navigate('/login');
    }
  };

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      'Direzione',
    [profile],
  );

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const navItemClasses = (active) =>
    [
      'block px-2.5 py-1.5 rounded-lg text-sm transition-colors border',
      active
        ? isDark
          ? 'bg-sky-500/15 text-sky-100 border-sky-500/60'
          : 'bg-sky-50 text-sky-800 border-sky-400'
        : isDark
        ? 'text-slate-300 border-transparent hover:bg-slate-900 hover:border-slate-700'
        : 'text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-300',
    ].join(' ');

  const isActive = (prefix) => location.pathname.startsWith(prefix);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Direzione…
      </div>
    );
  }

  return (
    <div
      className={[
        'min-h-screen flex flex-col',
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900',
      ].join(' ')}
    >
      {/* HEADER HARMONISÉ */}
      <header
        className={[
          'no-print sticky top-0 z-20 border-b backdrop-blur',
          isDark
            ? 'bg-slate-950/95 border-slate-800'
            : 'bg-white/95 border-slate-200 shadow-sm',
        ].join(' ')}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          {/* Bloc gauche : brand + contexte */}
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              CORE · Sistema centrale di cantiere
            </div>
            <div className="text-xs text-slate-400">
              Modulo Direzione ·{' '}
              <span className="font-semibold">
                Presenze · produzione · archivio
              </span>
            </div>
          </div>

          {/* Bloc droite : thème + connexion + user */}
          <div className="flex items-center gap-3 text-[11px]">
            {/* Switch Dark/Light */}
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

            {/* ConnectionIndicator existant */}
            <ConnectionIndicator />

            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-slate-400">Utente Direzione</span>
              <span className="text-slate-50 font-medium">{displayName}</span>
            </div>
            <button
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
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex flex-1 min-h-0 relative">
        {/* SIDEBAR */}
        <aside
          className={[
            'no-print w-60 border-r px-3 py-4 flex flex-col gap-5',
            isDark
              ? 'bg-slate-950 border-slate-800'
              : 'bg-slate-50 border-slate-200',
          ].join(' ')}
        >
          {/* Blocco principale */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Direzione
            </div>
            <nav className="space-y-1.5">
              <Link
                to="/direction"
                className={navItemClasses(
                  location.pathname === '/direction' ||
                    location.pathname === '/direction/',
                )}
              >
                Panoramica &amp; Presenze
              </Link>
              <Link
                to="/direction/presentazione"
                className={navItemClasses(
                  isActive('/direction/presentazione'),
                )}
              >
                Presentazione CORE
              </Link>
              <Link
                to="/ufficio"
                className={navItemClasses(isActive('/ufficio'))}
              >
                Area Ufficio · Rapportini
              </Link>
            </nav>
          </div>

          {/* Sezione ARCHIVE */}
          <div className="mt-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Archive · Storico
            </div>
            <nav className="space-y-1.5">
              <Link
                to="/direction/archive"
                className={navItemClasses(isActive('/direction/archive'))}
              >
                Rapportini v1 · Archivio
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

        {/* CONTENT – routes internes Direzione */}
        <main
          className={[
            'flex-1 min-h-0 overflow-y-auto p-4 md:p-6',
            isDark ? 'bg-slate-950' : 'bg-slate-100',
          ].join(' ')}
        >
          <div className="max-w-6xl mx-auto space-y-4">
            <Routes>
              {/* /direction */}
              <Route
                path="/"
                element={<DirectionDashboard isDark={isDark} />}
              />
              {/* /direction/presentazione */}
              <Route
                path="presentazione"
                element={<CorePresentation />}
              />
              {/* /direction/archive */}
              <Route path="archive" element={<ArchivePage />} />
            </Routes>
          </div>
        </main>

        {/* POPUP PRESENTATION CORE PREMIUM (simple) */}
        {showPresentationModal && (
          <CorePresentationPopup
            onOpen={handleOpenPresentation}
            onClose={handleDismissPresentation}
          />
        )}
      </div>
    </div>
  );
}
