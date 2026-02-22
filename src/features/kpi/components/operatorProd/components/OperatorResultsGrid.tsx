// src/components/kpi/operatorProd/components/OperatorResultsGrid.jsx
import { useI18n } from "../../../../../i18n/I18nProvider";
import { cn, formatNumber, haloByIndex, pickAccent, toneByIndex } from "../utils/kpiUi";

type OperatorRow = {
  operator_id?: string;
  operator_name?: string;
  productivity_index_range?: number | null;
  ore_sum?: number;
  previsto_eff_sum?: number;
  prodotto_sum?: number;
  days_active?: number;
};
type TotalsSelected = { sumOre?: number; sumPrev?: number; sumProd?: number; idx?: number | null };

export function OperatorResultsGrid({
  isDark,
  loading,
  perOperator,
  totalsSelected,
  onOpenOperator,
}: {
  isDark: boolean;
  loading: boolean;
  perOperator: OperatorRow[];
  totalsSelected: TotalsSelected;
  onOpenOperator: (id: string) => void;
}) {
  const { t } = useI18n();

  const cardBase = "theme-panel rounded-2xl px-4 py-3 relative overflow-hidden";

  return (
    <section className="px-3 sm:px-4 pb-4">
      <div className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_RESULTS")}</div>
            <div className="text-sm font-medium theme-text">
              {t("KPI_OPPROD_RESULTS_SUB")}
            </div>
            <div className="text-xs mt-1 theme-text-muted">
              {t("KPI_OPPROD_DESC")}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="py-14 text-center text-sm theme-text-muted">{t("COMMON_LOADING")}</div>
          ) : perOperator.length === 0 ? (
            <div className="py-14 text-center text-sm theme-text-muted">{t("KPI_OPPROD_EMPTY")}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {perOperator.map((r) => {
                  const idx = r.productivity_index_range;
                  const operatorId = r.operator_id;
                  if (!operatorId) return null;
                  const tone = toneByIndex(idx, isDark);

                  return (
                    <button
                      key={operatorId}
                      type="button"
                      onClick={() => onOpenOperator(operatorId)}
                      className={cn(
                        "text-left rounded-3xl p-4 transition relative overflow-hidden theme-panel-2",
                        haloByIndex(idx)
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 relative">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 rounded-full", pickAccent(idx))} />
                            <div className="text-[12px] uppercase tracking-[0.18em] theme-text-muted">
                              {t("KPI_OPPROD_TABLE_OPERATOR")}
                            </div>
                          </div>

                          <div className="mt-1 text-lg font-semibold truncate theme-text">
                            {(r.operator_name ?? "—").toString().trim() || "—"}
                          </div>
                          <div className="text-[11px] theme-text-muted font-mono truncate">{r.operator_id}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                            {t("KPI_OPPROD_TABLE_INDEX")}
                          </div>
                          <div className={cn("mt-1 text-3xl font-semibold leading-none", tone)}>
                            {idx == null ? "—" : formatNumber(idx, 2)}
                          </div>
                          <div className="mt-1 text-[11px] theme-text-muted">Σreal / Σprev</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 relative">
                        <div>
                          <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_HOURS")}</div>
                          <div className="mt-1 font-semibold theme-text">
                            {formatNumber(r.ore_sum)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_PREV")}</div>
                          <div className="mt-1 font-semibold theme-text">
                            {formatNumber(r.previsto_eff_sum)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_REAL")}</div>
                          <div className="mt-1 font-semibold theme-text">
                            {formatNumber(r.prodotto_sum)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[11px] theme-text-muted relative">
                        <span>
                          {t("KPI_OPPROD_TABLE_DAYS")}: {Number(r.days_active || 0)}
                        </span>
                        <span className="uppercase tracking-[0.18em]">Dettagli →</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 theme-panel-2 rounded-2xl px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">{t("KPI_OPPROD_TOTAL_SELECTION")}</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_HOURS")}</div>
                    <div className="mt-1 font-semibold theme-text">
                      {formatNumber(totalsSelected.sumOre)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_PREV")}</div>
                    <div className="mt-1 font-semibold theme-text">
                      {formatNumber(totalsSelected.sumPrev)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_REAL")}</div>
                    <div className="mt-1 font-semibold theme-text">
                      {formatNumber(totalsSelected.sumProd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] theme-text-muted">{t("KPI_OPPROD_TABLE_INDEX")}</div>
                    <div className="mt-1 font-semibold theme-text">
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
