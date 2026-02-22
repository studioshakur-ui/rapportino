// src/components/kpi/KpiDetailsModal.jsx
import type { ReactNode } from "react";
import CenterModal from "../../../../components/overlay/CenterModal";
import { useCoreI18n } from "../../../../i18n/coreI18n";
import { formatNumberByLang, safeText } from "../../../../ui/format";
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
  const { t, lang } = useCoreI18n();
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return typeof v === "string" && v.trim() && v !== key ? v : fallback;
  };

  const titleByKey: Record<string, string> = {
    rapportini: t("KPI_RAPPORTINI"),
    righe: t("KPI_RIGHE_ATTIVITA"),
    prod_index: t("KPI_INDICE_PROD"),
    inca_prev: t("KPI_INCA_PREV"),
    inca_real: t("KPI_INCA_REAL"),
    ritardi: t("KPI_RITARDI_CAPI"),
  };

  const title = titleByKey[String(kpiKey || "")] || t("KPI_DETAILS_TITLE");

  const box = "theme-panel-2 rounded-2xl p-4";

  // payload est volontairement souple: on affiche ce qu’on a sans casser.
  const summaryPairs = (payload?.summaryPairs || []).slice(0, 12);

  return (
    <CenterModal open={open} onClose={onClose} title={title} subtitle={t("KPI_HINT_CLICK")} isDark={isDark}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
        <div className={box}>
          <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
            {t("MODAL_SECTION_SUMMARY")}
          </div>

          {summaryPairs.length === 0 ? (
            <div className="mt-3 text-sm theme-text-muted">
              {tf(
                "KPI_MODAL_EMPTY",
                "Aucun détail disponible pour l’instant. Branche le “details payload” sur ce KPI."
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {summaryPairs.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="text-xs theme-text-muted">{safeText(p.label)}</div>
                  <div className="text-sm font-semibold theme-text">
                    {p.kind === "number" ? formatNumberByLang(lang, p.value, p.maxFrac ?? 2) : safeText(p.value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={box}>
          <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
            {t("MODAL_SECTION_RULES")}
          </div>

          <div className="mt-3 text-sm leading-relaxed theme-text">
            {payload?.rulesText ? (
              payload.rulesText
            ) : (
              <>
                {tf(
                  "KPI_MODAL_RULES_EMPTY",
                  "Règles non configurées. Ajoute 1–3 lignes canonique pour une lecture audit-defensible."
                )}
              </>
            )}
          </div>

          <div className="mt-4 border-t theme-border pt-4">
            <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
              {t("MODAL_SECTION_NOTES")}
            </div>
            <div className="mt-2 text-sm theme-text-muted">
              {payload?.notesText ? payload.notesText : "—"}
            </div>
          </div>
        </div>
      </div>
    </CenterModal>
  );
}
