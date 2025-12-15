// src/admin/AdminUsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { t } from "./i18n";

const PAGE_SIZE = 25;

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

export default function AdminUsersPage() {
  const { lang } = useOutletContext();

  // Create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [appRole, setAppRole] = useState("CAPO");
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [defaultCostr, setDefaultCostr] = useState("");
  const [defaultCommessa, setDefaultCommessa] = useState("");
  const [allowedCantieri, setAllowedCantieri] = useState("");

  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  // List
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const qq = safeLower(q);
    return rows
      .filter((r) => {
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
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  const pageRows = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [q, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // ADMIN should read all profiles (RLS policy expected)
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,updated_at,created_at")
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
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreating(true);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        app_role: appRole,
        full_name: fullName.trim() || undefined,
        display_name: (displayName.trim() || fullName.trim() || email.trim()).trim(),
        default_costr: defaultCostr.trim() || null,
        default_commessa: defaultCommessa.trim() || null,
        allowed_cantieri: parseCsv(allowedCantieri),
      };

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: payload,
      });

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

      // Clear minimal sensitive field
      setPassword("");
      setEmail("");
      setFullName("");
      setDisplayName("");
      setDefaultCostr("");
      setDefaultCommessa("");
      setAllowedCantieri("");

      await loadUsers();
    } catch (e2) {
      console.error("[AdminUsersPage] create unexpected:", e2);
      setCreateMsg({ ok: false, text: `${t(lang, "CREATE_FAIL")}: ${e2?.message || String(e2)}` });
    } finally {
      setCreating(false);
    }
  };

  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 sm:p-5">
      {/* CREATE PANEL */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t(lang, "CREATE_USER")}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Edge Function only. No creation logic in Manager.
            </div>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
          >
            Refresh
          </button>
        </div>

        {createMsg && (
          <div
            className={[
              "mt-4 text-[13px] rounded-md px-3 py-2 border",
              createMsg.ok
                ? "text-emerald-200 bg-emerald-900/20 border-emerald-800"
                : "text-amber-200 bg-amber-900/30 border-amber-800",
            ].join(" ")}
          >
            {createMsg.text}
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
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "PASSWORD")}</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "ROLE")}</label>
            <select
              value={appRole}
              onChange={(e) => setAppRole(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
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
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "DISPLAY_NAME")}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "DEFAULT_COSTR")}</label>
              <input
                value={defaultCostr}
                onChange={(e) => setDefaultCostr(e.target.value)}
                type="text"
                className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[12px] mb-1 text-slate-300">{t(lang, "DEFAULT_COMMESSA")}</label>
              <input
                value={defaultCommessa}
                onChange={(e) => setDefaultCommessa(e.target.value)}
                type="text"
                className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
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
              className="w-full rounded-md border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setEmail("");
                setPassword("");
                setFullName("");
                setDisplayName("");
                setDefaultCostr("");
                setDefaultCommessa("");
                setAllowedCantieri("");
                setCreateMsg(null);
              }}
              className="text-[12px] px-3 py-2 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
            >
              {t(lang, "RESET")}
            </button>

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

      {/* LIST PANEL */}
      <div className="mt-4 border border-slate-800 rounded-2xl bg-slate-950/20 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t(lang, "USERS_LIST")}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {loading ? "Loading…" : `${filtered.length} users`}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(lang, "SEARCH")}
              className="w-full sm:w-72 rounded-md border px-3 py-2 text-[13px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-44 rounded-md border px-3 py-2 text-[13px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
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
          <table className="min-w-[980px] w-full text-[12px]">
            <thead className="bg-slate-900/60 text-slate-300">
              <tr className="text-left">
                <th className="px-3 py-2">{t(lang, "EMAIL")}</th>
                <th className="px-3 py-2">{t(lang, "NAME")}</th>
                <th className="px-3 py-2">{t(lang, "ROLE")}</th>
                <th className="px-3 py-2">{t(lang, "COSTR")}</th>
                <th className="px-3 py-2">{t(lang, "COMMESSA")}</th>
                <th className="px-3 py-2">{t(lang, "CANTIERI")}</th>
                <th className="px-3 py-2">{t(lang, "ID")}</th>
                <th className="px-3 py-2">{t(lang, "ACTIONS")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={8}>
                    {t(lang, "NO_ROWS")}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
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
                    <td className="px-3 py-2 text-slate-300">{r.default_costr || "-"}</td>
                    <td className="px-3 py-2 text-slate-300">{r.default_commessa || "-"}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {Array.isArray(r.allowed_cantieri) ? r.allowed_cantieri.join(", ") : "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                      {String(r.id).slice(0, 8)}…
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copy(r.email)}
                          className="px-2 py-1 rounded-md border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                        >
                          {t(lang, "COPY")}
                        </button>
                        <button
                          type="button"
                          onClick={() => copy(r.id)}
                          className="px-2 py-1 rounded-md border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                        >
                          ID
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
