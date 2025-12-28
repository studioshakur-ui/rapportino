// /src/admin/components/CatalogoAttivitaEditorModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./../lib/supabaseClient";
import { useAuth } from "./../auth/AuthProvider";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function isAdminProfile(profile) {
  const roleEnum = (profile?.role ?? "").toString().toUpperCase();
  const roleText = (profile?.app_role ?? "").toString().toUpperCase();
  return roleEnum === "ADMIN" || roleText === "ADMIN";
}

function modalWrapClass() {
  return "fixed inset-0 z-[90] flex items-end sm:items-center sm:justify-center";
}
function modalOverlayClass() {
  return "absolute inset-0 bg-black/70";
}
function modalPanelClass() {
  return [
    "relative w-full sm:w-[min(980px,96vw)]",
    "rounded-t-3xl sm:rounded-3xl border border-slate-800",
    "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
    "px-4 pb-4 pt-4",
  ].join(" ");
}

function toneBadgeTone(type) {
  const t = String(type || "").toUpperCase();
  if (t === "QUANTITATIVE") return "border-sky-400/25 bg-sky-500/10 text-sky-100";
  if (t === "FORFAIT") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  if (t === "QUALITATIVE") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

function normalizeSynonymsInput(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return [];
  // Accept CSV + newline; normalize and dedupe
  const parts = s
    .split(/[\n,]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function fmtPrevistoInput(v) {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  const s = n % 1 === 0 ? n.toFixed(1) : String(n);
  return s.replace(".", ",");
}

function parsePrevistoInput(s) {
  const raw = (s ?? "").toString().trim();
  if (!raw) return null;
  // Accept comma decimal
  const norm = raw.replace(",", ".");
  const n = Number(norm);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

export default function CatalogoAttivitaEditorModal({ open, initial, onClose, onSaved }) {
  const { profile } = useAuth();
  const isAdmin = useMemo(() => isAdminProfile(profile), [profile]);

  const isEdit = !!initial?.id;

  const [categoria, setCategoria] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [activityType, setActivityType] = useState("QUANTITATIVE");
  const [unit, setUnit] = useState("NONE");
  const [previstoRaw, setPrevistoRaw] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [synonymsRaw, setSynonymsRaw] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [dangerOpen, setDangerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErr("");
    setOkMsg("");
    setDangerOpen(false);

    setCategoria(String(initial?.categoria || "").trim());
    setDescrizione(String(initial?.descrizione || "").trim());
    setActivityType(String(initial?.activity_type || "QUANTITATIVE").trim() || "QUANTITATIVE");
    setUnit(String(initial?.unit || "NONE").trim() || "NONE");
    setPrevistoRaw(fmtPrevistoInput(initial?.previsto_value));
    setIsActive(initial?.is_active == null ? true : !!initial.is_active);

    const syn = Array.isArray(initial?.synonyms) ? initial.synonyms : [];
    setSynonymsRaw(syn.join(", "));
  }, [open, initial]);

  const synonymsList = useMemo(() => normalizeSynonymsInput(synonymsRaw), [synonymsRaw]);

  const canSave = useMemo(() => {
    if (!isAdmin) return false;
    const c = categoria.trim();
    const d = descrizione.trim();
    if (!c || !d) return false;
    if (!activityType) return false;
    if (!unit) return false;

    const pv = parsePrevistoInput(previstoRaw);
    if (Number.isNaN(pv)) return false;
    return true;
  }, [isAdmin, categoria, descrizione, activityType, unit, previstoRaw]);

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const save = async () => {
    if (!canSave) {
      setErr("Compila i campi obbligatori (categoria, descrizione, tipo, unità). Previsto deve essere numerico.");
      return;
    }
    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      const payload = {
        categoria: categoria.trim(),
        descrizione: descrizione.trim(),
        activity_type: activityType,
        unit,
        previsto_value: (() => {
          const pv = parsePrevistoInput(previstoRaw);
          if (pv === null) return null;
          return pv;
        })(),
        is_active: !!isActive,
        synonyms: synonymsList.length > 0 ? synonymsList : null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("catalogo_attivita")
          .update(payload)
          .eq("id", initial.id);

        if (error) throw error;
        setOkMsg("Attività aggiornata.");
      } else {
        const { error } = await supabase.from("catalogo_attivita").insert(payload);
        if (error) throw error;
        setOkMsg("Attività creata.");
      }

      onSaved?.();
    } catch (e) {
      console.error("[CatalogoAttivitaEditorModal] save error:", e);
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const softDisable = async () => {
    if (!isEdit) return;
    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      const { error } = await supabase
        .from("catalogo_attivita")
        .update({ is_active: false })
        .eq("id", initial.id);

      if (error) throw error;
      setIsActive(false);
      setOkMsg("Attività disattivata (is_active=false).");
      onSaved?.();
    } catch (e) {
      console.error("[CatalogoAttivitaEditorModal] disable error:", e);
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const hardDelete = async () => {
    if (!isEdit) return;
    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      // Nota: FK su public.rapportino_rows.activity_id è ON DELETE SET NULL.
      // In ambito navale, è preferibile non cancellare: usare disattiva.
      const { error } = await supabase.from("catalogo_attivita").delete().eq("id", initial.id);
      if (error) throw error;

      setOkMsg("Attività eliminata.");
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error("[CatalogoAttivitaEditorModal] delete error:", e);
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Modifica attività" : "Nuova attività"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={modalOverlayClass()} />

      <div className={modalPanelClass()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Catalogo attività
            </div>
            <div className="mt-1 text-[15px] font-semibold text-slate-50">
              {isEdit ? "Modifica attività" : "Nuova attività"}
            </div>
            <div className="mt-1 text-[12px] text-slate-400">
              Source of truth. Preferire <span className="font-semibold">Disattiva</span> a delete.
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

        {!isAdmin ? (
          <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            Accesso negato: solo ADMIN può modificare il catalogo.
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}

        {okMsg ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100">
            {okMsg}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">Categoria *</div>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Esempio: SISTEMAZIONE"
              className={cn(
                "mt-2 w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50",
                "placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
              disabled={!isAdmin || saving}
            />
          </div>

          <div className="md:col-span-8">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">Descrizione *</div>
            <input
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Descrizione attività (canonica)"
              className={cn(
                "mt-2 w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50",
                "placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
              disabled={!isAdmin || saving}
            />
          </div>

          <div className="md:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">Tipo *</div>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className={cn(
                "mt-2 w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50",
                "outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
              disabled={!isAdmin || saving}
            >
              <option value="QUANTITATIVE">QUANTITATIVE</option>
              <option value="FORFAIT">FORFAIT</option>
              <option value="QUALITATIVE">QUALITATIVE</option>
            </select>

            <div className="mt-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  toneBadgeTone(activityType)
                )}
              >
                {activityType}
              </span>
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">Unità *</div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={cn(
                "mt-2 w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50",
                "outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
              disabled={!isAdmin || saving}
            >
              <option value="NONE">NONE</option>
              <option value="COEFF">COEFF</option>
              <option value="MT">MT</option>
              <option value="PZ">PZ</option>
            </select>
            <div className="mt-1 text-[11px] text-slate-500">
              In CORE, l’unità è informativa: KPI usa previsto/prodotto, non MT/PZ.
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">Previsto (valore)</div>
            <input
              value={previstoRaw}
              onChange={(e) => setPrevistoRaw(e.target.value)}
              placeholder="es. 120,0"
              className={cn(
                "mt-2 w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50",
                "placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
              disabled={!isAdmin || saving}
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Vuoto = non applicabile. Virgola accettata.
            </div>
          </div>

          <div className="md:col-span-12">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">Synonyms</div>
            <textarea
              value={synonymsRaw}
              onChange={(e) => setSynonymsRaw(e.target.value)}
              placeholder="Sinonimi separati da virgola o a capo (es: posa cavi, sistemazione, organizzazione…) "
              className={cn(
                "mt-2 w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60 px-3 py-3 text-[13px] text-slate-50",
                "placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
              rows={3}
              disabled={!isAdmin || saving}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {synonymsList.length === 0 ? (
                <span className="text-[11px] text-slate-500">Nessun sinonimo.</span>
              ) : (
                synonymsList.slice(0, 24).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-200"
                    title={s}
                  >
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-12">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-100">Stato attività</div>
                <div className="text-[11px] text-slate-400">
                  Disattiva = non appare nel picker (vista public). Consigliato rispetto al delete.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                disabled={!isAdmin || saving}
                className={cn(
                  "rounded-full border px-4 py-2 text-[12px] font-semibold",
                  isActive
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                    : "border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
                  (!isAdmin || saving) ? "opacity-60 cursor-not-allowed" : ""
                )}
              >
                {isActive ? "ATTIVA" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEdit ? (
              <>
                <button
                  type="button"
                  onClick={softDisable}
                  disabled={!isAdmin || saving}
                  className={cn(
                    "rounded-2xl border px-4 py-2.5 text-[12px] font-semibold",
                    "border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
                    (!isAdmin || saving) ? "opacity-60 cursor-not-allowed" : ""
                  )}
                  title="Disattiva (consigliato)"
                >
                  Disattiva
                </button>

                <button
                  type="button"
                  onClick={() => setDangerOpen((v) => !v)}
                  disabled={!isAdmin || saving}
                  className={cn(
                    "rounded-2xl border px-4 py-2.5 text-[12px] font-semibold",
                    "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/35",
                    (!isAdmin || saving) ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  Danger zone
                </button>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">
                Creazione nuova attività (id generato automaticamente).
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className={cn(
                "rounded-2xl border px-4 py-2.5 text-[12px] font-semibold",
                "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/35",
                saving ? "opacity-60 cursor-not-allowed" : ""
              )}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className={cn(
                "rounded-2xl border px-4 py-2.5 text-[12px] font-semibold",
                "border-sky-400/30 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
                (!canSave || saving) ? "opacity-60 cursor-not-allowed" : ""
              )}
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        {isEdit && dangerOpen ? (
          <div className="mt-4 rounded-3xl border border-rose-400/25 bg-rose-500/10 p-4">
            <div className="text-[12px] font-semibold text-rose-100">Danger zone</div>
            <div className="mt-1 text-[12px] text-rose-100/90">
              Delete è sconsigliato: le righe rapportino collegate perderanno activity_id (ON DELETE SET NULL).
              Preferire <span className="font-semibold">Disattiva</span>.
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={hardDelete}
                disabled={!isAdmin || saving}
                className={cn(
                  "rounded-2xl border px-4 py-2.5 text-[12px] font-semibold",
                  "border-rose-400/35 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
                  (!isAdmin || saving) ? "opacity-60 cursor-not-allowed" : ""
                )}
              >
                Elimina definitivamente
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
