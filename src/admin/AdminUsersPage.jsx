// src/admin/AdminUsersPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { t } from "./i18n";

const PAGE_SIZE = 25;
const STORAGE_KEY = "core_admin_users_page_v1";

function parseCsv(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return null;
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeLower(s) {
  return (s ?? "").toString().toLowerCase();
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

function savePersisted(snapshot) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

function normalizeRpcError(err) {
  if (!err) return "Erreur inconnue.";
  const code = err.code ? `(${err.code}) ` : "";
  const msg = err.message || "Erreur RPC.";
  // On évite d’afficher des détails trop bruyants à l’écran
  return `${code}${msg}`;
}

export default function AdminUsersPage() {
  const outlet = useOutletContext() || {};
  const lang = outlet.lang || "it";
  const persisted = useMemo(() => loadPersisted(), []);

  // Create form
  const [email, setEmail] = useState(persisted?.email ?? "");
  const [appRole, setAppRole] = useState(persisted?.appRole ?? "CAPO");
  const [fullName, setFullName] = useState(persisted?.fullName ?? "");
  const [displayName, setDisplayName] = useState(persisted?.displayName ?? "");
  const [defaultCostr, setDefaultCostr] = useState(persisted?.defaultCostr ?? "");
  const [defaultCommessa, setDefaultCommessa] = useState(persisted?.defaultCommessa ?? "");
  const [allowedCantieri, setAllowedCantieri] = useState(persisted?.allowedCantieri ?? "");

  const [creating, setCreating] = useState(persisted?.creating ?? false);
  const [createMsg, setCreateMsg] = useState(persisted?.createMsg ?? null);

  // Last password banner
  const [lastPassword, setLastPassword] = useState(persisted?.lastPassword ?? null);
  const [lastPasswordEmail, setLastPasswordEmail] = useState(persisted?.lastPasswordEmail ?? null);

  // List
  const [rows, setRows] = useState(persisted?.rows ?? []);
  const [loading, setLoading] = useState(persisted?.loading ?? true);

  const [q, setQ] = useState(persisted?.q ?? "");
  const [roleFilter, setRoleFilter] = useState(persisted?.roleFilter ?? "ALL");
  const [page, setPage] = useState(persisted?.page ?? 1);

  const [settingPwdId, setSettingPwdId] = useState(persisted?.settingPwdId ?? null);

  // CAPO->MANAGER assignments (view)
  const [assignMap, setAssignMap] = useState(() => {
    try {
      return persisted?.assignMap ? new Map(persisted.assignMap) : new Map();
    } catch {
      return new Map();
    }
  });
  const [savingAssignCapoId, setSavingAssignCapoId] = useState(persisted?.savingAssignCapoId ?? null);

  // Persist EVERYTHING
  useEffect(() => {
    savePersisted({
      email,
      appRole,
      fullName,
      displayName,
      defaultCostr,
      defaultCommessa,
      allowedCantieri,
      creating,
      createMsg,
      lastPassword,
      lastPasswordEmail,
      rows,
      loading,
      q,
      roleFilter,
      page,
      settingPwdId,
      assignMap: Array.from(assignMap.entries()),
      savingAssignCapoId,
      savedAt: new Date().toISOString(),
    });
  }, [
    email,
    appRole,
    fullName,
    displayName,
    defaultCostr,
    defaultCommessa,
    allowedCantieri,
    creating,
    createMsg,
    lastPassword,
    lastPasswordEmail,
    rows,
    loading,
    q,
    roleFilter,
    page,
    settingPwdId,
    assignMap,
    savingAssignCapoId,
  ]);

  const filtered = useMemo(() => {
    const qq = safeLower(q);
    return (rows || []).filter((r) => {
      if (roleFilter !== "ALL" && r.app_role !== roleFilter) return false;
      if (!qq) return true;
      const hay =
        safeLower(r.email) +
        " " +
        safeLower(r.full_name) +
        " " +
        safeLower(r.display_name) +
        " " +
        safeLower(r.app_role) +
        " " +
        safeLower(r.default_costr) +
        " " +
        safeLower(r.default_commessa);
      return hay.includes(qq);
    });
  }, [rows, q, roleFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  const pageRows = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  useEffect(() => setPage(1), [q, roleFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,must_change_password,updated_at,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error("[AdminUsersPage] loadUsers error:", e);
      // keep persisted rows
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("admin_capo_manager_v1")
        .select("capo_id,capo_display_name,manager_id,manager_email,manager_display_name,active")
        .order("capo_display_name", { ascending: true });

      if (error) throw error;

      const m = new Map();
      (data || []).forEach((r) => {
        if (!r?.capo_id) return;
        m.set(r.capo_id, {
          manager_id: r.manager_id || null,
          manager_email: r.manager_email || null,
          manager_display_name: r.manager_display_name || null,
          active: r.active === true,
        });
      });
      setAssignMap(m);
    } catch (e) {
      console.error("[AdminUsersPage] loadAssignments error:", e);
      // keep existing assignMap
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadAssignments();
  }, [loadUsers, loadAssignments]);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreating(true);
    setLastPassword(null);
    setLastPasswordEmail(null);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        app_role: appRole,
        full_name: fullName.trim() || undefined,
        display_name: (displayName.trim() || fullName.trim() || email.trim()).trim(),
        default_costr: defaultCostr.trim() || null,
        default_commessa: defaultCommessa.trim() || null,
        allowed_cantieri: parseCsv(allowedCantieri),
      };

      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: payload });

      if (error) {
        console.error("[AdminUsersPage] create error:", error);
        setCreateMsg({ ok: false, text: `${t(lang, "CREATE_FAIL")}: ${error.message}` });
        return;
      }
      if (!data?.ok) {
        setCreateMsg({ ok: false, text: `${t(lang, "CREATE_FAIL")}` });
        return;
      }

      setCreateMsg({ ok: true, text: t(lang, "CREATED_OK") });
      await loadUsers();
      await loadAssignments();
    } catch (e2) {
      console.error("[AdminUsersPage] create unexpected:", e2);
      setCreateMsg({ ok: false, text: `${t(lang, "CREATE_FAIL")}: ${e2?.message || String(e2)}` });
    } finally {
      setCreating(false);
    }
  };

  const onSetPassword = async (userId) => {
    setCreateMsg(null);
    setLastPassword(null);
    setLastPasswordEmail(null);
    setSettingPwdId(userId);

    try {
      const { data, error } = await supabase.functions.invoke("admin-set-password", {
        body: { user_id: userId },
      });

      if (error) {
        setCreateMsg({ ok: false, text: `Set password failed: ${error.message}` });
        return;
      }
      if (!data?.ok) {
        setCreateMsg({ ok: false, text: "Set password failed." });
        return;
      }

      setCreateMsg({ ok: true, text: "Password test generata." });

      if (data?.password) {
        setLastPassword(String(data.password));
        setLastPasswordEmail(String(data.email || ""));
      }

      await loadUsers();
      await loadAssignments();
    } catch (e) {
      console.error("[AdminUsersPage] set password unexpected:", e);
      setCreateMsg({ ok: false, text: `Set password failed: ${e?.message || String(e)}` });
    } finally {
      setSettingPwdId(null);
    }
  };

  // IMPORTANT: RPC args are p_capo_id / p_manager_id
  const onAssignManager = async (capoId, managerIdOrNull) => {
    if (!capoId) return;
    setCreateMsg(null);
    setSavingAssignCapoId(capoId);

    try {
      const { data, error } = await supabase.rpc("admin_set_manager_for_capo", {
        p_capo_id: capoId,
        p_manager_id: managerIdOrNull || null,
      });

      if (error) {
        console.error("[AdminUsersPage] assign rpc error full:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setCreateMsg({ ok: false, text: `Assign failed: ${normalizeRpcError(error)}` });
        return;
      }

      if (!data?.ok) {
        setCreateMsg({ ok: false, text: `Assign failed: ${data?.error || "unknown"}` });
        return;
      }

      setCreateMsg({
        ok: true,
        text: managerIdOrNull ? "Manager assegnato." : "Manager rimosso.",
      });

      await loadAssignments();
    } catch (e) {
      console.error("[AdminUsersPage] assign unexpected:", e);
      setCreateMsg({ ok: false, text: `Assign failed: ${e?.message || String(e)}` });
    } finally {
      setSavingAssignCapoId(null);
    }
  };

  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // ignore
    }
  };

  const hardResetPageState = () => {
    setEmail("");
    setAppRole("CAPO");
    setFullName("");
    setDisplayName("");
    setDefaultCostr("");
    setDefaultCommessa("");
    setAllowedCantieri("");

    setCreating(false);
    setCreateMsg(null);

    setLastPassword(null);
    setLastPasswordEmail(null);

    setQ("");
    setRoleFilter("ALL");
    setPage(1);

    setSettingPwdId(null);

    setAssignMap(new Map());
    setSavingAssignCapoId(null);

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const managers = useMemo(() => {
    return (rows || [])
      .filter((r) => r.app_role === "MANAGER")
      .map((r) => ({
        id: r.id,
        label: r.display_name || r.email || String(r.id).slice(0, 8),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "it"));
  }, [rows]);

  return (
    <div className="p-4 sm:p-5">
      {/* CREATE USER */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t(lang, "CREATE_USER")}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Fase test: crea account + genera password test (Core!####) con cambio obbligatorio al primo login.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadUsers();
                loadAssignments();
              }}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
              title="Ricarica utenti e assegnazioni"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={hardResetPageState}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
              title="Reset UI + clear sessionStorage snapshot"
            >
              {t(lang, "RESET")}
            </button>
          </div>
        </div>

        {createMsg && (
          <div
            className={[
              "mt-4 text-[13px] rounded-xl px-3 py-2 border",
              createMsg.ok
                ? "text-emerald-200 bg-emerald-900/20 border-emerald-800"
                : "text-amber-200 bg-amber-900/30 border-amber-800",
            ].join(" ")}
          >
            {createMsg.text}
          </div>
        )}

        {lastPassword && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Password test (da comunicare)
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <div className="text-sm text-slate-200">{lastPasswordEmail || "—"}</div>
                <div className="text-2xl font-mono tracking-[0.18em] text-slate-50">{lastPassword}</div>
                <div className="text-xs text-slate-400 mt-1">L’utente dovrà cambiarla al primo accesso.</div>
              </div>
              <button
                type="button"
                onClick={() => copy(lastPassword)}
                className="text-[12px] px-3 py-2 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
              >
                {t(lang, "COPY")}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "EMAIL")}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "ROLE")}</label>
            <select
              value={appRole}
              onChange={(e) => setAppRole(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            >
              <option value="CAPO">CAPO</option>
              <option value="UFFICIO">UFFICIO</option>
              <option value="MANAGER">MANAGER</option>
              <option value="DIREZIONE">DIREZIONE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "FULL_NAME")}</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              type="text"
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "DISPLAY_NAME")}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "DEFAULT_COSTR")}</label>
              <input
                value={defaultCostr}
                onChange={(e) => setDefaultCostr(e.target.value)}
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "DEFAULT_COMMESSA")}</label>
              <input
                value={defaultCommessa}
                onChange={(e) => setDefaultCommessa(e.target.value)}
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "ALLOWED_CANTIERI")}</label>
            <input
              value={allowedCantieri}
              onChange={(e) => setAllowedCantieri(e.target.value)}
              type="text"
              placeholder="es: RIVA_TRIGOSO, MUGGIANO, MONFALCONE"
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="text-[12px] px-4 py-2 rounded-full border border-emerald-600 text-emerald-100 hover:bg-emerald-600/15 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? t(lang, "CREATING") : t(lang, "SUBMIT_CREATE")}
            </button>
          </div>
        </form>
      </div>

      {/* USERS LIST */}
      <div className="mt-4 border border-slate-800 rounded-2xl bg-slate-950/20 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t(lang, "USERS_LIST")}</div>
            <div className="text-xs text-slate-400 mt-1">{loading ? "Loading…" : `${filtered.length} users`}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(lang, "SEARCH")}
              className="w-full sm:w-72 rounded-xl border px-3 py-2 text-[13px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-44 rounded-xl border px-3 py-2 text-[13px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            >
              <option value="ALL">ALL</option>
              <option value="CAPO">CAPO</option>
              <option value="UFFICIO">UFFICIO</option>
              <option value="MANAGER">MANAGER</option>
              <option value="DIREZIONE">DIREZIONE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-800 rounded-xl">
          <table className="min-w-[1280px] w-full text-[12px]">
            <thead className="bg-slate-900/60 text-slate-300">
              <tr className="text-left">
                <th className="px-3 py-2">{t(lang, "EMAIL")}</th>
                <th className="px-3 py-2">{t(lang, "NAME")}</th>
                <th className="px-3 py-2">{t(lang, "ROLE")}</th>
                <th className="px-3 py-2">Onboarding</th>
                <th className="px-3 py-2">Manager (solo CAPO)</th>
                <th className="px-3 py-2">{t(lang, "ID")}</th>
                <th className="px-3 py-2">{t(lang, "ACTIONS")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={7}>
                    {t(lang, "NO_ROWS")}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const isSetting = settingPwdId === r.id;
                  const onboarding = r.must_change_password === true;
                  const isCapo = r.app_role === "CAPO";

                  const assign = isCapo ? assignMap.get(r.id) : null;
                  const assignedLabel =
                    assign?.manager_display_name ||
                    assign?.manager_email ||
                    (assign?.manager_id ? String(assign.manager_id).slice(0, 8) + "…" : null);

                  const isSavingAssign = savingAssignCapoId === r.id;

                  return (
                    <tr key={r.id} className="text-slate-200 hover:bg-slate-900/30">
                      <td className="px-3 py-2">{r.email}</td>

                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{r.display_name || "-"}</span>
                          <span className="text-slate-500">{r.full_name || ""}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full border border-slate-700 text-[11px]">
                          {r.app_role}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        {onboarding ? (
                          <span className="px-2 py-0.5 rounded-full border border-amber-700/50 bg-amber-500/10 text-amber-200 text-[11px]">
                            MUST CHANGE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-400 text-[11px]">
                            OK
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        {!isCapo ? (
                          <span className="text-slate-600">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "px-2 py-0.5 rounded-full border text-[11px] whitespace-nowrap",
                                assignedLabel
                                  ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-200"
                                  : "border-slate-700 text-slate-400",
                              ].join(" ")}
                              title={assignedLabel || "Non assegnato"}
                            >
                              {assignedLabel || "Non assegnato"}
                            </span>

                            <select
                              className="h-8 rounded-xl border border-slate-800 bg-slate-950 px-2 text-[12px] text-slate-100"
                              disabled={isSavingAssign || managers.length === 0}
                              value={assign?.manager_id || ""}
                              onChange={(e) => {
                                const v = e.target.value || "";
                                onAssignManager(r.id, v || null);
                              }}
                              title="Assegna CAPO a MANAGER"
                            >
                              <option value="">— Rimuovi</option>
                              {managers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>

                            {isSavingAssign ? (
                              <span className="text-[11px] text-slate-500">Save…</span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                        {String(r.id).slice(0, 8)}…
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copy(r.email)}
                            className="px-2 py-1 rounded-xl border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                          >
                            {t(lang, "COPY")}
                          </button>

                          <button
                            type="button"
                            onClick={() => copy(r.id)}
                            className="px-2 py-1 rounded-xl border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                          >
                            ID
                          </button>

                          <button
                            type="button"
                            disabled={isSetting}
                            onClick={() => onSetPassword(r.id)}
                            className="px-2 py-1 rounded-xl border border-emerald-700 text-emerald-100 hover:bg-emerald-800/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Genera password test (Core!####) e forza cambio password al primo login"
                          >
                            {isSetting ? "Set…" : "Set password test"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-[12px] text-slate-500">
            {t(lang, "PAGE")} {Math.min(Math.max(1, page), totalPages)} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(lang, "PREV")}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(lang, "NEXT")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
