// src/admin/users/components/UsersTable.tsx

import type { ProfileRow } from "../hooks/useAdminUsersData";
import UserActionsMenu, { type UserAction } from "./UserActionsMenu";
import { cn } from "./ui";

export default function UsersTable(props: {
  rows: ProfileRow[];
  loading: boolean;
  canSuspend: boolean;
  selectedUserId: string | null;
  onSelect: (id: string) => void;
  onAction: (row: ProfileRow, action: UserAction) => void;
}) {
  const { rows, loading, canSuspend, selectedUserId, onSelect, onAction } = props;

  const daysSince = (iso?: string | null): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    const diffMs = Date.now() - t;
    return diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
  };

  return (
    <div className="rounded-2xl theme-table overflow-hidden">
      <div className="px-4 py-3 border-b theme-border flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-200">Users</div>
        {loading ? (
          <div className="text-[11px] theme-text-muted">Loading…</div>
        ) : (
          <div className="text-[11px] theme-text-muted">{rows.length} rows</div>
        )}
      </div>

      <div className="overflow-auto">
        <table className="w-full text-left">
          <thead className="theme-table-head sticky top-0 z-10 backdrop-blur">
            <tr className="text-[11px] uppercase tracking-wide">
              <th className="px-5 py-3 font-semibold">Identity</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[12px] theme-text-muted">
                  {loading ? "Loading…" : "No users"}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selectedUserId === row.id;

                const isSuspended = canSuspend ? !!row.disabled_at : false;
                const mustChange = !!row.must_change_password;
                const role = String(row.app_role || "").toUpperCase();
                const isAdmin = role === "ADMIN";
                const isCritical = role === "ADMIN" || role === "DIREZIONE";
                const lastActivity = row.updated_at || row.created_at || null;
                const inactivityDays = daysSince(lastActivity);
                const isInactive = typeof inactivityDays === "number" && inactivityDays > 30;

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t theme-border hover:bg-[var(--panel2)] cursor-pointer",
                      isSelected && "bg-slate-900/30"
                    )}
                    onClick={() => onSelect(row.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-[12px] font-bold text-slate-300">
                          {(row.display_name || row.full_name || row.email || "?")
                            .trim()
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-slate-100 truncate">
                            {row.display_name || row.full_name || row.email || "—"}
                          </div>
                          <div className="text-[12px] text-slate-400 truncate">{row.email || "—"}</div>

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {mustChange ? (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold badge-warning">
                                MUST CHANGE PASSWORD
                              </span>
                            ) : null}

                            {isInactive ? (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold badge-danger">
                                INACTIVE &gt;30d
                              </span>
                            ) : null}

                            {isCritical ? (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold badge-info">
                                CRITICAL ROLE
                              </span>
                            ) : null}

                            {isAdmin ? (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold badge-neutral">
                                ADMIN
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold badge-neutral">
                        {row.app_role || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      {!canSuspend ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold badge-neutral">
                          UNKNOWN
                        </span>
                      ) : isSuspended ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold badge-danger">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold badge-success">
                          ACTIVE
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <UserActionsMenu
                        disabled={loading}
                        canSuspend={canSuspend}
                        isSuspended={isSuspended}
                        onAction={(action) => onAction(row, action)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
