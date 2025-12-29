// src/components/kpi/operatorProd/components/OperatorDetailsModal.jsx
import React, { useMemo, useState } from "react";
import { useI18n } from "../../../../../i18n/I18nProvider";
import { cn, formatNumber, haloByIndex, pickAccent, toneByIndex } from "../utils/kpiUi";

export function OperatorDetailsModal({
  isDark,
  open,
  operator,
  families,
  totalHours,
  nonIndexedHours,
  onClose,
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState("SUMMARY");

  const idx = operator?.productivity_index_range ?? null;
  const tone = toneByIndex(idx, isDark);

  const overlayBase = cn(
    "fixed inset-0 z-50 flex items-center justify-center p-4",
    isDark ? "bg-black/60 backdrop-blur-md" : "bg-slate-900/50 backdrop-blur-md"
  );

  const modalBase = cn(
    "w-full max-w-5xl rounded-[28px] border overflow-hidden",
    isDark ? "border-slate-700/70 bg-slate-950/85" : "border-slate-200 bg-white"
  );

  const modalHeader = cn(
    "px-5 py-4 flex items-start justify-between gap-4",
    isDark ? "bg-slate-950/70 border-b border-slate-800/70" : "bg-white border-b border-slate-200"
  );

  const tabBtn = (active) =>
    cn(
      "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
      active
        ? isDark
          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
          : "border-emerald-500/50 bg-emerald-50 text-emerald-800"
        : isDark
        ? "border-slate-700 bg-slate-950/20 text-slate-200 hover:bg-slate-900/40"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    );

  const pillBtn = cn(
    "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
    isDark ? "border-slate-700 bg-slate-950/30 text-slate-100 hover:bg-slate-900/40" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  );

  const safeName = useMemo(() => {
    const s = (operator?.operator_name ?? "—").toString().trim();
    return s || "—";
  }, [operator?.operator_name]);

  if (!open || !operator) return null;

  return (
    <div
      className={overlayBase}
      role="dialog"
      aria-modal="true"
      aria-label={t("KPI_OPPROD_MODAL_TITLE")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setTab("SUMMARY");
          onClose?.();
        }
      }}
    >
      <div className={cn(modalBase, haloByIndex(idx))}>
        <div className={modalHeader}>
          <div className="min-w-0">
            <div className={cn("text-[11px] uppercase tracking-[0.20em]", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("KPI_OPPROD_MODAL_TITLE")}
            </div>
            <div className="mt-1 flex items-center gap-3 min-w-0">
              <span className={cn("h-3 w-3 rounded-full", pickAccent(idx))} />
              <div className="min-w-0">
                <div className={cn("text-lg font-semibold truncate", isDark ? "text-slate-50" : "text-slate-900")}>
                  {safeName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">{operator.operator_id}</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 flex-wrap justify-end">
            <button type="button" className={tabBtn(tab === "SUMMARY")} onClick={() => setTab("SUMMARY")}>
              {t("KPI_OPPROD_MODAL_SUMMARY")}
            </button>
            <button type="button" className={tabBtn(tab === "FAMILIES")} onClick={() => setTab("FAMILIES")}>
              {t("KPI_OPPROD_MODAL_FAMILIES")}
            </button>
            <button type="button" className={tabBtn(tab === "TIME")} onClick={() => setTab("TIME")}>
              {t("KPI_OPPROD_MODAL_TIME")}
            </button>
            <button
              type="button"
              className={cn(pillBtn, "ml-2")}
              onClick={() => {
                setTab("SUMMARY");
                onClose?.();
              }}
            >
              {t("COMMON_CLOSE")}
            </button>
          </div>
        </div>

        <div className="p-5">
          {tab === "SUMMARY" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_TABLE_INDEX")}</div>
                <div className={cn("mt-2 text-4xl font-semibold leading-none", tone)}>
                  {idx == null ? "—" : formatNumber(idx, 2)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Σreal / Σprev</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_TABLE_PREV")}</div>
                <div className={cn("mt-2 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
                  {formatNumber(operator.previsto_eff_sum)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">previsto_eff</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_TABLE_REAL")}</div>
                <div className={cn("mt-2 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
                  {formatNumber(operator.prodotto_sum)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">realizzato_alloc</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_MODAL_TIME_TOTAL")}</div>
                <div className={cn("mt-2 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
                  {formatNumber(totalHours)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_DAYS")}: {Number(operator.days_active || 0)}</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_MODAL_TIME_INDEXED")}</div>
                <div className={cn("mt-2 text-2xl font-semibold", isDark ? "text-sky-200" : "text-sky-700")}>
                  {formatNumber(operator.ore_sum)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">MT/PZ + previsto</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_MODAL_TIME_NON_INDEXED")}</div>
                <div className={cn("mt-2 text-2xl font-semibold", isDark ? "text-amber-200" : "text-amber-700")}>
                  {formatNumber(nonIndexedHours)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">altre righe / unità / no previsto</div>
              </div>
            </div>
          ) : null}

          {tab === "TIME" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_MODAL_TIME_TOTAL")}</div>
                <div className={cn("mt-2 text-4xl font-semibold leading-none", isDark ? "text-slate-50" : "text-slate-900")}>
                  {formatNumber(totalHours)}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_DAYS")}: {Number(operator.days_active || 0)}</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_MODAL_TIME_INDEXED")}</div>
                <div className={cn("mt-2 text-4xl font-semibold leading-none", isDark ? "text-sky-200" : "text-sky-700")}>
                  {formatNumber(operator.ore_sum)}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">QUANTITATIVE MT/PZ con previsto</div>
              </div>

              <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_MODAL_TIME_NON_INDEXED")}</div>
                <div className={cn("mt-2 text-4xl font-semibold leading-none", isDark ? "text-amber-200" : "text-amber-700")}>
                  {formatNumber(nonIndexedHours)}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">Tempo non indicizzabile</div>
              </div>

              <div className={cn("rounded-2xl border p-4 lg:col-span-3", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Interpretazione</div>
                <div className={cn("mt-2 text-sm", isDark ? "text-slate-200" : "text-slate-700")}>
                  Le “ore non indicizzate” = ore totali (facts) − ore indicizzate (KPI). 
                  Ti evidenzia subito dove l’indice non può essere calcolato (unità non quantitative, previsto assente, ecc.).
                </div>
              </div>
            </div>
          ) : null}

          {tab === "FAMILIES" ? (
            <div>
              {families.length === 0 ? (
                <div className="py-14 text-center text-sm text-slate-400">{t("KPI_OPPROD_MODAL_NO_FAMILIES")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <th className="text-left py-2 pr-3">Famiglia (categoria + descrizione)</th>
                        <th className="text-right py-2 pr-3">{t("KPI_OPPROD_TABLE_HOURS")}</th>
                        <th className="text-right py-2 pr-3">{t("KPI_OPPROD_TABLE_PREV")}</th>
                        <th className="text-right py-2 pr-3">{t("KPI_OPPROD_TABLE_REAL")}</th>
                        <th className="text-right py-2 pr-3">{t("KPI_OPPROD_TABLE_INDEX")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {families.map((f, i) => {
                        const fx = f.productivity_index;
                        const ftone = toneByIndex(fx, isDark);

                        return (
                          <tr key={`${operator.operator_id}::${f.categoria}::${f.descrizione}::${i}`} className={cn("border-t", isDark ? "border-slate-800/70" : "border-slate-200")}>
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={cn("h-2.5 w-2.5 rounded-full", pickAccent(fx))} />
                                <div className="min-w-0">
                                  <div className={cn("font-medium truncate", isDark ? "text-slate-50" : "text-slate-900")}>
                                    {(f.categoria ?? "—").toString().trim() || "—"}
                                  </div>
                                  <div className={cn("text-[12px] truncate", isDark ? "text-slate-300" : "text-slate-700")}>
                                    {(f.descrizione ?? "—").toString().trim() || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-100" : "text-slate-800")}>{formatNumber(f.ore_sum)}</td>
                            <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-100" : "text-slate-800")}>{formatNumber(f.previsto_eff_sum)}</td>
                            <td className={cn("py-2 pr-3 text-right", isDark ? "text-slate-100" : "text-slate-800")}>{formatNumber(f.prodotto_sum)}</td>
                            <td className={cn("py-2 pr-3 text-right font-semibold", ftone)}>{fx == null ? "—" : formatNumber(fx, 2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
