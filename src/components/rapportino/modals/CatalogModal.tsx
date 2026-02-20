// src/components/rapportino/modals/CatalogModal.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function modalWrapClass(): string {
  return "fixed inset-0 z-[80] flex items-end sm:items-center sm:justify-center";
}
function modalOverlayClass(): string {
  return "absolute inset-0 bg-black/70";
}
function modalPanelClass(): string {
  return [
    "relative w-full sm:w-[min(920px,96vw)]",
    "rounded-t-3xl sm:rounded-3xl border border-slate-800",
    "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
    "px-4 pb-4 pt-4",
  ].join(" ");
}

function safeText(v: unknown): string {
  return (v == null ? "" : String(v)).trim();
}
function lowerTrim(v: unknown): string {
  return safeText(v).toLowerCase();
}

function toneBadgeTone(type: unknown): string {
  const t = String(type || "").toUpperCase();
  if (t === "QUANTITATIVE") return "border-sky-400/25 bg-sky-500/10 text-sky-100";
  if (t === "FORFAIT") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  if (t === "QUALITATIVE") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

function fmtPrevisto(n: unknown): string {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const s = v % 1 === 0 ? v.toFixed(1) : String(v);
  return s.replace(".", ",");
}

type CatalogItem = {
  id: string | number;
  categoria?: unknown;
  descrizione?: unknown;
  activity_type?: unknown;
  unit?: unknown;
  previsto_value?: unknown;
  synonyms?: unknown[];
  _scope?: { is_active?: boolean; note?: unknown };
};

function isCatalogItem(x: unknown): x is CatalogItem {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as { id?: unknown };
  if (typeof obj.id === "string") return obj.id.length > 0;
  return typeof obj.id === "number" && Number.isFinite(obj.id);
}

/**
 * CatalogModal (SCOPED)
 * - Source of truth: catalogo_ship_commessa_attivita + catalogo_attivita
 * - Filters: ship_id + commessa (obligatoire)
 * - Only active in scope (default)
 *
 * Contract returned in onPickActivity(activity):
 * {
 *   id, categoria, descrizione, activity_type, unit, previsto_value, synonyms
 * }
 */
export default function CatalogModal({
  open,
  onClose,
  onPickActivity,
  onlyActive = true,

  // REQUIRED context
  shipId,
  commessa,

  // UI
  title = "Seleziona attività",
  subtitle = "Catalogo operativo per Ship + Commessa.",
}: {
  open: boolean;
  onClose?: () => void;
  onPickActivity?: (item: CatalogItem) => void;
  onlyActive?: boolean;
  shipId: unknown;
  commessa: unknown;
  title?: string;
  subtitle?: string;
}): JSX.Element | null {
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [items, setItems] = useState<CatalogItem[]>([]);

  const hasContext = !!safeText(shipId) && !!safeText(commessa);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      setItems([]);

      try {
        if (!hasContext) {
          setErr("Seleziona Ship e inserisci Commessa prima di usare il Catalogo.");
          return;
        }

        // Read scoped rows + join global catalog
        // NOTE: This requires table public.catalogo_ship_commessa_attivita (or a view with same name/cols).
        // Columns used: ship_id, commessa, activity_id, is_active, previsto_value, unit_override, note
        const query = supabase
          .from("catalogo_ship_commessa_attivita")
          .select(
            `
            activity_id,
            is_active,
            previsto_value,
            unit_override,
            note,
            catalogo_attivita:activity_id (
              id,
              categoria,
              descrizione,
              activity_type,
              unit,
              previsto_value,
              synonyms,
              is_active
            )
          `
          )
          .eq("ship_id", String(shipId))
          .eq("commessa", safeText(commessa));

        if (onlyActive) query.eq("is_active", true);

        const { data, error } = await query;

        if (error) throw error;

        if (!alive) return;

        const rows = Array.isArray(data)
          ? (data as unknown as Array<{
              catalogo_attivita?: Record<string, unknown> | null;
              unit_override?: unknown;
              previsto_value?: unknown;
              is_active?: unknown;
              note?: unknown;
            }>)
          : [];
        const mapped: Array<CatalogItem | null> = rows.map((r) => {
          const a = r?.catalogo_attivita;
          if (!a || !("id" in a)) return null;
          const id = (a as { id?: unknown }).id;
          if (typeof id !== "string" && typeof id !== "number") return null;

          const effectiveUnit = safeText(r?.unit_override) ? safeText(r.unit_override) : safeText(a.unit);
          const effectivePrev =
            r?.previsto_value !== null && r?.previsto_value !== undefined
              ? r.previsto_value
              : a?.previsto_value;

          return {
            id,
            categoria: a.categoria,
            descrizione: a.descrizione,
            activity_type: a.activity_type,
            unit: effectiveUnit || "NONE",
            previsto_value: effectivePrev,
            synonyms: Array.isArray(a.synonyms) ? a.synonyms : [],
            // scoped metadata (optional, useful later)
            _scope: {
              is_active: !!r?.is_active,
              note: r?.note || "",
            },
          };
        });
        const normalized = mapped
          .filter((x): x is CatalogItem => isCatalogItem(x))
          .sort((x, y) => {
            const c = safeText(x.categoria).localeCompare(safeText(y.categoria));
            if (c !== 0) return c;
            return safeText(x.descrizione).localeCompare(safeText(y.descrizione));
          });

        setItems(normalized);
      } catch (e) {
        console.error("[CatalogModal] load error:", e);
        if (!alive) return;
        setErr((e as { message?: string } | null | undefined)?.message || "Impossibile caricare il catalogo (Ship/Commessa).");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, shipId, commessa, onlyActive, hasContext]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const c = safeText(it?.categoria);
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const qq = lowerTrim(q);
    const cat = lowerTrim(category);

    return items.filter((it) => {
      const c = safeText(it?.categoria);
      const d = safeText(it?.descrizione);
      if (!c || !d) return false;

      if (cat && lowerTrim(c) !== cat) return false;

      if (!qq) return true;

      const syn = Array.isArray(it?.synonyms) ? it.synonyms : [];
      const hay = [c, d, ...syn].map((x) => lowerTrim(x)).join(" ");
      return hay.includes(qq);
    });
  }, [items, q, category]);

  if (!open) return null;

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Catalogo"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={modalOverlayClass()} />

      <div className={modalPanelClass()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Catalogo (Ship + Commessa)
            </div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">{title}</div>
            <div className="mt-1 text-[12px] text-slate-400">
              {subtitle}{" "}
              {hasContext ? (
                <span className="text-slate-300">
                  · COMMESSA <span className="font-semibold">{safeText(commessa)}</span>
                </span>
              ) : null}
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
          ) : !hasContext ? (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-[12px] text-amber-100">
              Seleziona Ship e inserisci Commessa.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
              Nessuna attività trovata.
            </div>
          ) : (
            filtered.map((it) => {
              const cat = safeText(it.categoria);
              const desc = safeText(it.descrizione);
              const type = safeText(it.activity_type);
              const unit = safeText(it.unit);
              const prev = it.previsto_value;

              return (
                <button
                  key={String(it.id)}
                  type="button"
                  onClick={() => onPickActivity?.(it)}
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
