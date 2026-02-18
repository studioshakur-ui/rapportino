// @ts-nocheck
// src/admin/AdminUsersPage.tsx
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
  return `${code}${msg}`;
}

function normalizeDateInput(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  return s;
}

function formatDateForInput(d) {
  if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s.slice(0, 10);
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

  // Profiles list
  const [rows, setRows] = useState(persisted?.rows ?? []);
  const [loading, setLoading] = useState(persisted?.loading ?? true);

  const [q, setQ] = useState(persisted?.q ?? "");
  const [roleFilter, setRoleFilter] = useState(persisted?.roleFilter ?? "ALL");
  const [page, setPage] = useState(persisted?.page ?? 1);

  const [settingPwdId, setSettingPwdId] = useState(persisted?.settingPwdId ?? null);

  // Delete/Suspend running state
  const [deletingUserId, setDeletingUserId] = useState(persisted?.deletingUserId ?? null);

  // CAPO->MANAGER assignments (view)
  const [assignMap, setAssignMap] = useState(() => {
    try {
      return persisted?.assignMap ? new Map(persisted.assignMap) : new Map();
    } catch {
      return new Map();
    }
  });
  const [savingAssignCapoId, setSavingAssignCapoId] = useState(persisted?.savingAssignCapoId ?? null);

  // ===== OPERATORS QUALITY (ADMIN) =====
  const [opRows, setOpRows] = useState(persisted?.opRows ?? []);
  const [opLoading, setOpLoading] = useState(persisted?.opLoading ?? false);
  const [opQ, setOpQ] = useState(persisted?.opQ ?? "");
  const [opOnlyIncomplete, setOpOnlyIncomplete] = useState(
    typeof persisted?.opOnlyIncomplete === "boolean" ? persisted.opOnlyIncomplete : true
  );

  // modal
  const [opModalOpen, setOpModalOpen] = useState(persisted?.opModalOpen ?? false);
  const [opSaving, setOpSaving] = useState(persisted?.opSaving ?? false);
  const [opEditId, setOpEditId] = useState(persisted?.opEditId ?? null);
  const [opEditLegacyName, setOpEditLegacyName] = useState(persisted?.opEditLegacyName ?? "");
  const [opEditDisplayName, setOpEditDisplayName] = useState(persisted?.opEditDisplayName ?? "");
  const [opEditCognome, setOpEditCognome] = useState(persisted?.opEditCognome ?? "");
  const [opEditNome, setOpEditNome] = useState(persisted?.opEditNome ?? "");
  const [opEditBirthDate, setOpEditBirthDate] = useState(persisted?.opEditBirthDate ?? "");
  const [opEditOperatorCode, setOpEditOperatorCode] = useState(persisted?.opEditOperatorCode ?? "");

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
      deletingUserId,
      assignMap: Array.from(assignMap.entries()),
      savingAssignCapoId,

      opRows,
      opLoading,
      opQ,
      opOnlyIncomplete,

      opModalOpen,
      opSaving,
      opEditId,
      opEditLegacyName,
      opEditDisplayName,
      opEditCognome,
      opEditNome,
      opEditBirthDate,
      opEditOperatorCode,

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
    deletingUserId,
    assignMap,
    savingAssignCapoId,

    opRows,
    opLoading,
    opQ,
    opOnlyIncomplete,

    opModalOpen,
    opSaving,
    opEditId,
    opEditLegacyName,
    opEditDisplayName,
    opEditCognome,
    opEditNome,
    opEditBirthDate,
    opEditOperatorCode,
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

  const totalPages = useMemo(() => {
    const n = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
    return Math.max(1, n);
  }, [filtered]);

  const pageRows = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,must_change_password,created_at,updated_at"
        )
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error("[AdminUsersPage] loadUsers error:", e);
      setRows([]);
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
    }
  }, []);

  const loadOperators = useCallback(async () => {
    setOpLoading(true);
    try {
      const { data, error } = await supabase
        .from("operators_admin_list_v1")
        .select(
          "id,legacy_name,display_name,roles,cognome,nome,birth_date,operator_code,operator_key,created_by,created_at,updated_at,is_identity_incomplete"
        )
        .order("created_at", { ascending: false })
        .limit(3000);

      if (error) throw error;
      setOpRows(data || []);
    } catch (e) {
      console.error("[AdminUsersPage] loadOperators error:", e);
    } finally {
      setOpLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadAssignments();
    loadOperators();
  }, [loadUsers, loadAssignments, loadOperators]);

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

  const confirmSuspend = (targetEmail) => {
    const typed = window.prompt(
      `SUSPEND account.\n\nType the exact email to confirm:\n${targetEmail}\n\n(Leave blank to cancel)`
    );
    if (!typed) return false;
    return typed.trim().toLowerCase() === String(targetEmail || "").trim().toLowerCase();
  };

  const confirmHardDelete = (targetEmail) => {
    const typed1 = window.prompt(`HARD DELETE (DANGEROUS).\n\nType DELETE to proceed.\n\n(Leave blank to cancel)`);
    if (!typed1) return false;
    if (typed1.trim() !== "DELETE") return false;

    const typed2 = window.prompt(
      `FINAL CONFIRMATION.\n\nType the exact email to hard-delete:\n${targetEmail}\n\n(Leave blank to cancel)`
    );
    if (!typed2) return false;

    return typed2.trim().toLowerCase() === String(targetEmail || "").trim().toLowerCase();
  };

  const onSuspendUser = async (r) => {
    if (!r?.id) return;
    if (!confirmSuspend(r.email)) {
      setCreateMsg({ ok: false, text: "Suspend cancelled." });
      return;
    }

    setCreateMsg(null);
    setDeletingUserId(r.id);

    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: r.id, mode: "suspend", reason: "Admin suspend" },
      });

      if (error) {
        setCreateMsg({ ok: false, text: `Suspend failed: ${error.message}` });
        return;
      }
      if (!data?.ok) {
        setCreateMsg({ ok: false, text: `Suspend failed: ${data?.error || "unknown"}` });
        return;
      }

      setCreateMsg({ ok: true, text: `Suspended: ${r.email}` });
      await loadUsers();
      await loadAssignments();
    } catch (e) {
      console.error("[AdminUsersPage] suspend unexpected:", e);
      setCreateMsg({ ok: false, text: `Suspend failed: ${e?.message || String(e)}` });
    } finally {
      setDeletingUserId(null);
    }
  };

  const onHardDeleteUser = async (r) => {
    if (!r?.id) return;
    if (!confirmHardDelete(r.email)) {
      setCreateMsg({ ok: false, text: "Hard delete cancelled." });
      return;
    }

    setCreateMsg(null);
    setDeletingUserId(r.id);

    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: r.id, mode: "hard_delete", reason: "Admin hard delete" },
      });

      if (error) {
        setCreateMsg({ ok: false, text: `Hard delete failed: ${error.message}` });
        return;
      }
      if (!data?.ok) {
        setCreateMsg({ ok: false, text: `Hard delete failed: ${data?.error || "unknown"}` });
        return;
      }

      // If profile couldn't be deleted, it may be anonymized; UI will refresh anyway.
      setCreateMsg({ ok: true, text: `Hard delete executed: ${r.email}` });
      await loadUsers();
      await loadAssignments();
    } catch (e) {
      console.error("[AdminUsersPage] hard delete unexpected:", e);
      setCreateMsg({ ok: false, text: `Hard delete failed: ${e?.message || String(e)}` });
    } finally {
      setDeletingUserId(null);
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

  const opFiltered = useMemo(() => {
    const qq = safeLower(opQ);
    return (opRows || []).filter((r) => {
      if (opOnlyIncomplete && r.is_identity_incomplete !== true) return false;
      if (!qq) return true;
      const hay =
        safeLower(r.legacy_name) +
        " " +
        safeLower(r.display_name) +
        " " +
        safeLower(r.cognome) +
        " " +
        safeLower(r.nome) +
        " " +
        safeLower(r.operator_code) +
        " " +
        safeLower(r.operator_key);
      return hay.includes(qq);
    });
  }, [opRows, opQ, opOnlyIncomplete]);

  const openOperatorModal = (r) => {
    setOpEditId(r.id);
    setOpEditLegacyName(r.legacy_name || "");
    setOpEditDisplayName(r.display_name || "");
    setOpEditCognome(r.cognome || "");
    setOpEditNome(r.nome || "");
    setOpEditBirthDate(formatDateForInput(r.birth_date || ""));
    setOpEditOperatorCode(r.operator_code || "");
    setOpModalOpen(true);
  };

  const closeOperatorModal = () => {
    setOpModalOpen(false);
    setOpEditId(null);
  };

  const onSaveOperatorIdentity = async () => {
    if (!opEditId) return;
    setOpSaving(true);
    setCreateMsg(null);

    try {
      const payload = {
        p_id: opEditId,
        p_display_name: opEditDisplayName.trim() || null,
        p_cognome: opEditCognome.trim() || null,
        p_nome: opEditNome.trim() || null,
        p_birth_date: normalizeDateInput(opEditBirthDate) || null,
        p_operator_code: opEditOperatorCode.trim() || null,
      };

      const { data, error } = await supabase.rpc("admin_upsert_operator_identity", payload);

      if (error) {
        console.error("[AdminUsersPage] onSaveOperatorIdentity rpc error:", error);
        setCreateMsg({ ok: false, text: `Save failed: ${normalizeRpcError(error)}` });
        return;
      }

      if (!data?.ok) {
        setCreateMsg({ ok: false, text: `Save failed: ${data?.error || "unknown"}` });
        return;
      }

      setCreateMsg({ ok: true, text: "Operatore aggiornato." });
      setOpModalOpen(false);
      await loadOperators();
    } catch (e) {
      console.error("[AdminUsersPage] onSaveOperatorIdentity unexpected:", e);
      setCreateMsg({ ok: false, text: `Save failed: ${e?.message || String(e)}` });
    } finally {
      setOpSaving(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>{t(lang, "ADMIN_USERS_TITLE")}</h2>
      <div style={{ color: "#666", marginBottom: 12 }}>{t(lang, "ADMIN_USERS_SUBTITLE")}</div>

      {/* Password banner */}
      {lastPassword && (
        <div
          style={{
            border: "1px solid #f0c36d",
            background: "#fff8e1",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Password test (da comunicare)</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{lastPasswordEmail ? `Email: ${lastPasswordEmail}` : null}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ padding: "6px 8px", background: "#fff", borderRadius: 6, border: "1px solid #eee" }}>
              {lastPassword}
            </code>
            <button onClick={() => copyToClipboard(lastPassword)} style={{ padding: "6px 10px" }}>
              COPY
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={onCreate} style={{ border: "1px solid #eee", padding: 12, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "EMAIL")}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome.cognome@..."
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "ROLE")}</label>
            <select value={appRole} onChange={(e) => setAppRole(e.target.value)} style={{ width: "100%", padding: 8 }}>
              <option value="CAPO">CAPO</option>
              <option value="UFFICIO">UFFICIO</option>
              <option value="MANAGER">MANAGER</option>
              <option value="DIREZIONE">DIREZIONE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "FULL_NAME")}</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "DISPLAY_NAME")}</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "DEFAULT_COSTR")}</label>
            <input
              value={defaultCostr}
              onChange={(e) => setDefaultCostr(e.target.value)}
              placeholder="SDC / ..."
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "DEFAULT_COMMESSA")}</label>
            <input
              value={defaultCommessa}
              onChange={(e) => setDefaultCommessa(e.target.value)}
              placeholder="006368 / ..."
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>{t(lang, "ALLOWED_CANTIERI")}</label>
            <input
              value={allowedCantieri}
              onChange={(e) => setAllowedCantieri(e.target.value)}
              placeholder="La Spezia, Monfalcone, ..."
              style={{ width: "100%", padding: 8 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={creating} style={{ padding: "8px 12px" }}>
            {creating ? t(lang, "CREATING") : t(lang, "CREATE")}
          </button>

          {createMsg && <div style={{ color: createMsg.ok ? "#137333" : "#c5221f", fontWeight: 600 }}>{createMsg.text}</div>}
        </div>
      </form>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t(lang, "SEARCH")}
          style={{ padding: 8, minWidth: 240 }}
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          style={{ padding: 8 }}
        >
          <option value="ALL">{t(lang, "ALL")}</option>
          <option value="CAPO">CAPO</option>
          <option value="UFFICIO">UFFICIO</option>
          <option value="MANAGER">MANAGER</option>
          <option value="DIREZIONE">DIREZIONE</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <button
          onClick={() => {
            loadUsers();
            loadAssignments();
            loadOperators();
          }}
          style={{ padding: "8px 12px" }}
        >
          {t(lang, "REFRESH")}
        </button>

        <div style={{ color: "#666" }}>{loading ? t(lang, "LOADING") : `${filtered.length} ${t(lang, "USERS")}`}</div>
      </div>

      {/* List */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 120px 1fr 1fr 280px", background: "#fafafa" }}>
          <div style={{ padding: 10, fontWeight: 700 }}>{t(lang, "EMAIL")}</div>
          <div style={{ padding: 10, fontWeight: 700 }}>{t(lang, "DISPLAY_NAME")}</div>
          <div style={{ padding: 10, fontWeight: 700 }}>{t(lang, "ROLE")}</div>
          <div style={{ padding: 10, fontWeight: 700 }}>{t(lang, "DEFAULT_COSTR")}</div>
          <div style={{ padding: 10, fontWeight: 700 }}>{t(lang, "DEFAULT_COMMESSA")}</div>
          <div style={{ padding: 10, fontWeight: 700 }}>{t(lang, "ACTIONS")}</div>
        </div>

        {pageRows.map((r) => {
          const managerTxt = (() => {
            const asg = assignMap.get(r.id);
            return asg?.manager_display_name || asg?.manager_email || "";
          })();

          const busy = deletingUserId === r.id;

          return (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 120px 1fr 1fr 280px",
                borderTop: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <div style={{ padding: 10, fontSize: 13 }}>{r.email}</div>
              <div style={{ padding: 10, fontSize: 13 }}>{r.display_name || r.full_name}</div>
              <div style={{ padding: 10, fontSize: 13, fontWeight: 700 }}>{r.app_role}</div>
              <div style={{ padding: 10, fontSize: 13 }}>{r.default_costr || ""}</div>
              <div style={{ padding: 10, fontSize: 13 }}>{r.default_commessa || ""}</div>

              <div style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => onSetPassword(r.id)} disabled={settingPwdId === r.id || busy} style={{ padding: "6px 10px" }}>
                  {settingPwdId === r.id ? "..." : "Set pwd"}
                </button>

                <button onClick={() => onSuspendUser(r)} disabled={busy} style={{ padding: "6px 10px" }}>
                  {busy ? "..." : "Suspend"}
                </button>

                <button onClick={() => onHardDeleteUser(r)} disabled={busy} style={{ padding: "6px 10px", border: "1px solid #c5221f" }}>
                  {busy ? "..." : "Delete"}
                </button>

                {r.app_role === "CAPO" && <span style={{ fontSize: 12, color: "#666" }}>{managerTxt ? `MANAGER: ${managerTxt}` : "MANAGER: —"}</span>}
              </div>
            </div>
          );
        })}

        {!loading && pageRows.length === 0 && <div style={{ padding: 12, color: "#666" }}>{t(lang, "NO_RESULTS")}</div>}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "6px 10px" }}>
          {"<"}
        </button>
        <div style={{ color: "#666" }}>
          {page} / {totalPages}
        </div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "6px 10px" }}>
          {">"}
        </button>
      </div>

      {/* Operators quality (admin) */}
      <div style={{ marginTop: 26 }}>
        <h3 style={{ margin: "0 0 8px 0" }}>Operators Quality</h3>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <input value={opQ} onChange={(e) => setOpQ(e.target.value)} placeholder="Search operator..." style={{ padding: 8, minWidth: 240 }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#444" }}>
            <input type="checkbox" checked={opOnlyIncomplete} onChange={(e) => setOpOnlyIncomplete(e.target.checked)} />
            Only incomplete
          </label>
          <button onClick={loadOperators} style={{ padding: "8px 12px" }}>
            Refresh operators
          </button>
          <div style={{ color: "#666" }}>{opLoading ? "Loading..." : `${opFiltered.length} operators`}</div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 160px", background: "#fafafa" }}>
            <div style={{ padding: 10, fontWeight: 700 }}>Legacy</div>
            <div style={{ padding: 10, fontWeight: 700 }}>Display</div>
            <div style={{ padding: 10, fontWeight: 700 }}>Incomplete</div>
            <div style={{ padding: 10, fontWeight: 700 }}>Actions</div>
          </div>

          {opFiltered.slice(0, 200).map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 120px 160px",
                borderTop: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <div style={{ padding: 10, fontSize: 13 }}>{r.legacy_name}</div>
              <div style={{ padding: 10, fontSize: 13 }}>{r.display_name}</div>
              <div style={{ padding: 10, fontSize: 13, fontWeight: 700 }}>{r.is_identity_incomplete ? "YES" : "NO"}</div>
              <div style={{ padding: 10 }}>
                <button onClick={() => openOperatorModal(r)} style={{ padding: "6px 10px" }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operator modal */}
      {opModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={closeOperatorModal}
        >
          <div
            style={{ width: 720, maxWidth: "100%", background: "#fff", borderRadius: 12, padding: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>Edit operator</div>
              <button onClick={closeOperatorModal} style={{ padding: "6px 10px" }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>Legacy: {opEditLegacyName}</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#666" }}>Display name</label>
                <input value={opEditDisplayName} onChange={(e) => setOpEditDisplayName(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#666" }}>Operator code</label>
                <input value={opEditOperatorCode} onChange={(e) => setOpEditOperatorCode(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#666" }}>Cognome</label>
                <input value={opEditCognome} onChange={(e) => setOpEditCognome(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#666" }}>Nome</label>
                <input value={opEditNome} onChange={(e) => setOpEditNome(e.target.value)} style={{ width: "100%", padding: 8 }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#666" }}>Birth date</label>
                <input
                  value={opEditBirthDate}
                  onChange={(e) => setOpEditBirthDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={onSaveOperatorIdentity} disabled={opSaving} style={{ padding: "8px 12px" }}>
                {opSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}