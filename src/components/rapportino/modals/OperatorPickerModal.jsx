// /src/components/rapportino/modals/OperatorPickerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  modalOverlayClass,
  modalPanelClass,
  modalWrapClass,
  normalizeOperatorLabel,
} from "../page/rapportinoHelpers";

/**
 * CORE signature (B):
 * - Operator modal supports toggle add/remove.
 * - If operator already in row: show "Rimuovi" (soft destructive).
 * - Otherwise: show "Aggiungi".
 *
 * Props:
 * - open: boolean
 * - rowIndex: number | null
 * - selectedOperatorIds: string[] (canonical row operator ids)
 * - onClose: () => void
 * - onToggleOperator: ({id,name,position?}, action: "add"|"remove") => void
 */

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeLower(s) {
  return String(s || "").toLowerCase();
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

export default function OperatorPickerModal({
  open,
  rowIndex,
  selectedOperatorIds,
  onClose,
  onToggleOperator,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [list, setList] = useState([]);

  const selectedSet = useMemo(() => {
    const s = new Set();
    (Array.isArray(selectedOperatorIds) ? selectedOperatorIds : []).forEach((x) => {
      if (x) s.add(String(x));
    });
    return s;
  }, [selectedOperatorIds]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("capo_my_team_v2")
        .select("operator_id, operator_display_name, operator_position, cognome, nome");

      if (error) throw error;

      const raw = Array.isArray(data) ? data : [];
      const mapped = raw
        .map((r) => {
          const id = r.operator_id || null;
          const name = normalizeOperatorLabel(r.operator_display_name || "");
          const position = r.operator_position ?? null;
          if (!id || !name) return null;
          return { id, name, position, raw: r };
        })
        .filter(Boolean);

      mapped.sort((a, b) => {
        const ap = a.position;
        const bp = b.position;
        const aHas = ap !== null && ap !== undefined;
        const bHas = bp !== null && bp !== undefined;

        if (aHas && bHas && ap !== bp) return ap - bp;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        const an = safeLower(a.name);
        const bn = safeLower(b.name);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });

      const seen = new Set();
      const dedup = [];
      for (const it of mapped) {
        const k = String(it.id);
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(it);
      }

      setList(dedup);
    } catch (e) {
      console.error("[OperatorPickerModal] load error:", e);
      setErr(normalizeError(e));
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQuery("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const qq = safeLower(query.trim());
    if (!qq) return list;
    return list.filter((x) => safeLower(x.name).includes(qq));
  }, [list, query]);

  if (!open) return null;

  const rowLabel = rowIndex != null ? rowIndex + 1 : "—";

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label="Seleziona operatore"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={modalOverlayClass()} />
      <div className={modalPanelClass()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Operatori di oggi</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">Aggiungi / Rimuovi</div>
            <div className="mt-1 text-[12px] text-slate-400">
              Riga: <span className="text-slate-200 font-semibold">{rowLabel}</span>
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

        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca…"
            className={[
              "w-full rounded-2xl border",
              "border-slate-800 bg-slate-950/60",
              "px-3 py-3 text-[13px] text-slate-50",
              "placeholder:text-slate-500",
              "outline-none focus:ring-2 focus:ring-sky-500/35",
            ].join(" ")}
          />
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
              Nessun operatore.
            </div>
          ) : (
            filtered.map((it) => {
              const isSelected = selectedSet.has(String(it.id));
              const action = isSelected ? "remove" : "add";

              return (
                <div
                  key={it.id}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3",
                    "border-slate-800 bg-slate-950/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-50 truncate">{it.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                            Già presente nella riga
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                            Disponibile
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleOperator?.({ id: it.id, name: it.name, position: it.position }, action)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-[12px] font-semibold",
                        "focus:outline-none focus:ring-2",
                        isSelected
                          ? "border-rose-400/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15 focus:ring-rose-400/30"
                          : "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15 focus:ring-sky-400/30"
                      )}
                      title={isSelected ? "Rimuovi operatore dalla riga" : "Aggiungi operatore alla riga"}
                    >
                      {isSelected ? "Rimuovi" : "Aggiungi"}
                    </button>
                  </div>
                </div>
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
