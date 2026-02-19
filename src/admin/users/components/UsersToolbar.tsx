// src/admin/users/components/UsersToolbar.tsx

import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "./ui";
import type { RoleFilter } from "../hooks/useAdminUsersUi";

const ROLES: Array<{ id: RoleFilter; label: string }> = [
  { id: "ALL", label: "ALL" },
  { id: "CAPO", label: "CAPO" },
  { id: "UFFICIO", label: "UFFICIO" },
  { id: "MANAGER", label: "MANAGER" },
  { id: "DIREZIONE", label: "DIREZIONE" },
  { id: "ADMIN", label: "ADMIN" },
];

export default function UsersToolbar(props: {
  q: string;
  onQ: (v: string) => void;
  role: RoleFilter;
  onRole: (r: RoleFilter) => void;
  total: number;
  loading: boolean;
  onRefresh: () => void;
  onInvite: () => void;
}) {
  const { q, onQ, role, onRole, total, loading, onRefresh, onInvite } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div className="sticky top-0 z-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/50 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS · Admin</div>
              <div className="mt-1 text-[16px] font-semibold text-slate-50">Utenti</div>
              <div className="mt-1 text-[12px] text-slate-400">Ctrl/⌘ + K per cercare</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                  "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
                )}
              >
                {loading ? "Aggiorno…" : "Refresh"}
              </button>

              <button
                type="button"
                onClick={onInvite}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                  "border-sky-400/45 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
                )}
              >
                Invite
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => onQ(e.target.value)}
                placeholder="Search email, name, role, costr, commessa…"
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-[14px]",
                  "border-slate-800 bg-slate-950/60 text-slate-50",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                )}
              />
            </div>

            <div className="lg:col-span-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const active = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onRole(r.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]",
                        active
                          ? "border-sky-400/45 bg-sky-500/10 text-sky-100"
                          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-900/40"
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              <div className="text-[12px] text-slate-400">
                {loading ? "Loading…" : ""}
                <span className="ml-2">Totale: </span>
                <span className="text-slate-200 font-semibold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}