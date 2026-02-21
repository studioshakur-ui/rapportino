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

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-200">Users</div>
        {loading ? (
          <div className="text-[11px] text-slate-500">Loading…</div>
        ) : (
          <div className="text-[11px] text-slate-500">{rows.length} rows</div>
        )}
      </div>

      <div className="overflow-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50">
            <tr className="text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Identity</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[12px] text-slate-500">
                  {loading ? "Loading…" : "No users"}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selectedUserId === row.id;

                const isSuspended = canSuspend ? !!row.disabled_at : false;
                const mustChange = !!row.must_change_password;
                const isAdmin = String(row.app_role || "").toUpperCase() === "ADMIN";

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-slate-800/70 hover:bg-slate-900/20 cursor-pointer",
                      isSelected && "bg-slate-900/30"
                    )}
                    onClick={() => onSelect(row.id)}
                  >
                    <td className="px-4 py-3">
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
                              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                                MUST CHANGE PASSWORD
                              </span>
                            ) : null}

                            {isAdmin ? (
                              <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-100">
                                ADMIN
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                        {row.app_role || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {!canSuspend ? (
                        <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/50 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                          UNKNOWN
                        </span>
                      ) : isSuspended ? (
                        <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-100">
                          SUSPENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                          ACTIVE
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
