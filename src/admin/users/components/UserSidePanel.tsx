// src/admin/users/components/UserSidePanel.tsx

import { useMemo } from "react";
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
      <div className="rounded-2xl theme-panel p-5">
        <div className="kicker">Dettagli</div>
        <div className="mt-2 text-[13px] theme-text-muted">Seleziona un utente dalla lista.</div>
      </div>
    );
  }

  const cantieri = (user.allowed_cantieri || []).filter(Boolean);
  const scope = [user.default_costr, user.default_commessa].filter(Boolean).join(" · ") || "—";

  const disabledAt = (user as any).disabled_at as string | null | undefined;
  const status = disabledAt ? "SUSPENDED" : "ACTIVE";

  return (
    <div className="rounded-2xl theme-panel overflow-hidden">
      <div className="p-5 border-b theme-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="kicker">User</div>
          <div className="mt-1 flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-2xl border theme-border",
                "bg-[var(--panel2)] flex items-center justify-center",
                "text-[12px] font-extrabold tracking-[0.12em] theme-text"
              )}
            >
              {initialsFromName(name)}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold theme-text truncate">{name}</div>
              <div className="text-[12px] theme-text-muted truncate">{user.email || "—"}</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "rounded-full border px-3 py-2 text-[12px] font-semibold",
            "theme-panel-2 theme-border hover:opacity-95"
          )}
        >
          Chiudi
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-6">
            <div className="kicker">Ruolo</div>
            <div className="mt-1 text-[13px] theme-text">{user.app_role || "—"}</div>
          </div>
          <div className="col-span-6">
            <div className="kicker">Status</div>
            <div className="mt-1 text-[13px] theme-text">{status}</div>
            {disabledAt ? <div className="mt-1 text-[12px] theme-text-muted">Disabled: {formatDateShort(disabledAt)}</div> : null}
          </div>

          <div className="col-span-12">
            <div className="kicker">Scope</div>
            <div className="mt-1 text-[13px] theme-text">{scope}</div>
            <div className="mt-1 text-[12px] theme-text-muted">Cantieri: {cantieri.length ? cantieri.join(", ") : "—"}</div>
          </div>

          <div className="col-span-6">
            <div className="kicker">Creato</div>
            <div className="mt-1 text-[13px] theme-text">{formatDateShort((user as any).created_at)}</div>
          </div>
          <div className="col-span-6">
            <div className="kicker">Aggiornato</div>
            <div className="mt-1 text-[13px] theme-text">{formatDateShort((user as any).updated_at)}</div>
          </div>
        </div>

        <div className="rounded-2xl theme-panel-2 p-4">
          <div className="kicker">Azioni</div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={onResetPwd}
              disabled={!!busy}
              className={cn(
                "rounded-xl border px-4 py-2 text-[12px] font-semibold",
                busy
                  ? "theme-panel-2 theme-border opacity-60"
                  : "theme-panel-2 theme-border hover:opacity-95"
              )}
            >
              Reset password
            </button>

            <button
              type="button"
              onClick={onSuspend}
              disabled={!!busy}
              className={cn(
                "rounded-xl px-4 py-2 text-[12px] font-semibold",
                busy
                  ? "theme-panel-2 theme-border opacity-60"
                  : "badge-warning"
              )}
            >
              Suspend
            </button>

            <button
              type="button"
              onClick={onHardDelete}
              disabled={!!busy}
              className={cn(
                "rounded-xl px-4 py-2 text-[12px] font-semibold",
                busy
                  ? "theme-panel-2 theme-border opacity-60"
                  : "badge-danger"
              )}
            >
              Hard delete
            </button>
          </div>
        </div>

        <div className="text-[11px] theme-text-muted break-all">
          User ID: <span className="theme-text-muted">{user.id}</span>
        </div>
      </div>
    </div>
  );
}
