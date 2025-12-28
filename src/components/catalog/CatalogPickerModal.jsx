// /src/components/catalog/CatalogPickerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeLower(s) {
  return String(s || "").toLowerCase();
}

function normalizeText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function formatPrevisto(v) {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  // Keep compact formatting (Italian comma not required here; input can be numeric)
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

function modalWrapClass() {
  return "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center";
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

export default function CatalogPickerModal({
  open,
  onClose,
  onPick, // (activity) => void
  title = "Catalogo attività",
  subtitle = "Seleziona un’attività dal catalogo",
  allowMulti = false, // V1: false (single add), can enable later
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);

  // multi (optional)
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;

    let active = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data, error } = await supabase
          .from("catalogo_attivita")
          .select(
            "id, categoria, descrizione, activity_type, unit, previsto_value, is_active, synonyms, created_at, updated_at"
          )
          .eq("is_active", true)
          .order("categoria", { ascending: true })
          .order("descrizione", { ascending: true });

        if (error) throw error;
        if (!active) return;

        const arr = Array.isArray(data) ? data : [];
        setItems(arr);
      } catch (e) {
        console.error("[CatalogPickerModal] load error:", e);
        setErr("Impossibile caricare il catalogo attività.");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = safeLower(normalizeText(query));
    if (!q) return items;

    return items.filter((it) => {
      const cat = safeLower(it?.categoria);
      const desc = safeLower(it?.descrizione);
      const syn = Array.isArray(it?.synonyms) ? it.synonyms : [];
      const synHit = syn.some((s) => safeLower(s).includes(q));
      return cat.includes(q) || desc.includes(q) || synHit;
    });
  }, [items, query]);

  const grouped = useMemo(() => {
    // group by categoria for nicer browsing
    const map = new Map();
    for (const it of filtered) {
      const k = normalizeText(it?.categoria) || "ALTRO";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const ak = safeLower(a[0]);
      const bk = safeLower(b[0]);
      if (ak < bk) return -1;
      if (ak > bk) return 1;
      return 0;
    });
  }, [filtered]);

  const close = () => {
    setQuery("");
    setSelected(new Set());
    onClose?.();
  };

  const handlePick = (it) => {
    if (!it?.id) return;

    if (allowMulti) {
      setSelected((prev) => {
        const next = new Set(prev);
        const k = String(it.id);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
      return;
    }

    onPick?.(it);
    close();
  };

  const handleConfirmMulti = () => {
    if (!allowMulti) return;
    const chosen = items.filter((it) => selected.has(String(it.id)));
    for (const it of chosen) onPick?.(it);
    close();
  };

  if (!open) return null;

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label="Catalogo attività"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={modalOverlayClass()} />
      <div className={modalPanelClass()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Catalogo</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">{title}</div>
            <div className="mt-1 text-[12px] text-slate-400">{subtitle}</div>
          </div>

          <div className="flex items-center gap-2">
            {allowMulti ? (
              <button
                type="button"
                onClick={handleConfirmMulti}
                disabled={selected.size === 0}
                className={cn(
                  "rounded-full border px-3 py-2 text-[12px] font-semibold",
                  selected.size === 0
                    ? "border-slate-800 bg-slate-950/30 text-slate-500 cursor-not-allowed"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/22"
                )}
                title="Aggiungi selezionati"
              >
                Aggiungi ({selected.size})
              </button>
            ) : null}

            <button
              type="button"
              onClick={close}
              className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
            >
              Chiudi
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca categoria, descrizione o sinonimi…"
            className={cn(
              "w-full rounded-2xl border",
              "border-slate-800 bg-slate-950/60",
              "px-3 py-3 text-[13px] text-slate-50",
              "placeholder:text-slate-500",
              "outline-none focus:ring-2 focus:ring-sky-500/35"
            )}
          />
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}

        <div className="mt-3 max-h-[62vh] overflow-auto pr-1 space-y-3">
          {loading ? (
            <div className="text-[12px] text-slate-400">Caricamento…</div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
              Nessuna attività trovata.
            </div>
          ) : (
            grouped.map(([cat, arr]) => (
              <div key={cat} className="rounded-2xl border border-slate-800 bg-slate-950/35">
                <div className="px-3 py-2 border-b border-slate-800/70 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{cat}</div>
                  <div className="text-[11px] text-slate-500">{arr.length}</div>
                </div>

                <div className="divide-y divide-slate-800/70">
                  {arr.map((it) => {
                    const isSel = selected.has(String(it.id));
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handlePick(it)}
                        className={cn(
                          "w-full text-left px-3 py-3 transition-colors",
                          "hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/25",
                          allowMulti && isSel ? "bg-sky-500/10" : ""
                        )}
                        title={allowMulti ? "Seleziona" : "Aggiungi"}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-slate-50">
                              {normalizeText(it?.descrizione) || "—"}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-2 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                                {it?.activity_type || "TYPE"}
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-2 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                                {it?.unit || "UNIT"}
                              </span>
                              {it?.previsto_value !== null && it?.previsto_value !== undefined ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-2 py-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                  Previsto: {formatPrevisto(it.previsto_value)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {allowMulti ? (
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-semibold",
                                  isSel
                                    ? "border-sky-500/50 bg-sky-500/15 text-sky-100"
                                    : "border-slate-800 bg-slate-950/40 text-slate-300"
                                )}
                                aria-hidden="true"
                              >
                                {isSel ? "✓" : "+"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                                Aggiungi
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
          >
            Fine
          </button>
        </div>
      </div>
    </div>
  );
}
