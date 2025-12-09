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
import CorePresentationPopup from "./components/CorePresentationPopup";
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

  // Afficher le popup une fois tant qu'il n'a pas été explicitement fermé
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

        {/* POPUP PRESENTATION CORE PREMIUM */}
        {showPresentationModal && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl mx-4 rounded-3xl border border-sky-500/40 bg-slate-950/95 shadow-2xl shadow-sky-900/50">
              {/* Bandeau top */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/80">
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-sky-400">
                    CORE · Direzione
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    Presentazione silenziosa del flusso reale
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismissPresentation}
                  className="text-[11px] px-2 py-1 rounded-full border border-slate-700 text-slate-400 hover:bg-slate-900"
                >
                  Chiudi
                </button>
              </div>

              {/* Contenu */}
              <div className="px-5 pt-4 pb-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Abbiamo preparato una pagina dedicata per la Direzione che
                    mostra, senza marketing, la differenza tra il flusso
                    operativo attuale e il flusso con CORE.
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Non è una demo commerciale. È una radiografia di sistema:
                    cantiere → ufficio → INCA → decisione.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="rounded-2xl border border-red-900/60 bg-red-950/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-red-300 mb-1">
                      Flusso attuale
                    </div>
                    <ul className="space-y-1 text-slate-200">
                      <li>WhatsApp · messaggi · foto</li>
                      <li>Riscritture e interpretazioni</li>
                      <li>Decisioni in ritardo</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-sky-800 bg-slate-950/60 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-sky-300 mb-1">
                      Flusso CORE
                    </div>
                    <ul className="space-y-1 text-slate-200">
                      <li>Inserimento unico dal cantiere</li>
                      <li>Dati strutturati e tracciabili</li>
                      <li>Stessa informazione per tutti</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 mb-1">
                      Scopo della pagina
                    </div>
                    <ul className="space-y-1 text-slate-200">
                      <li>Nessun giudizio sulle persone</li>
                      <li>Nessuna richiesta immediata</li>
                      <li>Solo una lettura per la Direzione</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">
                    Quando avrà 5 minuti, la Direzione può aprire la pagina e
                    vedere il confronto tra i due flussi.  
                    <span className="block sm:inline text-slate-300">
                      Se non toglie lavoro e pressione reale, si spegne. E non
                      succede nulla.
                    </span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-end">
                    <button
                      type="button"
                      onClick={handleOpenPresentation}
                      className="px-4 py-2 rounded-full border border-sky-500 bg-sky-600/20 text-[12px] font-medium text-sky-100 hover:bg-sky-500/30"
                    >
                      Apri presentazione CORE
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissPresentation}
                      className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] text-slate-400 hover:bg-slate-900"
                    >
                      Magari dopo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
