// src/admin/users/components/UserDrawer.tsx

import { useMemo } from "react";
import type { ProfileRow } from "../hooks/useAdminUsersData";
import { cn } from "./ui";

export default function UserDrawer(props: {
  open: boolean;
  user: ProfileRow | null;
  onClose: () => void;

  onResetPwd: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onHardDelete: () => void;

  canSuspend: boolean;
  busy: boolean;
}) {
  const { open, user, onClose, onResetPwd, onSuspend, onReactivate, onHardDelete, canSuspend, busy } = props;

  const isAdmin = useMemo(() => String(user?.app_role || "").toUpperCase() === "ADMIN", [user?.app_role]);
  const mustChange = useMemo(() => !!user?.must_change_password, [user?.must_change_password]);
  const isSuspended = useMemo(() => (canSuspend ? !!user?.disabled_at : false), [canSuspend, user?.disabled_at]);

  const title = user?.display_name || user?.full_name || user?.email || "—";
  const email = user?.email || "—";

  const primaryActionLabel = isSuspended ? "Reactivate" : "Suspend";
  const primaryActionClass = isSuspended
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
    : "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15";

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-[60] w-[420px] max-w-[92vw]",
        "transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full"
      )}
      aria-hidden={!open}
    >
      {/* Backdrop click */}
      {open ? (
        <div
          className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative z-[60] h-full border-l border-slate-800 bg-[#050910] shadow-[0_20px_80px_rgba(0,0,0,0.65)]">
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-slate-400">User</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-100 truncate">{title}</div>
            <div className="mt-0.5 text-[12px] text-slate-400 truncate">{email}</div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {/* Status */}
              {!canSuspend ? (
                <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  UNKNOWN
                </span>
              ) : isSuspended ? (
                <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
                  SUSPENDED
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                  ACTIVE
                </span>
              )}

              {/* Signals */}
              {mustChange ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                  MUST CHANGE PASSWORD
                </span>
              ) : null}

              {isAdmin ? (
                <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-100">
                  HIGH PRIVILEGE
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-slate-900/40"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-[12px] font-semibold text-slate-200">Role</div>
            <div className="mt-2 inline-flex items-center rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-[12px] font-semibold text-slate-200">
              {user?.app_role || "—"}
            </div>

            {isAdmin ? (
              <div className="mt-3 text-[12px] text-slate-400">
                This account has <span className="text-slate-200 font-semibold">high privileges</span>. Actions are
                audited.
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-[12px] font-semibold text-slate-200">Security</div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onResetPwd}
                disabled={busy}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition",
                  busy
                    ? "border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
                )}
              >
                Reset password
                <div className="mt-0.5 text-[11px] font-normal text-slate-400">
                  Generates new credentials (shown once) and forces password change at first login.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!canSuspend) return;
                  if (isSuspended) onReactivate();
                  else onSuspend();
                }}
                disabled={busy || !canSuspend}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition",
                  !canSuspend
                    ? "border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed"
                    : busy
                      ? "border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed"
                      : primaryActionClass
                )}
              >
                {primaryActionLabel}
                <div className="mt-0.5 text-[11px] font-normal text-slate-400">
                  {isSuspended
                    ? "Restores access without deleting historical data."
                    : "Blocks access without deleting historical data."}
                </div>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
            <div className="text-[12px] font-semibold text-rose-100">Danger zone</div>

            <button
              type="button"
              onClick={onHardDelete}
              disabled={busy}
              className={cn(
                "mt-3 w-full rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition",
                busy
                  ? "border-rose-500/20 bg-rose-500/5 text-rose-200/40 cursor-not-allowed"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
              )}
            >
              Hard delete
              <div className="mt-0.5 text-[11px] font-normal text-rose-200/80">
                Irreversible. Deletes Auth user and profile references.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
