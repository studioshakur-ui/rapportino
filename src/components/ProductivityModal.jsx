// src/components/ProductivityModal.jsx
import React, { useMemo } from "react";
import { formatNum, formatPct } from "../utils/productivity";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ProductivityModal({
  open,
  onClose,
  isDark = true,
  title = "Indice produttività (%)",
  subtitle = "Prodotto / Previsto · prorata tempo operatore",
  data,
  capoNameById,
  showCapo = true,
  maxOperators = 12,
}) {
  const overlay = isDark ? "bg-black/60" : "bg-black/40";

  const surface = isDark
    ? "bg-slate-950 border-slate-800 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";

  const muted = isDark ? "text-slate-400" : "text-slate-600";
  const head = isDark ? "text-slate-200" : "text-slate-700";
  const border = isDark ? "border-slate-800/80" : "border-slate-200";

  const overall = data?.overall || { pct: null, previsto_sum: 0, prodotto_sum: 0 };
  const byCapo = Array.isArray(data?.byCapo) ? data.byCapo : [];
  const byOperator = Array.isArray(data?.byOperator) ? data.byOperator : [];

  const topOperators = useMemo(() => byOperator.slice(0, maxOperators), [byOperator, maxOperators]);

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-[80] flex items-center justify-center px-4", overlay)}>
      <div className={cn("w-full max-w-4xl rounded-2xl border shadow-[0_30px_90px_rgba(0,0,0,0.55)]", surface)}>
        <div className={cn("flex items-start justify-between gap-3 px-4 py-4 border-b", border)}>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              KPI · CNCS / CORE
            </div>
            <div className="mt-1 text-lg font-semibold">{title}</div>
            <div className={cn("text-xs mt-1", muted)}>{subtitle}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-xl border px-3 py-2 text-[12px] uppercase tracking-[0.16em] transition",
              isDark
                ? "border-slate-700 bg-slate-900/40 hover:bg-slate-800/40 text-slate-200"
                : "border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
            )}
          >
            Chiudi
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* OVERALL */}
          <div className={cn("rounded-2xl border p-4", isDark ? "border-emerald-500/30 bg-emerald-500/5" : "border-emerald-300 bg-emerald-50")}>
            <div className={cn("text-[11px] uppercase tracking-[0.16em]", isDark ? "text-emerald-300" : "text-emerald-700")}>
              Indice complessivo
            </div>

            <div className="mt-1 flex items-end justify-between gap-4">
              <div className="text-3xl font-semibold">{formatPct(overall.pct)}</div>

              <div className={cn("text-xs", muted)}>
                Previsto: <span className={head}>{formatNum(overall.previsto_sum, 1)}</span>{" "}
                · Prodotto: <span className={head}>{formatNum(overall.prodotto_sum, 1)}</span>
              </div>
            </div>
          </div>

          {/* BY CAPO */}
          {showCapo ? (
            <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white")}>
              <div className={cn("text-[11px] uppercase tracking-[0.16em] text-slate-500")}>
                Breakdown per Capo
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn("text-[11px] uppercase tracking-[0.16em]", muted)}>
                      <th className="text-left py-2 pr-3">Capo</th>
                      <th className="text-right py-2 px-3">Indice</th>
                      <th className="text-right py-2 px-3">Previsto</th>
                      <th className="text-right py-2 pl-3">Prodotto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCapo.map((c) => (
                      <tr key={c.capo_id} className={cn("border-t", border)}>
                        <td className="py-2 pr-3 text-slate-100">
                          {capoNameById?.get?.(c.capo_id) || c.capo_id}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{formatPct(c.pct)}</td>
                        <td className={cn("py-2 px-3 text-right", muted)}>{formatNum(c.previsto_sum, 1)}</td>
                        <td className={cn("py-2 pl-3 text-right", muted)}>{formatNum(c.prodotto_sum, 1)}</td>
                      </tr>
                    ))}

                    {byCapo.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={cn("py-3 text-xs", muted)}>
                          Nessun dato (manca previsto o tempo_hours valido).
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* BY OPERATOR */}
          <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white")}>
            <div className={cn("flex items-end justify-between gap-3")}>
              <div>
                <div className={cn("text-[11px] uppercase tracking-[0.16em] text-slate-500")}>
                  Breakdown per Operatore
                </div>
                <div className={cn("text-xs mt-1", muted)}>
                  Mostra i primi {maxOperators} per indice.
                </div>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn("text-[11px] uppercase tracking-[0.16em]", muted)}>
                    <th className="text-left py-2 pr-3">Operatore</th>
                    <th className="text-right py-2 px-3">Indice</th>
                    <th className="text-right py-2 px-3">Previsto</th>
                    <th className="text-right py-2 pl-3">Prodotto</th>
                  </tr>
                </thead>
                <tbody>
                  {topOperators.map((o) => (
                    <tr key={o.operator_id} className={cn("border-t", border)}>
                      <td className="py-2 pr-3 text-slate-100">{o.operator_name}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatPct(o.pct)}</td>
                      <td className={cn("py-2 px-3 text-right", muted)}>{formatNum(o.previsto_sum, 1)}</td>
                      <td className={cn("py-2 pl-3 text-right", muted)}>{formatNum(o.prodotto_sum, 1)}</td>
                    </tr>
                  ))}

                  {topOperators.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={cn("py-3 text-xs", muted)}>
                        Nessun dato operatore (previsto mancante o tempo_hours non valido).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cn("text-[11px]", muted)}>
            Nota: l’indice è calcolato come somma(prodotto_alloc) / somma(previsto_alloc) · 100, dove
            ogni allocazione è prorata su tempo_hours per riga.
          </div>
        </div>
      </div>
    </div>
  );
}
