// src/components/rapportino/ActivityPickerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function modalWrapClass() {
  return "fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center";
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

function toneBadgeTone(type) {
  const t = String(type || "").toUpperCase();
  if (t === "QUANTITATIVE") return "border-sky-400/25 bg-sky-500/10 text-sky-100";
  if (t === "FORFAIT") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  if (t === "QUALITATIVE") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

function fmtPrevisto(n) {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  // Italian decimal separator, 1 decimal minimum if integer-ish
  const s = v % 1 === 0 ? v.toFixed(1) : String(v);
  return s.replace(".", ",");
}

export default function ActivityPickerModal({
  open,
  onClose,
  onPick,

  // UI context
  title = "Seleziona attività",
  subtitle = "Tocca per scegliere dal catalogo (nessuna creazione libera).",

  // Optional filters (future-proof)
  defaultCategory = "",
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(defaultCategory || "");
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase
          .from("catalogo_attivita")
          .select("id,categoria,descrizione,activity_type,unit,previsto_value,is_active,synonyms")
          .eq("is_active", true)
          .order("categoria", { ascending: true })
          .order("descrizione", { ascending: true });

        if (error) throw error;

        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[ActivityPickerModal] load error:", e);
        if (!alive) return;
        setErr("Impossibile caricare il catalogo attività.");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const it of items) {
      const c = String(it?.categoria || "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    const cat = (category || "").trim().toLowerCase();

    return items.filter((it) => {
      const c = String(it?.categoria || "").trim();
      const d = String(it?.descrizione || "").trim();
      if (!c || !d) return false;

      if (cat && c.toLowerCase() !== cat) return false;

      if (!qq) return true;

      const syn = Array.isArray(it?.synonyms) ? it.synonyms : [];
      const hay = [
        c.toLowerCase(),
        d.toLowerCase(),
        ...syn.map((x) => String(x || "").toLowerCase()),
      ].join(" ");

      return hay.includes(qq);
    });
  }, [items, q, category]);

  if (!open) return null;

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Seleziona attività"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={modalOverlayClass()} />

      <div className={modalPanelClass()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Catalogo attività
            </div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">
              {title}
            </div>
            <div className="mt-1 text-[12px] text-slate-400">
              {subtitle}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
          >
            Chiudi
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca descrizione o sinonimi…"
            className={cn(
              "w-full rounded-2xl border",
              "border-slate-800 bg-slate-950/60",
              "px-3 py-3 text-[13px] text-slate-50",
              "placeholder:text-slate-500",
              "outline-none focus:ring-2 focus:ring-sky-500/35"
            )}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(
              "w-full rounded-2xl border",
              "border-slate-800 bg-slate-950/60",
              "px-3 py-3 text-[13px] text-slate-50",
              "outline-none focus:ring-2 focus:ring-sky-500/35"
            )}
          >
            <option value="">Tutte le categorie</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}

        <div className="mt-3 max-h-[56vh] overflow-auto pr-1 space-y-2">
          {loading ? (
            <div className="text-[12px] text-slate-400">Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
              Nessuna attività trovata.
            </div>
          ) : (
            filtered.map((it) => {
              const cat = String(it.categoria || "").trim();
              const desc = String(it.descrizione || "").trim();
              const type = String(it.activity_type || "").trim();
              const unit = String(it.unit || "").trim();
              const prev = it.previsto_value;

              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onPick?.(it)}
                  className={cn(
                    "w-full text-left rounded-2xl border px-3 py-3",
                    "border-slate-800 bg-slate-950/50 hover:bg-slate-900/35",
                    "focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                  )}
                  title="Seleziona"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400">
                        {cat}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-slate-50 truncate">
                        {desc}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            toneBadgeTone(type)
                          )}
                        >
                          {type || "—"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                          UNITÀ: {unit || "—"}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                          PREVISTO: {fmtPrevisto(prev)}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                      Seleziona
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
          >
            Fine
          </button>
        </div>
      </div>
    </div>
  );
}
