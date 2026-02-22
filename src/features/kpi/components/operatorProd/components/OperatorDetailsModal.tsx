// src/components/kpi/operatorProd/components/OperatorDetailsModal.jsx
import { useMemo, useState } from "react";
import { useI18n } from "../../../../../i18n/I18nProvider";
import { cn, formatNumber, haloByIndex, pickAccent, toneByIndex } from "../utils/kpiUi";

type OperatorRow = {
  operator_id?: string | number;
  operator_name?: string;
  productivity_index_range?: number | null;
  previsto_eff_sum?: number;
  prodotto_sum?: number;
  ore_sum?: number;
  days_active?: number;
};
type FamilyRow = {
  categoria?: unknown;
  descrizione?: unknown;
  produttivita?: unknown;
  productivity_index?: number | null;
  ore_sum?: number;
  previsto_eff_sum?: number;
  prodotto_sum?: number;
};

export function OperatorDetailsModal({
  isDark,
  open,
  operator,
  families,
  totalHours,
  nonIndexedHours,
  onClose,
}: {
  isDark: boolean;
  open: boolean;
  operator: OperatorRow | null;
  families: FamilyRow[];
  totalHours: number;
  nonIndexedHours: number;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState("SUMMARY");

  const idx = operator?.productivity_index_range ?? null;
  const tone = toneByIndex(idx, isDark);

  const overlayBase = "fixed inset-0 z-50 flex items-center justify-center p-4 theme-overlay backdrop-blur-md";

  const modalBase = "w-full max-w-5xl rounded-[28px] overflow-hidden theme-panel";

  const modalHeader = "px-5 py-4 flex items-start justify-between gap-4 theme-panel-2 border-b theme-border";

  const tabBtn = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.16em] transition",
      active ? "btn-primary" : "btn-instrument"
    );

  const pillBtn = "btn-instrument px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.16em]";

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
            <div className="text-[11px] uppercase tracking-[0.20em] theme-text-muted">
              {t("KPI_OPPROD_MODAL_TITLE")}
            </div>
            <div className="mt-1 flex items-center gap-3 min-w-0">
              <span className={cn("h-3 w-3 rounded-full", pickAccent(idx))} />
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate theme-text">
                  {safeName}
                </div>
                <div className="text-[11px] theme-text-muted font-mono truncate">{operator.operator_id}</div>
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
              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_TABLE_INDEX")}</div>
                <div className={cn("mt-2 text-4xl font-semibold leading-none", tone)}>
                  {idx == null ? "—" : formatNumber(idx, 2)}
                </div>
                <div className="mt-1 text-[11px] theme-text-muted">Σreal / Σprev</div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_TABLE_PREV")}</div>
                <div className="mt-2 text-2xl font-semibold theme-text">
                  {formatNumber(operator.previsto_eff_sum)}
                </div>
                <div className="mt-1 text-[11px] theme-text-muted">previsto_eff</div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_TABLE_REAL")}</div>
                <div className="mt-2 text-2xl font-semibold theme-text">
                  {formatNumber(operator.prodotto_sum)}
                </div>
                <div className="mt-1 text-[11px] theme-text-muted">realizzato_alloc</div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_MODAL_TIME_TOTAL")}</div>
                <div className="mt-2 text-2xl font-semibold theme-text">
                  {formatNumber(totalHours)}
                </div>
                <div className="mt-1 text-[11px] theme-text-muted">
                  {t("KPI_OPPROD_TABLE_DAYS")}: {Number(operator.days_active || 0)}
                </div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_MODAL_TIME_INDEXED")}</div>
                <div className="mt-2 text-2xl font-semibold theme-text">
                  {formatNumber(operator.ore_sum)}
                </div>
                <div className="mt-1 text-[11px] theme-text-muted">MT/PZ + previsto</div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_MODAL_TIME_NON_INDEXED")}</div>
                <div className="mt-2 text-2xl font-semibold theme-text">
                  {formatNumber(nonIndexedHours)}
                </div>
                <div className="mt-1 text-[11px] theme-text-muted">altre righe / unità / no previsto</div>
              </div>
            </div>
          ) : null}

          {tab === "TIME" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_MODAL_TIME_TOTAL")}</div>
                <div className="mt-2 text-4xl font-semibold leading-none theme-text">
                  {formatNumber(totalHours)}
                </div>
                <div className="mt-2 text-[11px] theme-text-muted">
                  {t("KPI_OPPROD_TABLE_DAYS")}: {Number(operator.days_active || 0)}
                </div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_MODAL_TIME_INDEXED")}</div>
                <div className="mt-2 text-4xl font-semibold leading-none theme-text">
                  {formatNumber(operator.ore_sum)}
                </div>
                <div className="mt-2 text-[11px] theme-text-muted">QUANTITATIVE MT/PZ con previsto</div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_MODAL_TIME_NON_INDEXED")}</div>
                <div className="mt-2 text-4xl font-semibold leading-none theme-text">
                  {formatNumber(nonIndexedHours)}
                </div>
                <div className="mt-2 text-[11px] theme-text-muted">Tempo non indicizzabile</div>
              </div>

              <div className="theme-panel-2 rounded-2xl p-4 lg:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">Interpretazione</div>
                <div className="mt-2 text-sm theme-text">
                  Le “ore non indicizzate” = ore totali (facts) − ore indicizzate (KPI). 
                  Ti evidenzia subito dove l’indice non può essere calcolato (unità non quantitative, previsto assente, ecc.).
                </div>
              </div>
            </div>
          ) : null}

          {tab === "FAMILIES" ? (
            <div>
              {families.length === 0 ? (
                <div className="py-14 text-center text-sm theme-text-muted">{t("KPI_OPPROD_MODAL_NO_FAMILIES")}</div>
              ) : (
                <div className="overflow-x-auto theme-table">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="theme-table-head">
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
                          <tr key={`${operator.operator_id}::${f.categoria}::${f.descrizione}::${i}`} className="border-t theme-border">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={cn("h-2.5 w-2.5 rounded-full", pickAccent(fx))} />
                                <div className="min-w-0">
                                  <div className="font-medium truncate theme-text">
                                    {(f.categoria ?? "—").toString().trim() || "—"}
                                  </div>
                                  <div className="text-[12px] truncate theme-text-muted">
                                    {(f.descrizione ?? "—").toString().trim() || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 pr-3 text-right theme-text">{formatNumber(f.ore_sum)}</td>
                            <td className="py-2 pr-3 text-right theme-text">{formatNumber(f.previsto_eff_sum)}</td>
                            <td className="py-2 pr-3 text-right theme-text">{formatNumber(f.prodotto_sum)}</td>
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
