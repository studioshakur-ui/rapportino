// src/admin/users/components/UserDrawer.tsx

import type { ReactNode } from "react";
import { cn } from "./ui";
import UfficioScopePanel from "./UfficioScopePanel";

export default function UserDrawer(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: ReactNode;
  user?: any;
  onResetPwd?: () => Promise<void> | void;
  onSuspend?: () => void;
  onReactivate?: () => Promise<void> | void;
  onHardDelete?: () => void;
  canSuspend?: boolean;
  busy?: boolean;
}) {
  const {
    open,
    title = "Dettagli utente",
    onClose,
    children,
    user,
    onResetPwd,
    onSuspend,
    onReactivate,
    onHardDelete,
    canSuspend,
    busy,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] theme-scope" role="dialog" aria-modal="true">
      <div className="absolute inset-0 theme-overlay" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 w-[min(520px,96vw)]">
        <div className={cn("relative z-[60] h-full border-l", "theme-modal theme-border")} onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b theme-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">CNCS · Admin</div>
              <div className="mt-1 text-[16px] font-semibold text-slate-50 truncate">{title}</div>
            </div>
            <button type="button" onClick={onClose} className={cn("rounded-xl border px-3 py-2 text-[12px] font-semibold", "theme-panel-2 theme-border hover:opacity-95")}>
              Chiudi
            </button>
          </div>

          <div className="p-5 h-[calc(100%-74px)] overflow-y-auto">
            {children ? (
              children
            ) : user ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Utente</div>
                  <div className="mt-1 text-[15px] font-semibold text-slate-100">
                    {user.display_name || user.full_name || user.email || "—"}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-400">{user.email || "—"}</div>
                  <div className="mt-1 text-[12px] text-slate-400">Ruolo: {user.app_role || "—"}</div>
                </div>

                <div className="rounded-xl border theme-border bg-[var(--panel2)] p-3 text-[12px] theme-text">
                  <div>COSTR: {user.default_costr || "—"}</div>
                  <div>COMMESSA: {user.default_commessa || "—"}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {onResetPwd ? (
                    <button
                      type="button"
                      onClick={() => void onResetPwd()}
                      disabled={Boolean(busy)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                        "theme-panel-2 theme-border hover:opacity-95",
                        Boolean(busy) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      Resetta password
                    </button>
                  ) : null}

                  {canSuspend ? (
                    user?.disabled_at ? (
                      onReactivate ? (
                        <button
                          type="button"
                          onClick={() => void onReactivate()}
                          disabled={Boolean(busy)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                            "border-emerald-500/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
                            Boolean(busy) && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        Riattiva
                      </button>
                    ) : null
                  ) : onSuspend ? (
                      <button
                        type="button"
                        onClick={onSuspend}
                        disabled={Boolean(busy)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                          "border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
                          Boolean(busy) && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        Sospendi
                      </button>
                    ) : null
                  ) : null}

                  {onHardDelete ? (
                    <button
                      type="button"
                      onClick={onHardDelete}
                      disabled={Boolean(busy)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                        "border-rose-500/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
                        Boolean(busy) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      Elimina definitivamente
                    </button>
                  ) : null}
                </div>

                {String(user?.app_role || "").toUpperCase() === "UFFICIO" ? (
                  <UfficioScopePanel ufficioUserId={String(user.id)} ufficioAllowedCantieri={user.allowed_cantieri || null} />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
