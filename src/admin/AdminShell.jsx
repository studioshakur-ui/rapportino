// src/admin/AdminShell.jsx
import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import ConnectionIndicator from "../components/ConnectionIndicator";
import { useAuth } from "../auth/AuthProvider";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

function Item({ to, label, icon, end }) {
  const location = useLocation();
  const active = end
    ? location.pathname === to || location.pathname === `${to}/`
    : location.pathname === to || location.pathname.startsWith(to + "/");

  const cls = cn(
    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm border transition-colors",
    active
      ? "bg-sky-500/12 border-sky-500/55 text-slate-100"
      : "bg-slate-950/20 border-slate-800 text-slate-300 hover:bg-slate-900/35"
  );

  return (
    <NavLink to={to} end={Boolean(end)} className={cls} title={label}>
      <span className="text-slate-300">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function IconUsers() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M16 11a4 4 0 1 0-8 0" stroke="currentColor" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" />
    </svg>
  );
}

function IconWorkers() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M7 20v-2a5 5 0 0 1 10 0v2" stroke="currentColor" />
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" />
      <path d="M4 20h16" stroke="currentColor" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" />
      <path d="M4 9h16" stroke="currentColor" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke="currentColor" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" stroke="currentColor" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v5l3 2" stroke="currentColor" />
      <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" />
      <path d="M3 4v4h4" stroke="currentColor" />
    </svg>
  );
}

export default function AdminShell() {
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.full_name || profile?.email || "Admin";
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Admin logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  const location = useLocation();
  const isBareAdmin = location.pathname === "/admin" || location.pathname === "/admin/";
  if (isBareAdmin) return <Navigate to="/admin/users" replace />;

  return (
    <div className="min-h-screen bg-[#050910] text-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "no-print sticky top-0 h-screen border-r border-slate-800 bg-[#050910] flex flex-col",
            collapsed ? "w-[92px] px-2 py-4" : "w-72 px-3 py-4",
            "transition-[width] duration-200"
          )}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/30" />
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      CNCS
                    </div>
                    <div className="text-sm font-semibold truncate">ADMIN</div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="rounded-xl border border-slate-800 bg-slate-950/20 hover:bg-slate-900/35 text-slate-300 px-2 py-2"
                title={collapsed ? "Espandi menu" : "Riduci menu"}
              >
                {collapsed ? "›" : "‹"}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              {!collapsed ? (
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Profilo
                  </div>
                  <div className="text-sm font-semibold truncate">{displayName}</div>
                </div>
              ) : null}
              <ConnectionIndicator compact />
            </div>
          </div>

          <nav className={cn("mt-3 space-y-2", collapsed ? "px-0" : "px-1")}>
            <Item
              to="/admin/users"
              label={collapsed ? "" : "Utenti"}
              icon={<IconUsers />}
              end
            />
            <Item
              to="/admin/operators"
              label={collapsed ? "" : "Operatori"}
              icon={<IconWorkers />}
            />
            <Item
              to="/admin/planning"
              label={collapsed ? "" : "Planning (overview)"}
              icon={<IconCalendar />}
            />
            <Item
              to="/admin/assignments"
              label={collapsed ? "" : "Manager ↔ Capo"}
              icon={<IconLink />}
            />
            <Item
              to="/admin/audit"
              label={collapsed ? "" : "Audit planning"}
              icon={<IconHistory />}
            />
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-600">
            <div>CORE · Admin Console</div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          <header className="no-print sticky top-0 z-30 rounded-2xl border border-slate-800 bg-[#050910]/70 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">
                  ADMIN · CNCS / CORE
                </div>
                <div className="text-sm font-semibold truncate">Console Admin</div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="hidden sm:inline-flex max-w-[260px] truncate rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] border-slate-800 bg-slate-950/20 text-slate-200"
                  title={displayName}
                >
                  {displayName}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-900/25 transition"
                  title="Logout"
                  aria-label="Logout"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto space-y-4 pt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
