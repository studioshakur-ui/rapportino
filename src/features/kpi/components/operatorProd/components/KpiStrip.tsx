// src/components/kpi/operatorProd/components/KpiStrip.jsx
import { useI18n } from "../../../../../i18n/I18nProvider";
import { formatNumber } from "../utils/kpiUi";

type TotalsSelected = { sumOre?: number; sumPrev?: number; idx?: number | null };

export function KpiStrip({
  isDark,
  loading,
  perOperatorCount,
  totalsSelected,
}: {
  isDark: boolean;
  loading: boolean;
  perOperatorCount: number;
  totalsSelected: TotalsSelected;
}) {
  const { t } = useI18n();

  void isDark;
  const cardBase = "theme-panel-2 rounded-2xl px-4 py-3 relative overflow-hidden";

  return (
    <section className="px-3 sm:px-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className={cardBase}>
        <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_KPI_SELECTED")}</div>
        <div className="mt-1 text-2xl font-semibold theme-text">
          {loading ? "—" : perOperatorCount}
        </div>
        <div className="mt-1 text-[11px] theme-text-muted">{t("KPI_OPPROD_KPI_SELECTED_SUB")}</div>
      </div>

      <div className={cardBase}>
        <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_KPI_HOURS")}</div>
        <div className="mt-1 text-2xl font-semibold theme-text">
          {loading ? "—" : formatNumber(totalsSelected.sumOre)}
        </div>
        <div className="mt-1 text-[11px] theme-text-muted">{t("KPI_OPPROD_KPI_HOURS_SUB")}</div>
      </div>

      <div className={cardBase}>
        <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_KPI_PREV")}</div>
        <div className="mt-1 text-2xl font-semibold theme-text">
          {loading ? "—" : formatNumber(totalsSelected.sumPrev)}
        </div>
        <div className="mt-1 text-[11px] theme-text-muted">{t("KPI_OPPROD_KPI_PREV_SUB")}</div>
      </div>

      <div className={cardBase}>
        <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_KPI_INDEX")}</div>
        <div className="mt-1 text-2xl font-semibold theme-text">
          {loading ? "—" : totalsSelected.idx == null ? "—" : formatNumber(totalsSelected.idx, 2)}
        </div>
        <div className="mt-1 text-[11px] theme-text-muted">{t("KPI_OPPROD_KPI_INDEX_SUB")}</div>
      </div>
    </section>
  );
}
