// src/admin/users/components/UsersTable.tsx

import { useMemo } from "react";
import type { ProfileRow } from "../hooks/useAdminUsersData";
import { cn, formatDateShort, initialsFromName } from "./ui";
import UserActionsMenu, { type UserAction } from "./UserActionsMenu";

function statusBadge(row: ProfileRow): { label: string; cls: string } {
  const disabled = Boolean((row as any).disabled_at);
  if (disabled) {
    return { label: "SUSPENDED", cls: "border-amber-500/35 bg-amber-500/10 text-amber-100" };
  }
  return { label: "ACTIVE", cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100" };
}

export default function UsersTable(props: {
  rows: ProfileRow[];
  loading: boolean;
  canSuspend: boolean;
  selectedUserId: string | null;
  onSelect: (id: string) => void;
  onAction: (row: ProfileRow, action: UserAction) => void;
}) {
  const { rows, loading, canSuspend, selectedUserId, onSelect, onAction } = props;

  const empty = !loading && rows.length === 0;

  const headers = useMemo(
    () => [
      { key: "user", label: "Utente" },
      { key: "role", label: "Ruolo" },
      { key: "scope", label: "Scope" },
      { key: "status", label: "Status" },
      { key: "created", label: "Creato" },
      { key: "actions", label: "" },
    ],
    []
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="overflow-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-950/60">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={cn(
                    "px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-slate-500",
                    h.key === "actions" ? "text-right" : ""
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nessun risultato.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const selected = selectedUserId === r.id;
                const name = (r.display_name || r.full_name || r.email || "—").toString();
                const badge = statusBadge(r);

                const cantieri = (r.allowed_cantieri || []).filter(Boolean);
                const scope = [r.default_costr, r.default_commessa].filter(Boolean).join(" · ") || "—";

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelect(r.id)}
                    className={cn(
                      "cursor-pointer",
                      selected ? "bg-slate-50/5" : "hover:bg-slate-900/25",
                      "transition-colors"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl border border-slate-800",
                            "bg-slate-950/60 flex items-center justify-center",
                            "text-[12px] font-extrabold tracking-[0.12em] text-slate-200"
                          )}
                        >
                          {initialsFromName(name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-50 truncate">{name}</div>
                          <div className="text-[12px] text-slate-400 truncate">{r.email || "—"}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]",
                          "border-slate-800 bg-slate-950/60 text-slate-200"
                        )}
                      >
                        {(r.app_role || "—").toString()}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-[12px] text-slate-200">{scope}</div>
                      <div className="mt-1 text-[12px] text-slate-400">
                        {cantieri.length ? `Cantieri: ${cantieri.length}` : "Cantieri: —"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]",
                          badge.cls
                        )}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[12px] text-slate-300">{formatDateShort((r as any).created_at)}</td>

                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end">
                        <UserActionsMenu canSuspend={canSuspend} onAction={(a) => onAction(r, a)} />
                      </div>
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