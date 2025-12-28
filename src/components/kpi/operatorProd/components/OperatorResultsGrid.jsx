// src/components/kpi/operatorProd/components/OperatorResultsGrid.jsx
import React from "react";
import { useI18n } from "../../../../i18n/I18nProvider";
import { cn, formatNumber, haloByIndex, pickAccent, toneByIndex } from "../utils/kpiUi";

export function OperatorResultsGrid({ isDark, loading, perOperator, totalsSelected, onOpenOperator }) {
  const { t } = useI18n();

  const cardBase = cn(
    "rounded-2xl border px-4 py-3 relative overflow-hidden",
    isDark ? "border-slate-700/70 bg-slate-950/55" : "border-slate-200 bg-white",
    isDark
      ? "before:absolute before:inset-0 before:bg-[radial-gradient(70%_70%_at_30%_0%,rgba(56,189,248,0.10),transparent_60%)] before:pointer-events-none"
      : ""
  );

  return (
    <section className="px-3 sm:px-4 pb-4">
      <div className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_RESULTS")}</div>
            <div className={cn("text-sm font-medium", isDark ? "text-slate-50" : "text-slate-900")}>
              {t("KPI_OPPROD_RESULTS_SUB")}
            </div>
            <div className={cn("text-xs mt-1", isDark ? "text-slate-300" : "text-slate-600")}>
              {t("KPI_OPPROD_DESC")}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="py-14 text-center text-sm text-slate-400">{t("COMMON_LOADING")}</div>
          ) : perOperator.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400">{t("KPI_OPPROD_EMPTY")}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {perOperator.map((r) => {
                  const idx = r.productivity_index_range;
                  const tone = toneByIndex(idx, isDark);

                  return (
                    <button
                      key={r.operator_id}
                      type="button"
                      onClick={() => onOpenOperator(r.operator_id)}
                      className={cn(
                        "text-left rounded-3xl border p-4 transition relative overflow-hidden",
                        isDark ? "border-slate-800 bg-slate-950/35 hover:bg-slate-900/40" : "border-slate-200 bg-white hover:bg-slate-50",
                        haloByIndex(idx)
                      )}
                    >
                      <div className={cn("absolute inset-0 pointer-events-none opacity-60", isDark ? "bg-[radial-gradient(60%_60%_at_10%_0%,rgba(244,114,182,0.08),transparent_60%)]" : "")} />

                      <div className="flex items-start justify-between gap-3 relative">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 rounded-full", pickAccent(idx))} />
                            <div className={cn("text-[12px] uppercase tracking-[0.18em]", isDark ? "text-slate-400" : "text-slate-500")}>
                              {t("KPI_OPPROD_TABLE_OPERATOR")}
                            </div>
                          </div>

                          <div className={cn("mt-1 text-lg font-semibold truncate", isDark ? "text-slate-50" : "text-slate-900")}>
                            {(r.operator_name ?? "—").toString().trim() || "—"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">{r.operator_id}</div>
                        </div>

                        <div className="text-right">
                          <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-400" : "text-slate-500")}>
                            {t("KPI_OPPROD_TABLE_INDEX")}
                          </div>
                          <div className={cn("mt-1 text-3xl font-semibold leading-none", tone)}>
                            {idx == null ? "—" : formatNumber(idx, 2)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">Σreal / Σprev</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 relative">
                        <div>
                          <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_HOURS")}</div>
                          <div className={cn("mt-1 font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                            {formatNumber(r.ore_sum)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_PREV")}</div>
                          <div className={cn("mt-1 font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                            {formatNumber(r.previsto_eff_sum)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_REAL")}</div>
                          <div className={cn("mt-1 font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                            {formatNumber(r.prodotto_sum)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 relative">
                        <span>{t("KPI_OPPROD_TABLE_DAYS")}: {Number(r.days_active || 0)}</span>
                        <span className="uppercase tracking-[0.18em]">Dettagli →</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={cn("mt-5 rounded-2xl border px-4 py-3", isDark ? "border-slate-800 bg-slate-950/25" : "border-slate-200 bg-white")}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{t("KPI_OPPROD_TOTAL_SELECTION")}</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_HOURS")}</div>
                    <div className={cn("mt-1 font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                      {formatNumber(totalsSelected.sumOre)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_PREV")}</div>
                    <div className={cn("mt-1 font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                      {formatNumber(totalsSelected.sumPrev)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_REAL")}</div>
                    <div className={cn("mt-1 font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                      {formatNumber(totalsSelected.sumProd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TABLE_INDEX")}</div>
                    <div className={cn("mt-1 font-semibold", isDark ? "text-fuchsia-200" : "text-fuchsia-700")}>
                      {totalsSelected.idx == null ? "—" : formatNumber(totalsSelected.idx, 2)}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
