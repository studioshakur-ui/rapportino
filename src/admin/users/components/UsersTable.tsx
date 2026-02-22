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
        <div className="text-[12px] font-semibold theme-text">Users</div>
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

                // =========================================================
                // CNCS-grade activity truth:
                // - MUST be based on auth.users.last_sign_in_at (via RPC)
                // - profiles.updated_at/created_at are NOT activity
                // =========================================================
                const lastSignInDays = daysSince(row.last_sign_in_at ?? null);
                const authCreatedDays = daysSince(row.auth_created_at ?? null);

                const hasAuthSignal = row.last_sign_in_at != null || row.auth_created_at != null;
                const neverLoggedIn = row.last_sign_in_at == null && row.auth_created_at != null;

                const isInactive = hasAuthSignal
                  ? lastSignInDays != null
                    ? lastSignInDays > 30
                    : neverLoggedIn
                      ? authCreatedDays != null && authCreatedDays > 30
                      : false
                  : false;

                return (
                  <tr
                    key={row.id}
                    className={cn("border-t theme-border cursor-pointer", isSelected && "bg-[var(--accent-soft)]")}
                    onClick={() => onSelect(row.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-9 w-9 rounded-xl border theme-border bg-[var(--panel)] flex items-center justify-center text-[12px] font-bold theme-text">
                          {(row.display_name || row.full_name || row.email || "?")
                            .trim()
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold theme-text truncate">
                            {row.display_name || row.full_name || row.email || "—"}
                          </div>
                          <div className="text-[12px] theme-text-muted truncate">{row.email || "—"}</div>

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {mustChange ? <span className="chip chip-alert">MUST CHANGE PASSWORD</span> : null}

                            {hasAuthSignal ? (
                              <>
                                {neverLoggedIn ? <span className="chip chip-info">NEVER LOGGED IN</span> : null}

                                {isInactive ? <span className="chip chip-danger">INACTIVE &gt;30d</span> : null}
                              </>
                            ) : (
                              <span className="chip chip-status">ACTIVITY UNKNOWN</span>
                            )}

                            {isCritical ? <span className="chip chip-info">CRITICAL ROLE</span> : null}

                            {isAdmin ? <span className="chip chip-status">ADMIN</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <span className="chip chip-status" style={{ fontSize: 11, padding: "4px 12px" }}>
                        {row.app_role || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      {!canSuspend ? (
                        <span className="chip chip-status" style={{ fontSize: 11, padding: "4px 12px" }}>
                          UNKNOWN
                        </span>
                      ) : isSuspended ? (
                        <span className="chip chip-danger" style={{ fontSize: 11, padding: "4px 12px" }}>
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="chip chip-success" style={{ fontSize: 11, padding: "4px 12px" }}>
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