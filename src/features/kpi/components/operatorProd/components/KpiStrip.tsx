// src/components/kpi/operatorProd/components/KpiStrip.jsx
import { useI18n } from "../../../../../i18n/I18nProvider";
import { cn, formatNumber } from "../utils/kpiUi";

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

  const cardBase = cn(
    "rounded-2xl border px-4 py-3 relative overflow-hidden",
    isDark ? "border-slate-700/70 bg-slate-950/55" : "border-slate-200 bg-white",
    isDark
      ? "before:absolute before:inset-0 before:bg-[radial-gradient(70%_70%_at_30%_0%,rgba(56,189,248,0.10),transparent_60%)] before:pointer-events-none"
      : ""
  );

  return (
    <section className="px-3 sm:px-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div className={cn(cardBase, "border-emerald-400/35")}>
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_KPI_SELECTED")}</div>
        <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
          {loading ? "—" : perOperatorCount}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{t("KPI_OPPROD_KPI_SELECTED_SUB")}</div>
      </div>

      <div className={cn(cardBase, "border-sky-400/35")}>
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_KPI_HOURS")}</div>
        <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-sky-200" : "text-sky-700")}>
          {loading ? "—" : formatNumber(totalsSelected.sumOre)}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{t("KPI_OPPROD_KPI_HOURS_SUB")}</div>
      </div>

      <div className={cn(cardBase, "border-slate-400/25")}>
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_KPI_PREV")}</div>
        <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-slate-100" : "text-slate-800")}>
          {loading ? "—" : formatNumber(totalsSelected.sumPrev)}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{t("KPI_OPPROD_KPI_PREV_SUB")}</div>
      </div>

      <div className={cn(cardBase, "border-fuchsia-400/35")}>
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_KPI_INDEX")}</div>
        <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-fuchsia-200" : "text-fuchsia-700")}>
          {loading ? "—" : totalsSelected.idx == null ? "—" : formatNumber(totalsSelected.idx, 2)}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{t("KPI_OPPROD_KPI_INDEX_SUB")}</div>
      </div>
    </section>
  );
}
