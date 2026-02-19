// src/admin/users/components/UserSidePanel.tsx

import React, { useMemo } from "react";
import type { ProfileRow } from "../hooks/useAdminUsersData";
import { cn, formatDateShort, initialsFromName } from "./ui";

export default function UserSidePanel(props: {
  user: ProfileRow | null;
  onClose: () => void;
  onResetPwd: () => void;
  onSuspend: () => void;
  onHardDelete: () => void;
  busy?: boolean;
}) {
  const { user, onClose, onResetPwd, onSuspend, onHardDelete, busy } = props;

  const name = useMemo(() => {
    if (!user) return "";
    return (user.display_name || user.full_name || user.email || "—").toString();
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-5">
        <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Dettagli</div>
        <div className="mt-2 text-[13px] text-slate-400">Seleziona un utente dalla lista.</div>
      </div>
    );
  }

  const cantieri = (user.allowed_cantieri || []).filter(Boolean);
  const scope = [user.default_costr, user.default_commessa].filter(Boolean).join(" · ") || "—";

  const disabledAt = (user as any).disabled_at as string | null | undefined;
  const status = disabledAt ? "SUSPENDED" : "ACTIVE";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">User</div>
          <div className="mt-1 flex items-center gap-3">
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
              <div className="text-[14px] font-semibold text-slate-50 truncate">{name}</div>
              <div className="text-[12px] text-slate-400 truncate">{user.email || "—"}</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "rounded-full border px-3 py-2 text-[12px] font-semibold",
            "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
          )}
        >
          Chiudi
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Ruolo</div>
            <div className="mt-1 text-[13px] text-slate-100">{user.app_role || "—"}</div>
          </div>
          <div className="col-span-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Status</div>
            <div className="mt-1 text-[13px] text-slate-100">{status}</div>
            {disabledAt ? <div className="mt-1 text-[12px] text-slate-400">Disabled: {formatDateShort(disabledAt)}</div> : null}
          </div>

          <div className="col-span-12">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Scope</div>
            <div className="mt-1 text-[13px] text-slate-100">{scope}</div>
            <div className="mt-1 text-[12px] text-slate-400">Cantieri: {cantieri.length ? cantieri.join(", ") : "—"}</div>
          </div>

          <div className="col-span-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Creato</div>
            <div className="mt-1 text-[13px] text-slate-100">{formatDateShort((user as any).created_at)}</div>
          </div>
          <div className="col-span-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Aggiornato</div>
            <div className="mt-1 text-[13px] text-slate-100">{formatDateShort((user as any).updated_at)}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Azioni</div>
          <div className="mt-3 grid grid-cols-1 gap-2">
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

            <button
              type="button"
              onClick={onHardDelete}
              disabled={!!busy}
              className={cn(
                "rounded-xl border px-4 py-2 text-[12px] font-semibold",
                busy
                  ? "border-slate-800 bg-slate-950/40 text-slate-500"
                  : "border-rose-500/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
              )}
            >
              Hard delete
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 break-all">
          User ID: <span className="text-slate-400">{user.id}</span>
        </div>
      </div>
    </div>
  );
}