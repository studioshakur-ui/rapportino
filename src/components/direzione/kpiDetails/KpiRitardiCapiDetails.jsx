// src/components/direzione/kpiDetails/KpiRitardiCapiDetails.jsx
import React from "react";
import { useCoreI18n } from "../../../i18n/coreI18n";
import { KpiEmptyState, KpiSection } from "./KpiDetailsCommon";
import { formatDateLabelIt } from "../direzioneUtils";

export default function KpiRitardiCapiDetails({ capiDelayDaily = [] }) {
  const { t } = useCoreI18n();

  const rows = (capiDelayDaily || []).slice().sort((a, b) => new Date(a.report_date) - new Date(b.report_date));

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{t("DETAILS_RITARDI_SUB")}</div>

      <KpiSection title={t("MODAL_DETAILS")}>
        {!rows.length ? (
          <KpiEmptyState />
        ) : (
          <div className="space-y-3">
            {rows.map((d) => {
              const late = Number(d.capi_in_ritardo || 0);
              const attesi = Number(d.capi_attesi || 0);
              const names = (d.capi_in_ritardo_nomi || []).filter(Boolean);
              return (
                <div key={d.report_date} className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[12px] text-slate-100">{formatDateLabelIt(d.report_date)}</div>
                    <div className="text-[12px] text-slate-200">
                      {late}/{attesi}
                    </div>
                  </div>
                  {names.length ? (
                    <div className="mt-2 text-[12px] text-slate-300">
                      {names.slice(0, 10).join(", ")}
                      {names.length > 10 ? ` +${names.length - 10}` : ""}
                    </div>
                  ) : (
                    <div className="mt-2 text-[12px] text-slate-400">Nessun ritardo</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </KpiSection>
    </div>
  );
}
