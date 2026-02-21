// src/admin/users/AdminUsersPage.tsx

import React, { useCallback, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { t } from "../i18n";

import { useAdminUsersData } from "./hooks/useAdminUsersData";
import { PAGE_SIZE, type RoleFilter, useAdminUsersUi } from "./hooks/useAdminUsersUi";
import { useAdminUsersPersist } from "./hooks/useAdminUsersPersist";

import UsersToolbar from "./components/UsersToolbar";
import UsersTable from "./components/UsersTable";
import UserDrawer from "./components/UserDrawer";
import InviteUserDialog from "./components/InviteUserDialog";
import DangerConfirmDialog, { type DangerMode } from "./components/DangerConfirmDialog";
import PasswordBanner from "./components/PasswordBanner";
import type { ProfileRow } from "./hooks/useAdminUsersData";
import type { UserAction } from "./components/UserActionsMenu";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function AdminUsersPage(): JSX.Element {
  const outlet = useOutletContext() || ({} as any);
  const lang = outlet.lang || "it";

  const {
    loading,
    rows,
    lastError,
    loadUsers,
    createUser,
    setPassword,
    suspendUser,
    reactivateUser,
    hardDeleteUser,
    lastPassword,
    lastPasswordEmail,
    supportsDisabledAt,
    parseCsv,
  } = useAdminUsersData();

  const { q, setQ, role, setRole, page, setPage, selectedUserId, setSelectedUserId } = useAdminUsersPersist();

  const ui = useAdminUsersUi({ rows, q, role: role as RoleFilter, page });

  React.useEffect(() => {
    if (ui.page !== page) setPage(ui.page);
  }, [ui.page, page, setPage]);

  const selectedUser = useMemo<ProfileRow | null>(() => {
    if (!selectedUserId) return null;
    return rows.find((r) => r.id === selectedUserId) || null;
  }, [rows, selectedUserId]);

  const [inviteOpen, setInviteOpen] = useState<boolean>(false);
  const [inviteBusy, setInviteBusy] = useState<boolean>(false);

  const [dangerOpen, setDangerOpen] = useState<boolean>(false);
  const [dangerBusy, setDangerBusy] = useState<boolean>(false);
  const [dangerMode, setDangerMode] = useState<DangerMode>("suspend");

  const closeDanger = useCallback(() => {
    setDangerOpen(false);
    setDangerBusy(false);
  }, []);

  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const toastOk = useCallback((msg: string) => {
    setToast({ kind: "ok", msg });
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const toastErr = useCallback((msg: string) => {
    setToast({ kind: "err", msg });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const onInvite = useCallback(
    async (form: any) => {
      setInviteBusy(true);
      try {
        const cantieri = parseCsv(form.allowed_cantieri || form.allowedCantieri || "");
        await createUser({
          email: form.email,
          app_role: form.app_role,
          full_name: form.full_name || undefined,
          display_name: form.display_name || undefined,
          default_costr: (form.default_costr || "").trim() || null,
          default_commessa: (form.default_commessa || "").trim() || null,
          allowed_cantieri: cantieri,
        });
        toastOk(t(lang, "ADMIN_USERS_TOAST_CREATED", "Utente creato"));
        setInviteOpen(false);
      } catch (e: any) {
        console.error("[AdminUsersPage] invite error:", e);
        toastErr(e?.message || String(e));
      } finally {
        setInviteBusy(false);
      }
    },
    [createUser, parseCsv, toastOk, toastErr, lang]
  );

  const onRowSelect = useCallback(
    (id: string) => {
      setSelectedUserId(id);
    },
    [setSelectedUserId]
  );

  const onAction = useCallback(
    async (row: ProfileRow, action: UserAction) => {
      setSelectedUserId(row.id);

      try {
        if (action === "reset_pwd") {
          await setPassword(row.id);
          toastOk(t(lang, "ADMIN_USERS_TOAST_PASSWORD_RESET", "Password resettata"));
          return;
        }

        if (action === "reactivate") {
          await reactivateUser(row.id, undefined);
          toastOk(t(lang, "ADMIN_USERS_TOAST_REACTIVATED", "Utente riattivato"));
          return;
        }

        if (action === "suspend") {
          setDangerMode("suspend");
          setDangerOpen(true);
          return;
        }

        if (action === "hard_delete") {
          setDangerMode("hard_delete");
          setDangerOpen(true);
          return;
        }
      } catch (e: any) {
        console.error("[AdminUsersPage] action error:", e);
        toastErr(e?.message || String(e));
      }
    },
    [setPassword, reactivateUser, toastOk, toastErr, setSelectedUserId, lang]
  );

  const confirmDanger = useCallback(
    async (reason: string) => {
      if (!selectedUser) return;
      setDangerBusy(true);
      try {
        if (dangerMode === "suspend") {
          await suspendUser(selectedUser.id, reason || undefined);
          toastOk(t(lang, "ADMIN_USERS_TOAST_SUSPENDED", "Utente sospeso"));
        } else {
          await hardDeleteUser(selectedUser.id, reason || undefined);
          toastOk(t(lang, "ADMIN_USERS_TOAST_DELETED", "Utente eliminato"));
          setSelectedUserId(null);
        }
        closeDanger();
      } catch (e: any) {
        console.error("[AdminUsersPage] danger confirm error:", e);
        toastErr(e?.message || String(e));
      } finally {
        setDangerBusy(false);
      }
    },
    [selectedUser, dangerMode, suspendUser, hardDeleteUser, toastOk, toastErr, closeDanger, setSelectedUserId, lang]
  );

  const onPrev = useCallback(() => {
    setPage((p) => clamp(p - 1, 1, ui.totalPages));
  }, [setPage, ui.totalPages]);

  const onNext = useCallback(() => {
    setPage((p) => clamp(p + 1, 1, ui.totalPages));
  }, [setPage, ui.totalPages]);

  const onCloseSide = useCallback(() => setSelectedUserId(null), [setSelectedUserId]);

  const onSideResetPwd = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await setPassword(selectedUser.id);
      toastOk(t(lang, "ADMIN_USERS_TOAST_PASSWORD_RESET", "Password resettata"));
    } catch (e: any) {
      toastErr(e?.message || String(e));
    }
  }, [selectedUser, setPassword, toastOk, toastErr, lang]);

  const onSideSuspend = useCallback(() => {
    if (!selectedUser) return;
    setDangerMode("suspend");
    setDangerOpen(true);
  }, [selectedUser]);

  const onSideReactivate = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await reactivateUser(selectedUser.id, undefined);
      toastOk(t(lang, "ADMIN_USERS_TOAST_REACTIVATED", "Utente riattivato"));
    } catch (e: any) {
      toastErr(e?.message || String(e));
    }
  }, [selectedUser, reactivateUser, toastOk, toastErr, lang]);

  const onSideHardDelete = useCallback(() => {
    if (!selectedUser) return;
    setDangerMode("hard_delete");
    setDangerOpen(true);
  }, [selectedUser]);

  return (
    <div className="min-h-0 flex flex-col gap-4">
      {lastPassword ? (
        <PasswordBanner
          password={lastPassword}
          email={lastPasswordEmail}
          onDismiss={() => {
            void loadUsers();
          }}
        />
      ) : null}

      {lastError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100">
          <div className="text-[12px] font-semibold">{t(lang, "COMMON_ERROR", "Errore")}</div>
          <div className="mt-1 text-[12px] opacity-90">{lastError}</div>
        </div>
      ) : null}

      <UsersToolbar
        q={q}
        onQ={(v) => {
          setQ(v);
          setPage(1);
        }}
        role={role as any}
        onRole={(r) => {
          setRole(r);
          setPage(1);
        }}
        total={ui.filtered.length}
        loading={loading}
        onRefresh={() => void loadUsers()}
        onInvite={() => setInviteOpen(true)}
      />

      <div className="min-h-0 flex flex-col gap-3">
        <UsersTable
          rows={ui.pageRows}
          loading={loading}
          canSuspend={supportsDisabledAt}
          selectedUserId={selectedUserId}
          onSelect={onRowSelect}
          onAction={onAction}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-400">
            {t(lang, "COMMON_PAGE", "Page")}{" "}
            <span className="text-slate-200 font-semibold">{ui.page}</span> /{" "}
            <span className="text-slate-200 font-semibold">{ui.totalPages}</span> — {ui.filtered.length}{" "}
            {t(lang, "COMMON_RESULTS", "results")}
            <span className="ml-2 text-slate-500">(PAGE_SIZE={PAGE_SIZE})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={ui.page <= 1}
              className={
                ui.page <= 1
                  ? "rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-600"
                  : "rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] font-semibold text-slate-200 hover:bg-slate-900/40"
              }
            >
              {t(lang, "COMMON_PREV", "Prev")}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={ui.page >= ui.totalPages}
              className={
                ui.page >= ui.totalPages
                  ? "rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-600"
                  : "rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] font-semibold text-slate-200 hover:bg-slate-900/40"
              }
            >
              {t(lang, "COMMON_NEXT", "Next")}
            </button>
          </div>
        </div>
      </div>

      <UserDrawer
        open={!!selectedUser}
        user={selectedUser}
        onClose={onCloseSide}
        onResetPwd={onSideResetPwd}
        onSuspend={onSideSuspend}
        onReactivate={onSideReactivate}
        onHardDelete={onSideHardDelete}
        canSuspend={supportsDisabledAt}
        busy={dangerBusy}
      />

      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onSubmit={onInvite} busy={inviteBusy} />

      <DangerConfirmDialog
        open={dangerOpen}
        mode={dangerMode}
        title={
          dangerMode === "hard_delete"
            ? t(lang, "ADMIN_USERS_DANGER_DELETE_TITLE", "Hard delete utente")
            : t(lang, "ADMIN_USERS_DANGER_SUSPEND_TITLE", "Sospendere utente")
        }
        subtitle={
          dangerMode === "hard_delete"
            ? t(
                lang,
                "ADMIN_USERS_DANGER_DELETE_SUBTITLE",
                "Questa azione è irreversibile. Elimina l’utente e i riferimenti auth. Usa solo se sei sicuro al 100%."
              )
            : t(lang, "ADMIN_USERS_DANGER_SUSPEND_SUBTITLE", "Sospende l’utente (accesso bloccato) senza cancellare i dati storici.")
        }
        confirmLabel={dangerMode === "hard_delete" ? "DELETE" : "SUSPEND"}
        emailToConfirm={selectedUser?.email || null}
        busy={dangerBusy}
        onClose={closeDanger}
        onConfirm={confirmDanger}
      />

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div
            className={
              toast.kind === "ok"
                ? "rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-emerald-100 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                : "rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-rose-100 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            }
          >
            <div className="text-[12px] font-semibold">{toast.kind === "ok" ? "OK" : "ERROR"}</div>
            <div className="mt-1 text-[12px] opacity-90 max-w-[320px] break-words">{toast.msg}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}