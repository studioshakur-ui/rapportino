// src/components/direzione/kpiDetails/KpiRapportiniDetails.jsx
import { useMemo } from "react";
import { useCoreI18n } from "../../../i18n/coreI18n";
import { KpiEmptyState, KpiMetaLine, KpiSection } from "./KpiDetailsCommon";
import { formatDateLabelIt } from "../direzioneUtils";

type RapportinoHeaderRow = import("../../../features/direzione/dashboard/types").RapportinoHeaderRow;

export default function KpiRapportiniDetails({
  rapportini = [],
  dateFrom,
  dateTo,
}: {
  rapportini?: RapportinoHeaderRow[];
  dateFrom?: string;
  dateTo?: string;
}) {
  const { t } = useCoreI18n();

  const rows = useMemo(() => {
    return (rapportini || [])
      .slice()
      .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
  }, [rapportini]);

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{t("DETAILS_RAPPORTINI_SUB")}</div>

      <KpiSection title={t("DETAILS_RANGE")}>
        <KpiMetaLine label={t("DIR_WINDOW")} value={`${formatDateLabelIt(dateFrom)} → ${formatDateLabelIt(dateTo)}`} />
      </KpiSection>

      <KpiSection title={t("MODAL_DETAILS")}>
        {!rows.length ? (
          <KpiEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="text-left py-2 pr-3">Data</th>
                  <th className="text-left py-2 pr-3">Capo</th>
                  <th className="text-left py-2 pr-3">Stato</th>
                  <th className="text-left py-2 pr-3">COSTR</th>
                  <th className="text-left py-2 pr-3">Commessa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800/60">
                    <td className="py-2 pr-3 text-slate-100">{formatDateLabelIt(r.report_date)}</td>
                    <td className="py-2 pr-3 text-slate-200">{(r.capo_display_name || r.capo_email || "CAPO").trim()}</td>
                    <td className="py-2 pr-3 text-slate-200">{(r.status || "—").toString()}</td>
                    <td className="py-2 pr-3 text-slate-300">{(r.costr || "—").toString()}</td>
                    <td className="py-2 pr-3 text-slate-300">{(r.commessa || "—").toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </KpiSection>
    </div>
  );
}
