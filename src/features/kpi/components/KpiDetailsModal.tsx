// src/components/kpi/KpiDetailsModal.jsx
import type { ReactNode } from "react";
import CenterModal from "../../../components/overlay/CenterModal";
import { cn } from "../../../ui/cn";
import { useCoreI18n } from "../../../i18n/coreI18n";
import { formatNumberIT, safeText } from "../../../ui/format";

/**
 * Modal KPI Tesla-X
 * - centrale
 * - transparente
 * - lisible
 * - sections nettes
 */
type SummaryPair = {
  label?: unknown;
  value?: unknown;
  kind?: unknown;
  maxFrac?: number;
};
type KpiDetailsPayload = {
  summaryPairs?: SummaryPair[];
  rulesText?: ReactNode;
  notesText?: ReactNode;
};

export default function KpiDetailsModal({
  open,
  onClose,
  kpiKey,
  payload,
  isDark = true,
}: {
  open: boolean;
  onClose?: () => void;
  kpiKey?: string;
  payload?: KpiDetailsPayload | null;
  isDark?: boolean;
}) {
  const { t } = useCoreI18n();

  const titleByKey: Record<string, string> = {
    rapportini: t("KPI_RAPPORTINI"),
    righe: t("KPI_RIGHE_ATTIVITA"),
    prod_index: t("KPI_INDICE_PROD"),
    inca_prev: t("KPI_INCA_PREV"),
    inca_real: t("KPI_INCA_REAL"),
    ritardi: t("KPI_RITARDI_CAPI"),
  };

  const title = titleByKey[String(kpiKey || "")] || t("KPI_DETAILS_TITLE");

  const box = cn(
    "rounded-2xl border p-4",
    isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white"
  );

  // payload est volontairement souple: on affiche ce qu’on a sans casser.
  const summaryPairs = (payload?.summaryPairs || []).slice(0, 12);

  return (
    <CenterModal open={open} onClose={onClose} title={title} subtitle={t("KPI_HINT_CLICK")} isDark={isDark}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
        <div className={box}>
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
            {t("MODAL_SECTION_SUMMARY")}
          </div>

          {summaryPairs.length === 0 ? (
            <div className={cn("mt-3 text-sm", isDark ? "text-slate-300" : "text-slate-700")}>
              Nessun dettaglio disponibile (ancora). Collega i “details payload” a questo KPI.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {summaryPairs.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>{safeText(p.label)}</div>
                  <div className={cn("text-sm font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                    {p.kind === "number" ? formatNumberIT(p.value, p.maxFrac ?? 2) : safeText(p.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={box}>
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
            {t("MODAL_SECTION_RULES")}
          </div>

          <div className={cn("mt-3 text-sm leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
            {payload?.rulesText ? (
              payload.rulesText
            ) : (
              <>
                Regole non configurate per questo KPI. Inserisci testo canonico (1–3 righe) per garantire lettura
                deterministica e auditabile.
              </>
            )}
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
              {t("MODAL_SECTION_NOTES")}
            </div>
            <div className={cn("mt-2 text-sm", isDark ? "text-slate-400" : "text-slate-600")}>
              {payload?.notesText ? payload.notesText : "—"}
            </div>
          </div>
        </div>
      </div>
    </CenterModal>
  );
}
