// src/components/direzione/kpiDetails/KpiRigheDetails.jsx
import React, { useMemo } from "react";
import { useCoreI18n } from "../../../i18n/coreI18n";
import { KpiEmptyState, KpiSection } from "./KpiDetailsCommon";

export default function KpiRigheDetails({ produzioniAgg = [] }) {
  const { t } = useCoreI18n();

  const rows = useMemo(() => {
    return (produzioniAgg || []).slice().sort((a, b) => (b.prodotto_sum || 0) - (a.prodotto_sum || 0));
  }, [produzioniAgg]);

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{t("DETAILS_RIGHE_SUB")}</div>

      <KpiSection title={t("MODAL_DETAILS")}>
        {!rows.length ? (
          <KpiEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="text-left py-2 pr-3">Descrizione</th>
                  <th className="text-right py-2 pr-3">Prodotto</th>
                  <th className="text-right py-2 pr-3">Righe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.descrizione} className="border-t border-slate-800/60">
                    <td className="py-2 pr-3 text-slate-100">{(r.descrizione || "—").toString()}</td>
                    <td className="py-2 pr-3 text-right text-slate-200">{Number(r.prodotto_sum || 0).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{Number(r.righe || 0)}</td>
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
