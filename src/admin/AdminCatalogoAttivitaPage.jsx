// /src/admin/AdminCatalogoAttivitaPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeLower(s) {
  return String(s || "").toLowerCase();
}

const ACTIVITY_TYPES = ["QUANTITATIVE", "FORFAIT", "QUALITATIVE"];
const UNITS = ["MT", "PZ"];

function normalizeText(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function normalizeError(e) {
  if (!e) return "Erreur inconnue";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function modalWrapClass() {
  return "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center";
}
function modalOverlayClass() {
  return "absolute inset-0 bg-black/70";
}
function modalPanelClass() {
  return [
    "relative w-full sm:w-[min(860px,96vw)]",
    "rounded-t-3xl sm:rounded-3xl border border-slate-800",
    "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
    "px-4 pb-4 pt-4",
  ].join(" ");
}

export default function AdminCatalogoAttivitaPage({ isDark = true }) {
  const panelClass = isDark
    ? "rounded-3xl border border-slate-800 bg-slate-950/20"
    : "rounded-3xl border border-slate-200 bg-white";

  const titleColor = isDark ? "text-slate-100" : "text-slate-900";
  const subColor = isDark ? "text-slate-400" : "text-slate-600";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [rows, setRows] = useState([]);

  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    categoria: "",
    descrizione: "",
    activity_type: "QUANTITATIVE",
    unit: "MT",
    previsto_value: "",
    synonyms: "",
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      let q = supabase
        .from("catalogo_attivita")
        .select("id, categoria, descrizione, activity_type, unit, previsto_value, is_active, synonyms, created_at, updated_at")
        .order("categoria", { ascending: true })
        .order("descrizione", { ascending: true });

      if (onlyActive) q = q.eq("is_active", true);

      const { data, error } = await q;
      if (error) throw error;

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminCatalogoAttivitaPage] load error:", e);
      setErr(normalizeError(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  const filtered = useMemo(() => {
    const qq = safeLower(query.trim());
    if (!qq) return rows;
    return rows.filter((r) => {
      const cat = safeLower(r.categoria || "");
      const desc = safeLower(r.descrizione || "");
      const syn = Array.isArray(r.synonyms) ? r.synonyms.join(" ") : "";
      return cat.includes(qq) || desc.includes(qq) || safeLower(syn).includes(qq);
    });
  }, [rows, query]);

  const resetForm = () => {
    setForm({
      categoria: "",
      descrizione: "",
      activity_type: "QUANTITATIVE",
      unit: "MT",
      previsto_value: "",
      synonyms: "",
      is_active: true,
    });
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      categoria: row.categoria || "",
      descrizione: row.descrizione || "",
      activity_type: row.activity_type || "QUANTITATIVE",
      unit: row.unit || "MT",
      previsto_value: row.previsto_value === null || row.previsto_value === undefined ? "" : String(row.previsto_value),
      synonyms: Array.isArray(row.synonyms) ? row.synonyms.join(", ") : "",
      is_active: !!row.is_active,
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    resetForm();
  };

  const parseNumeric = (v) => {
    const s = String(v || "").trim();
    if (!s) return null;
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const parseSynonyms = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return null;
    const arr = s
      .split(",")
      .map((x) => normalizeText(x))
      .filter(Boolean);
    return arr.length ? arr : null;
  };

  const save = async () => {
    setSaving(true);
    setErr("");

    try {
      const payload = {
        categoria: normalizeText(form.categoria),
        descrizione: normalizeText(form.descrizione),
        activity_type: form.activity_type,
        unit: form.unit,
        previsto_value: parseNumeric(form.previsto_value),
        synonyms: parseSynonyms(form.synonyms),
        is_active: !!form.is_active,
      };

      if (!payload.categoria || !payload.descrizione) {
        throw new Error("Categoria e Descrizione sono obbligatorie.");
      }

      if (!ACTIVITY_TYPES.includes(payload.activity_type)) {
        throw new Error("activity_type non valido.");
      }
      if (!UNITS.includes(payload.unit)) {
        throw new Error("unit non valida (MT/PZ).");
      }

      if (!editingId) {
        const { error } = await supabase.from("catalogo_attivita").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catalogo_attivita").update(payload).eq("id", editingId);
        if (error) throw error;
      }

      await load();
      close();
    } catch (e) {
      console.error("[AdminCatalogoAttivitaPage] save error:", e);
      setErr(normalizeError(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    setErr("");
    try {
      const { error } = await supabase
        .from("catalogo_attivita")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);

      if (error) throw error;
      await load();
    } catch (e) {
      console.error("[AdminCatalogoAttivitaPage] toggleActive error:", e);
      setErr(normalizeError(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className={cn(panelClass, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className={cn("text-[11px] uppercase tracking-[0.26em]", isDark ? "text-slate-500" : "text-slate-500")}>
              Admin · Catalogo Attività (source of truth)
            </div>
            <div className={cn("text-xl sm:text-2xl font-semibold", titleColor)}>
              Catalogo Attività (MT / PZ)
            </div>
            <div className={cn("text-[12px] sm:text-[13px] max-w-3xl leading-relaxed", subColor)}>
              Regola: nessuna attività “a caso”. Rapportino e KPI dipendono da questo catalogo.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-full border border-emerald-500/50 bg-emerald-950/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-900/25 transition"
            >
              + Nuova attività
            </button>
          </div>
        </div>
      </div>

      <div className={cn(panelClass, "p-4 sm:p-5 space-y-4")}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Ricerca</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Categoria / descrizione / synonyms…"
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[13px] outline-none",
                isDark
                  ? "border-slate-800 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/35"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/25"
              )}
            />
          </div>

          <div>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", subColor)}>Filtro</div>
            <button
              type="button"
              onClick={() => setOnlyActive((v) => !v)}
              className={cn(
                "mt-1 w-full rounded-2xl border px-3 py-3 text-[12px] font-semibold",
                isDark
                  ? "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              )}
            >
              {onlyActive ? "Solo attive" : "Tutte (incl. disattive)"}
            </button>
          </div>
        </div>

        {err ? (
          <div className={cn("rounded-2xl border px-3 py-2 text-[12px]", isDark ? "border-rose-500/30 bg-rose-950/20 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-800")}>
            {err}
          </div>
        ) : null}

        <div className={cn("overflow-hidden rounded-3xl border", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("px-4 py-3 text-[11px] uppercase tracking-[0.22em]", isDark ? "bg-slate-950/40 text-slate-400" : "bg-slate-50 text-slate-500")}>
            Attività · {filtered.length}
          </div>

          {loading ? (
            <div className={cn("px-4 py-6 text-[12px]", isDark ? "bg-slate-950/20 text-slate-400" : "bg-white text-slate-600")}>
              Caricamento…
            </div>
          ) : filtered.length === 0 ? (
            <div className={cn("px-4 py-6 text-[12px]", isDark ? "bg-slate-950/20 text-slate-400" : "bg-white text-slate-600")}>
              Nessuna attività.
            </div>
          ) : (
            <div className={cn(isDark ? "bg-slate-950/15" : "bg-white")}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={cn(isDark ? "text-slate-400" : "text-slate-500")}>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-left px-4 py-3">Descrizione</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Unit</th>
                    <th className="text-right px-4 py-3">Previsto</th>
                    <th className="text-center px-4 py-3">Stato</th>
                    <th className="text-right px-4 py-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className={cn("border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                      <td className="px-4 py-3">
                        <div className={cn("font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                          {r.categoria}
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.descrizione}</td>
                      <td className="px-4 py-3">{r.activity_type}</td>
                      <td className="px-4 py-3">{r.unit}</td>
                      <td className="px-4 py-3 text-right">{r.previsto_value === null ? "—" : String(r.previsto_value)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            r.is_active
                              ? isDark
                                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : isDark
                              ? "border-slate-800 bg-slate-950/40 text-slate-400"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          )}
                        >
                          {r.is_active ? "ATTIVA" : "OFF"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                              isDark
                                ? "border-slate-800 bg-slate-950/40 text-slate-100 hover:bg-slate-900/35"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            )}
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(r)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                              r.is_active
                                ? isDark
                                  ? "border-rose-500/30 bg-rose-950/20 text-rose-200 hover:bg-rose-900/25"
                                  : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                                : isDark
                                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/25"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            )}
                          >
                            {r.is_active ? "Disattiva" : "Attiva"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={cn("text-[11px] leading-relaxed", subColor)}>
          Nota: la policy RLS attuale consente scrittura solo ad <span className={cn(isDark ? "text-slate-200 font-semibold" : "text-slate-900 font-semibold")}>ADMIN</span>.
        </div>
      </div>

      {/* MODAL */}
      {open ? (
        <div
          className={modalWrapClass()}
          role="dialog"
          aria-modal="true"
          aria-label="Catalogo Attività"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={modalOverlayClass()} />
          <div className={modalPanelClass()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  {editingId ? "Modifica attività" : "Nuova attività"}
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  Catalogo — strict source of truth
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Categoria</div>
                <input
                  value={form.categoria}
                  onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                  placeholder="es: STESURA"
                />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Descrizione</div>
                <input
                  value={form.descrizione}
                  onChange={(e) => setForm((p) => ({ ...p, descrizione: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                  placeholder="es: STESURA DIRETTIVA IMPLM"
                />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Activity type</div>
                <select
                  value={form.activity_type}
                  onChange={(e) => setForm((p) => ({ ...p, activity_type: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Unit</div>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Previsto (numeric)</div>
                <input
                  value={form.previsto_value}
                  onChange={(e) => setForm((p) => ({ ...p, previsto_value: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                  placeholder="es: 350 (vuoto = NULL)"
                />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Synonyms (CSV)</div>
                <input
                  value={form.synonyms}
                  onChange={(e) => setForm((p) => ({ ...p, synonyms: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                  placeholder="es: stesura dirette, stesura dir, ..."
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-200">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Attiva
              </label>
            </div>

            {err ? (
              <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
                {err}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-full border border-emerald-500/50 bg-emerald-950/20 px-4 py-2 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-900/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60"
              >
                {saving ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
