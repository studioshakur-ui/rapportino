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
import UfficioRapportiniList from './ufficio/UfficioRapportiniList';
import UfficioRapportinoDetail from './ufficio/UfficioRapportinoDetail';
import IncaFilesPanel from './inca/IncaFilesPanel';

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

function UfficioView({ isDark }) {
  const location = useLocation();

  const isHere = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');
  const j = (...p) => p.filter(Boolean).join(' ');

  const tabBase =
    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition';
  const tabOff = isDark
    ? 'border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const tabOn = isDark
    ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200 shadow-[0_16px_60px_rgba(16,185,129,0.14)]'
    : 'border-emerald-400 bg-emerald-50 text-emerald-800';

  const isTabRapportini =
    isHere('/direction/ufficio-view') &&
    !isHere('/direction/ufficio-view/inca') &&
    !isHere('/direction/ufficio-view/archive');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
            Direzione · Vista Ufficio (lettura)
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-100">
            Controllo operativo sullo stesso dato
          </div>
          <div className="text-[12px] sm:text-[13px] text-slate-400 max-w-3xl leading-relaxed">
            Vista integrata: non esci mai dalla Direzione. Serve per consultare lo stato Ufficio senza cambiare contesto.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/direction"
            className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
          >
            ← Torna a Direzione
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/direction/ufficio-view"
          className={j(tabBase, isTabRapportini ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Rapportini
        </Link>

        <Link
          to="/direction/ufficio-view/inca"
          className={j(tabBase, isHere('/direction/ufficio-view/inca') ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          INCA
        </Link>

        <Link
          to="/direction/ufficio-view/archive"
          className={j(tabBase, isHere('/direction/ufficio-view/archive') ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          Archive
        </Link>

        <span className="ml-1 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Lettura
        </span>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
        <div className="p-4 sm:p-5">
          <Routes>
            <Route path="/" element={<UfficioRapportiniList />} />
            <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
            <Route path="inca" element={<IncaFilesPanel />} />
            <Route path="archive" element={<ArchivePage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function DirectionShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const [theme, setTheme] = useState(getInitialTheme());
  const isDark = theme === 'dark';

  useEffect(() => {
    try {
      window.localStorage.setItem('core-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        'core-sidebar-collapsed-direction',
      );
      if (stored === '1') setSidebarCollapsed(true);
      if (stored === '0') setSidebarCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'core-sidebar-collapsed-direction',
        sidebarCollapsed ? '1' : '0',
      );
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const [showPresentationModal, setShowPresentationModal] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem('core-presentation-dismissed');
      if (dismissed === '1') return;
      const lastSeen = window.localStorage.getItem('core-presentation-last-seen');
      if (!lastSeen) setShowPresentationModal(true);
    } catch {
      // ignore
    }
  }, []);

  const effectiveCollapsed = sidebarCollapsed;

  const isActive = (path) => {
    const p = location.pathname || '';
    if (path === '/direction') return p === '/direction' || p === '/direction/';
    return p === path || p.startsWith(path + '/');
  };

  const navItemClasses = (active) => {
    const base =
      'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm border transition-colors';
    if (active) {
      return isDark
        ? `${base} bg-sky-500/12 border-sky-500/55 text-slate-100`
        : `${base} bg-sky-50 border-sky-400 text-slate-900`;
    }
    return isDark
      ? `${base} bg-slate-950/20 border-slate-800 text-slate-300 hover:bg-slate-900/35`
      : `${base} bg-white border-slate-200 text-slate-700 hover:bg-slate-50`;
  };

  const handleOpenPresentation = () => {
    try {
      window.localStorage.setItem('core-presentation-last-seen', String(Date.now()));
    } catch {
      // ignore
    }
    setShowPresentationModal(false);
    navigate('/direction/presentazione');
  };

  const handleDismissPresentation = () => {
    try {
      window.localStorage.setItem('core-presentation-dismissed', '1');
    } catch {
      // ignore
    }
    setShowPresentationModal(false);
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

  const roleLabel = useMemo(() => {
    const r = profile?.role || '';
    return r ? String(r).toUpperCase() : 'DIREZIONE';
  }, [profile?.role]);

  return (
    <div className={isDark ? 'min-h-screen bg-[#050910] text-slate-100' : 'min-h-screen bg-slate-50 text-slate-900'}>
      <div className="flex">
        {/* SIDEBAR */}
        <aside
          className={[
            'sticky top-0 h-screen border-r',
            isDark ? 'border-slate-800 bg-[#050910]' : 'border-slate-200 bg-white',
            effectiveCollapsed ? 'w-16' : 'w-64',
            'transition-all',
          ].join(' ')}
        >
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/30" />
                {!effectiveCollapsed && (
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      CNCS
                    </div>
                    <div className="text-sm font-semibold">Direzione</div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="rounded-xl border border-slate-800 bg-slate-950/20 px-2 py-2 text-slate-200 hover:bg-slate-900/35"
                aria-label="Toggle sidebar"
                title="Toggle sidebar"
              >
                {effectiveCollapsed ? '›' : '‹'}
              </button>
            </div>

            <div className="mt-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Ruolo
                    </div>
                    {!effectiveCollapsed && (
                      <div className="text-sm font-semibold text-slate-100">
                        {roleLabel}
                      </div>
                    )}
                  </div>
                  <ConnectionIndicator compact />
                </div>
              </div>
            </div>

            <nav className="mt-3 space-y-2">
              <Link to="/direction" className={navItemClasses(isActive('/direction'))}>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  {!effectiveCollapsed && <span>Dashboard</span>}
                </span>
              </Link>

              <Link
                to="/direction/presentazione"
                className={navItemClasses(isActive('/direction/presentazione'))}
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  {!effectiveCollapsed && <span>Presentazione</span>}
                </span>
              </Link>

              <Link
                to="/direction/ufficio-view"
                className={navItemClasses(isActive('/direction/ufficio-view'))}
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {!effectiveCollapsed && <span>Vista Ufficio</span>}
                </span>
              </Link>

              <Link
                to="/direction/archive"
                className={navItemClasses(isActive('/direction/archive'))}
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {!effectiveCollapsed && <span>Archive</span>}
                </span>
              </Link>
            </nav>

            <div className="mt-3">
              <button
                type="button"
                onClick={handleLogout}
                className={navItemClasses(false)}
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {!effectiveCollapsed && <span>Logout</span>}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <Routes>
              <Route path="/" element={<DirectionDashboard isDark={isDark} />} />
              <Route path="presentazione" element={<CorePresentation />} />

              {/* /direction/ufficio-view/* → Vista Ufficio (lettura) dentro Direzione */}
              <Route
                path="ufficio-view/*"
                element={<UfficioView isDark={isDark} />}
              />

              <Route path="archive" element={<ArchivePage />} />
            </Routes>
          </div>

          {showPresentationModal && (
            <CorePresentationPopup
              onOpen={handleOpenPresentation}
              onClose={handleDismissPresentation}
            />
          )}
        </main>
      </div>
    </div>
  );
}
