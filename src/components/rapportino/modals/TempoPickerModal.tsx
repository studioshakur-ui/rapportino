// /src/components/rapportino/modals/TempoPickerModal.jsx
import { useMemo } from "react";
import {
  buildTempoOptions,
  modalOverlayClass,
  modalPanelClass,
  modalWrapClass,
  normalizeOperatorLabel,
} from "../page/rapportinoHelpers";

/**
 * TempoPickerModal — option terrain:
 * - Bouton “Rimuovi operatore” par opérateur (ultra terrain)
 * - No regress: set tempo inchangé, list/UX inchangés, ajout safe
 *
 * Props:
 * - open: boolean
 * - rowIndex: number | null
 * - items: operator_items[]
 * - onClose: () => void
 * - onSetTempoForLine: (lineIndex, tempoRaw) => void
 * - onRemoveOperator?: (operatorId) => void
 */

export default function TempoPickerModal({
  open,
  rowIndex,
  items,
  onClose,
  onSetTempoForLine,
  onRemoveOperator,
}: {
  open: boolean;
  rowIndex: number | null;
  items: unknown;
  onClose?: () => void;
  onSetTempoForLine?: (lineIndex: number, tempoRaw: string) => void;
  onRemoveOperator?: (operatorId: string) => void;
}): JSX.Element | null {
  const tmOptions = useMemo(() => buildTempoOptions(), []);
  const currentItems = Array.isArray(items) ? (items as Array<{ label?: unknown; tempo_raw?: unknown; operator_id?: unknown }>) : [];
  const hasCanonicalTempo = currentItems.length > 0;

  if (!open) return null;

  return (
    <div
      className={modalWrapClass()}
      role="dialog"
      aria-modal="true"
      aria-label="Imposta ore"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={modalOverlayClass()} />
      <div className={modalPanelClass()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Tempo (ore)</div>
            <div className="mt-1 text-[14px] font-semibold text-slate-50">Imposta ore per operatore</div>
            <div className="mt-1 text-[12px] text-slate-400">
              Riga: <span className="text-slate-200 font-semibold">{rowIndex != null ? rowIndex + 1 : "—"}</span>
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

        {!hasCanonicalTempo ? (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
            Nessun operatore canonico in questa riga. Prima aggiungi almeno un operatore.
          </div>
        ) : (
          <div className="mt-4 space-y-3 max-h-[58vh] overflow-auto pr-1">
            {currentItems.map((it, lineIndex) => {
              const label = normalizeOperatorLabel(it?.label || "");
              const currentRaw = String(it?.tempo_raw ?? "").trim();
              const operatorId = it?.operator_id ? String(it.operator_id) : "";

              return (
                <div
                  key={`${String(operatorId || "op")}-${lineIndex}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-slate-50 truncate">{label || "Operatore"}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        Ore attuali: <span className="text-slate-200 font-semibold">{currentRaw ? currentRaw : "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-[11px] text-slate-500">#{lineIndex + 1}</div>

                      {onRemoveOperator && operatorId ? (
                        <button
                          type="button"
                          onClick={() => onRemoveOperator?.(operatorId)}
                          className="rounded-full border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-100 hover:bg-rose-500/15 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
                          title="Rimuovi operatore dalla riga"
                        >
                          Rimuovi
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {tmOptions.map((opt) => {
                      const active = opt.value === currentRaw;
                      return (
                        <button
                          key={`${lineIndex}-${opt.value}`}
                          type="button"
                          onClick={() => onSetTempoForLine?.(lineIndex, opt.value)}
                          className={[
                            "rounded-xl border px-2 py-2 text-[12px] font-semibold",
                            active
                              ? "border-sky-500/50 bg-sky-500/15 text-sky-100"
                              : "border-slate-800 bg-slate-950/35 text-slate-100 hover:bg-slate-900/35",
                            "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                          ].join(" ")}
                          title="Imposta"
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => onSetTempoForLine?.(lineIndex, "")}
                      className="rounded-full border border-slate-800 bg-slate-950/35 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-900/35"
                      title="Svuota"
                    >
                      Svuota
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
