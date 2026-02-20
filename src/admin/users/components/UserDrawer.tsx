// src/admin/users/components/UserDrawer.tsx

import { useEffect, useMemo, useState } from "react";
import type { ProfileRow } from "../hooks/useAdminUsersData";
import { cn, formatDateShort, initialsFromName } from "./ui";

function getStatus(user: ProfileRow): { label: string; hint?: string } {
  const disabledAt = (user as any).disabled_at as string | null | undefined;
  if (disabledAt) return { label: "SUSPENDED", hint: `Disabled: ${formatDateShort(disabledAt)}` };
  return { label: "ACTIVE" };
}

export default function UserDrawer(props: {
  open: boolean;
  user: ProfileRow | null;
  onClose: () => void;
  onResetPwd: () => void;
  onSuspend: () => void;
  onHardDelete: () => void;
  busy?: boolean;
}) {
  const { open, user, onClose, onResetPwd, onSuspend, onHardDelete, busy } = props;

  const [dangerOpen, setDangerOpen] = useState(false);

  useEffect(() => {
    if (!open) setDangerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const name = useMemo(() => {
    if (!user) return "";
    return (user.display_name || user.full_name || user.email || "—").toString();
  }, [user]);

  if (!open || !user) return null;

  const cantieri = (user.allowed_cantieri || []).filter(Boolean);
  const scope = [user.default_costr, user.default_commessa].filter(Boolean).join(" · ") || "—";
  const status = getStatus(user);

  return (
    <div className="fixed inset-0 z-[2000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onMouseDown={(e) => {
          // Only close when clicking the backdrop, not when dragging from inside the drawer.
          if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* Drawer */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full sm:w-[520px]",
          "border-l border-slate-800 bg-[#050910]",
          "shadow-[-20px_0_80px_rgba(0,0,0,0.75)]",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Utente</div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-2xl border border-slate-800",
                    "bg-slate-950/60 flex items-center justify-center",
                    "text-[12px] font-extrabold tracking-[0.12em] text-slate-200"
                  )}
                >
                  {initialsFromName(name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-50 truncate">{name}</div>
                  <div className="text-[12px] text-slate-400 truncate">{user.email || "—"}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]",
                    "border-slate-800 bg-slate-950/60 text-slate-200"
                  )}
                >
                  {(user.app_role || "—").toString()}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]",
                    status.label === "SUSPENDED"
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
                      : "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                  )}
                >
                  {status.label}
                </span>
              </div>

              {status.hint ? <div className="mt-2 text-[12px] text-slate-400">{status.hint}</div> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "rounded-full border px-3 py-2 text-[12px] font-semibold",
                "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
              )}
              title="Chiudi (Esc)"
            >
              Chiudi
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-auto">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Scope</div>
              <div className="mt-1 text-[13px] text-slate-100">{scope}</div>
              <div className="mt-2 text-[12px] text-slate-400">Cantieri: {cantieri.length ? cantieri.join(", ") : "—"}</div>
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Creato</div>
                <div className="mt-1 text-[13px] text-slate-100">{formatDateShort((user as any).created_at)}</div>
              </div>
              <div className="col-span-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Aggiornato</div>
                <div className="mt-1 text-[13px] text-slate-100">{formatDateShort((user as any).updated_at)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">ID</div>
              <div className="mt-2 text-[12px] text-slate-300 break-all">{user.id}</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Danger zone</div>
                  <div className="mt-1 text-[12px] text-slate-400">
                    Azioni irreversibili. Usa solo se sei sicuro al 100%.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDangerOpen((v) => !v)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                    dangerOpen
                      ? "border-rose-500/45 bg-rose-500/10 text-rose-100"
                      : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  {dangerOpen ? "Hide" : "Show"}
                </button>
              </div>

              {dangerOpen ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onHardDelete}
                    disabled={!!busy}
                    className={cn(
                      "w-full rounded-xl border px-4 py-2 text-[12px] font-semibold",
                      busy
                        ? "border-slate-800 bg-slate-950/40 text-slate-500"
                        : "border-rose-500/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                    )}
                  >
                    Hard delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-[#050910]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onResetPwd}
              disabled={!!busy}
              className={cn(
                "rounded-xl border px-4 py-2 text-[12px] font-semibold",
                busy
                  ? "border-slate-800 bg-slate-950/40 text-slate-500"
                  : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
              )}
            >
              Reset password
            </button>

            <button
              type="button"
              onClick={onSuspend}
              disabled={!!busy}
              className={cn(
                "rounded-xl border px-4 py-2 text-[12px] font-semibold",
                busy
                  ? "border-slate-800 bg-slate-950/40 text-slate-500"
                  : "border-amber-500/45 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
              )}
            >
              Suspend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
