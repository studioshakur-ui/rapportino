// src/shells/CommandShell.tsx
// CORE COMMAND cockpit shell — single-user, mobile-first.
import { type FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const NAV = [
  { to: "/command/center",     label: "Command Center" },
  { to: "/command/timeline",   label: "Timeline" },
  { to: "/command/priorities", label: "Priorités" },
  { to: "/command/intake",     label: "WhatsApp Intake" },
  { to: "/command/inca",       label: "INCA" },
] as const;

export default function CommandShell() {
  const navigate = useNavigate();
  const { signOut } = useAuth() as { signOut: (a: { reason: string }) => Promise<void> };
  const [cableQuery, setCableQuery] = useState("");

  function handleCableSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCode = cableQuery.trim();
    if (!nextCode) return;

    navigate(`/command/cable/${encodeURIComponent(nextCode)}?source=shell-search`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold tracking-tight text-sm">CORE COMMAND</span>
            <button
              onClick={() => signOut({ reason: "manual" })}
              className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0 lg:hidden"
            >
              Déco
            </button>
          </div>

          <form
            onSubmit={handleCableSearch}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950/60 lg:min-w-[320px]"
          >
            <input
              type="text"
              value={cableQuery}
              onChange={(event) => setCableQuery(event.target.value)}
              placeholder="Chercher un câble (ex: N AH 173)"
              className="w-full bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              Ouvrir
            </button>
          </form>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          </nav>
          <button
            onClick={() => signOut({ reason: "manual" })}
            className="hidden shrink-0 text-xs text-zinc-400 hover:text-zinc-600 lg:inline"
          >
            Déco
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
