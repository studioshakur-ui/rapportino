// src/admin/AdminOperatorsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useOutletContext } from "react-router-dom";
import { t } from "./i18n";

const PAGE_SIZE = 25;
const STORAGE_KEY = "core_admin_operators_page_v1";

function safeLower(s) {
  return (s ?? "").toString().toLowerCase();
}

function parseCsv(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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

function normalizeDbError(err) {
  if (!err) return "Erreur inconnue.";
  const code = err.code ? `(${err.code}) ` : "";
  const msg = err.message || "Erreur base de données.";
  return `${code}${msg}`;
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    // d is "YYYY-MM-DD"
    return String(d);
  } catch {
    return String(d);
  }
}

function isValidISODate(s) {
  if (!s) return false;
  const v = String(s).trim();
  // minimal check YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const dt = new Date(v + "T00:00:00Z");
  return !Number.isNaN(dt.getTime());
}

export default function AdminOperatorsPage() {
  const outlet = useOutletContext() || {};
  const lang = outlet.lang || "it";
  const persisted = useMemo(() => loadPersisted(), []);

  const [rows, setRows] = useState(persisted?.rows ?? []);
  const [loading, setLoading] = useState(persisted?.loading ?? true);
  const [msg, setMsg] = useState(persisted?.msg ?? null);

  const [q, setQ] = useState(persisted?.q ?? "");
  const [onlyIncomplete, setOnlyIncomplete] = useState(persisted?.onlyIncomplete ?? false);
  const [page, setPage] = useState(persisted?.page ?? 1);

  // Create form (identity required)
  const [cognome, setCognome] = useState(persisted?.cognome ?? "");
  const [nome, setNome] = useState(persisted?.nome ?? "");
  const [birthDate, setBirthDate] = useState(persisted?.birthDate ?? ""); // YYYY-MM-DD
  const [operatorCode, setOperatorCode] = useState(persisted?.operatorCode ?? "");
  const [rolesCsv, setRolesCsv] = useState(persisted?.rolesCsv ?? "OPERAIO");

  const [creating, setCreating] = useState(persisted?.creating ?? false);

  // Edit modal
  const [editingId, setEditingId] = useState(persisted?.editingId ?? null);
  const [editDraft, setEditDraft] = useState(persisted?.editDraft ?? null);
  const [saving, setSaving] = useState(persisted?.saving ?? false);

  useEffect(() => {
    savePersisted({
      rows,
      loading,
      msg,
      q,
      onlyIncomplete,
      page,
      cognome,
      nome,
      birthDate,
      operatorCode,
      rolesCsv,
      creating,
      editingId,
      editDraft,
      saving,
      savedAt: new Date().toISOString(),
    });
  }, [
    rows,
    loading,
    msg,
    q,
    onlyIncomplete,
    page,
    cognome,
    nome,
    birthDate,
    operatorCode,
    rolesCsv,
    creating,
    editingId,
    editDraft,
    saving,
  ]);

  const loadOperators = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("operators_admin_list_v1")
        .select(
          "id,legacy_name,display_name,roles,cognome,nome,birth_date,operator_code,operator_key,created_by,created_at,updated_at,is_identity_incomplete"
        )
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error("[AdminOperatorsPage] loadOperators error:", e);
      setMsg({ ok: false, text: `Load failed: ${normalizeDbError(e)}` });
      // keep existing rows
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOperators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = safeLower(q);
    return (rows || []).filter((r) => {
      if (onlyIncomplete && r.is_identity_incomplete !== true) return false;
      if (!qq) return true;

      const hay =
        safeLower(r.display_name) +
        " " +
        safeLower(r.legacy_name) +
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
  }, [rows, q, onlyIncomplete]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  const pageRows = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, totalPages]);

  useEffect(() => setPage(1), [q, onlyIncomplete]);

  const hardResetUI = () => {
    setMsg(null);
    setQ("");
    setOnlyIncomplete(false);
    setPage(1);

    setCognome("");
    setNome("");
    setBirthDate("");
    setOperatorCode("");
    setRolesCsv("OPERAIO");

    setCreating(false);
    setEditingId(null);
    setEditDraft(null);
    setSaving(false);

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(String(txt ?? ""));
    } catch {
      // ignore
    }
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setMsg(null);

    const c = cognome.trim();
    const n = nome.trim();
    const bd = birthDate.trim();
    if (!c || !n || !bd) {
      setMsg({ ok: false, text: "Cognome, Nome e Data di nascita sono obbligatori." });
      return;
    }
    if (!isValidISODate(bd)) {
      setMsg({ ok: false, text: "Data di nascita non valida. Formato richiesto: YYYY-MM-DD." });
      return;
    }

    const roles = parseCsv(rolesCsv);
    if (roles.length === 0) {
      setMsg({ ok: false, text: "Roles non può essere vuoto (es: OPERAIO)." });
      return;
    }

    setCreating(true);
    try {
      // IMPORTANT:
      // - trigger operators_require_identity enforces identity presence
      // - operator_key is set by triggers (we DO NOT write it)
      // - name (legacy) is optional; we set a safe default for legacy compatibility
      const legacy = `${c} ${n}`.trim();

      const payload = {
        name: legacy, // legacy compatibility
        cognome: c,
        nome: n,
        birth_date: bd,
        roles,
        operator_code: operatorCode.trim() || null,
      };

      const { error } = await supabase.from("operators").insert(payload);

      if (error) throw error;

      setMsg({ ok: true, text: "Operatore creato." });
      setCognome("");
      setNome("");
      setBirthDate("");
      setOperatorCode("");
      setRolesCsv("OPERAIO");

      await loadOperators();
    } catch (e2) {
      console.error("[AdminOperatorsPage] create error:", e2);
      setMsg({ ok: false, text: `Create failed: ${normalizeDbError(e2)}` });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (r) => {
    setMsg(null);
    setEditingId(r.id);
    setEditDraft({
      id: r.id,
      cognome: (r.cognome ?? "").toString(),
      nome: (r.nome ?? "").toString(),
      birth_date: (r.birth_date ?? "").toString(),
      operator_code: (r.operator_code ?? "").toString(),
      rolesCsv: Array.isArray(r.roles) ? r.roles.join(", ") : "",
      legacy_name: (r.legacy_name ?? "").toString(),
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const onSaveEdit = async () => {
    if (!editDraft?.id) return;

    setMsg(null);

    const c = (editDraft.cognome ?? "").trim();
    const n = (editDraft.nome ?? "").trim();
    const bd = (editDraft.birth_date ?? "").trim();

    if (!c || !n || !bd) {
      setMsg({ ok: false, text: "Cognome, Nome e Data di nascita sono obbligatori." });
      return;
    }
    if (!isValidISODate(bd)) {
      setMsg({ ok: false, text: "Data di nascita non valida. Formato richiesto: YYYY-MM-DD." });
      return;
    }

    const roles = parseCsv(editDraft.rolesCsv);
    if (roles.length === 0) {
      setMsg({ ok: false, text: "Roles non può essere vuoto (es: OPERAIO)." });
      return;
    }

    setSaving(true);
    try {
      // Keep legacy name consistent but do not depend on it
      const legacy = (editDraft.legacy_name ?? "").trim() || `${c} ${n}`.trim();

      const payload = {
        name: legacy,
        cognome: c,
        nome: n,
        birth_date: bd,
        roles,
        operator_code: (editDraft.operator_code ?? "").trim() || null,
      };

      const { error } = await supabase.from("operators").update(payload).eq("id", editDraft.id);
      if (error) throw error;

      setMsg({ ok: true, text: "Operatore aggiornato." });
      await loadOperators();
      closeEdit();
    } catch (e) {
      console.error("[AdminOperatorsPage] save edit error:", e);
      setMsg({ ok: false, text: `Save failed: ${normalizeDbError(e)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-5">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {t(lang, "OPERATORS") || "Operators"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Admin operai. Identità obbligatoria: <span className="text-slate-200">cognome, nome, birth_date</span>.
            Il trigger blocca insert/update incompleti.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOperators}
            className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
            title="Ricarica operatori"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={hardResetUI}
            className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
            title="Reset UI + clear sessionStorage snapshot"
          >
            {t(lang, "RESET") || "Reset"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={[
            "mt-4 text-[13px] rounded-xl px-3 py-2 border",
            msg.ok
              ? "text-emerald-200 bg-emerald-900/20 border-emerald-800"
              : "text-amber-200 bg-amber-900/30 border-amber-800",
          ].join(" ")}
        >
          {msg.text}
        </div>
      )}

      {/* CREATE */}
      <div className="mt-4 border border-slate-800 rounded-2xl bg-slate-950/40 p-4 sm:p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {t(lang, "CREATE_OPERATOR") || "Create operator"}
        </div>

        <form onSubmit={onCreate} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] mb-1 text-slate-300">Cognome *</label>
            <input
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              type="text"
              required
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              type="text"
              required
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">Data di nascita * (YYYY-MM-DD)</label>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              type="date"
              required
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[12px] mb-1 text-slate-300">Operator code (opzionale)</label>
            <input
              value={operatorCode}
              onChange={(e) => setOperatorCode(e.target.value)}
              type="text"
              placeholder="es: OP-001"
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[12px] mb-1 text-slate-300">Roles (CSV) *</label>
            <input
              value={rolesCsv}
              onChange={(e) => setRolesCsv(e.target.value)}
              type="text"
              placeholder="es: OPERAIO, ELETTRICISTA"
              className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />
            <div className="text-[12px] text-slate-500 mt-1">
              Minimo: <span className="text-slate-300">OPERAIO</span>.
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="text-[12px] px-4 py-2 rounded-full border border-emerald-600 text-emerald-100 hover:bg-emerald-600/15 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (t(lang, "CREATING") || "Creating…") : (t(lang, "CREATE") || "Create")}
            </button>
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="mt-4 border border-slate-800 rounded-2xl bg-slate-950/20 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t(lang, "LIST") || "List"}
            </div>
            <div className="text-xs text-slate-400 mt-1">{loading ? "Loading…" : `${filtered.length} operatori`}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(lang, "SEARCH") || "Search"}
              className="w-full sm:w-72 rounded-xl border px-3 py-2 text-[13px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
            />

            <label className="flex items-center gap-2 text-[12px] text-slate-300 select-none">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={(e) => setOnlyIncomplete(e.target.checked)}
              />
              Solo identità incompleta
            </label>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-800 rounded-xl">
          <table className="min-w-[1280px] w-full text-[12px]">
            <thead className="bg-slate-900/60 text-slate-300">
              <tr className="text-left">
                <th className="px-3 py-2">Display</th>
                <th className="px-3 py-2">Cognome</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Birth</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Roles</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">{t(lang, "ACTIONS") || "Actions"}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={10}>
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={10}>
                    {t(lang, "NO_ROWS") || "No rows"}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const incomplete = r.is_identity_incomplete === true;
                  const roles = Array.isArray(r.roles) ? r.roles.join(", ") : "";

                  return (
                    <tr key={r.id} className="text-slate-200 hover:bg-slate-900/30">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{r.display_name || "—"}</span>
                          <span className="text-slate-500">{r.legacy_name || ""}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2">{r.cognome || <span className="text-slate-600">—</span>}</td>
                      <td className="px-3 py-2">{r.nome || <span className="text-slate-600">—</span>}</td>
                      <td className="px-3 py-2">{fmtDate(r.birth_date)}</td>

                      <td className="px-3 py-2">{r.operator_code || <span className="text-slate-600">—</span>}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                        {r.operator_key || <span className="text-slate-600">—</span>}
                      </td>

                      <td className="px-3 py-2">{roles || <span className="text-slate-600">—</span>}</td>

                      <td className="px-3 py-2">
                        {incomplete ? (
                          <span className="px-2 py-0.5 rounded-full border border-amber-700/50 bg-amber-500/10 text-amber-200 text-[11px]">
                            IDENTITY KO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full border border-emerald-700/40 bg-emerald-500/10 text-emerald-200 text-[11px]">
                            OK
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                        {String(r.id).slice(0, 8)}…
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="px-2 py-1 rounded-xl border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                          >
                            Edit
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
                            onClick={() => copy(r.display_name || "")}
                            className="px-2 py-1 rounded-xl border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                          >
                            Copy name
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
            {t(lang, "PAGE") || "Page"} {Math.min(Math.max(1, page), totalPages)} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(lang, "PREV") || "Prev"}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(lang, "NEXT") || "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingId && editDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Edit operator</div>
                <div className="text-xs text-slate-400 mt-1">
                  Salvataggio su tabella <span className="text-slate-200 font-mono">operators</span>. Identità obbligatoria.
                </div>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="text-[12px] px-3 py-1.5 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] mb-1 text-slate-300">Cognome *</label>
                <input
                  value={editDraft.cognome}
                  onChange={(e) => setEditDraft((d) => ({ ...d, cognome: e.target.value }))}
                  type="text"
                  required
                  className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[12px] mb-1 text-slate-300">Nome *</label>
                <input
                  value={editDraft.nome}
                  onChange={(e) => setEditDraft((d) => ({ ...d, nome: e.target.value }))}
                  type="text"
                  required
                  className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[12px] mb-1 text-slate-300">Data di nascita * (YYYY-MM-DD)</label>
                <input
                  value={editDraft.birth_date}
                  onChange={(e) => setEditDraft((d) => ({ ...d, birth_date: e.target.value }))}
                  type="date"
                  required
                  className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[12px] mb-1 text-slate-300">Operator code (opzionale)</label>
                <input
                  value={editDraft.operator_code}
                  onChange={(e) => setEditDraft((d) => ({ ...d, operator_code: e.target.value }))}
                  type="text"
                  className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[12px] mb-1 text-slate-300">Roles (CSV) *</label>
                <input
                  value={editDraft.rolesCsv}
                  onChange={(e) => setEditDraft((d) => ({ ...d, rolesCsv: e.target.value }))}
                  type="text"
                  className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[12px] mb-1 text-slate-300">Legacy name (facoltativo)</label>
                <input
                  value={editDraft.legacy_name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, legacy_name: e.target.value }))}
                  type="text"
                  className="w-full rounded-xl border px-3 py-2 text-[14px] focus:ring-1 focus:outline-none bg-slate-900 border-slate-700 text-slate-50 focus:ring-sky-500"
                />
                <div className="text-[12px] text-slate-500 mt-1">
                  Se vuoto, viene impostato automaticamente a “Cognome Nome”.
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => copy(editDraft.id)}
                  className="text-[12px] px-3 py-2 rounded-full border border-slate-800 text-slate-200 hover:bg-slate-900/50"
                >
                  Copy ID
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={onSaveEdit}
                  className="text-[12px] px-4 py-2 rounded-full border border-emerald-600 text-emerald-100 hover:bg-emerald-600/15 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
