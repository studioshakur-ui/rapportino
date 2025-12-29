// src/components/direzione/kpiDetails/KpiIncaDetails.jsx
import React, { useMemo } from "react";
import { useCoreI18n } from "../../../i18n/CoreI18n";
import { KpiEmptyState, KpiSection } from "./KpiDetailsCommon";
import { formatNumberIt } from "../direzioneUtils";

export default function KpiIncaDetails({ incaTeorico = [], mode = "PREV" }) {
  const { t } = useCoreI18n();

  const rows = useMemo(() => {
    const sorted = (incaTeorico || []).slice().sort((a, b) => {
      const av = Number(a?.metri_previsti_totali || 0);
      const bv = Number(b?.metri_previsti_totali || 0);
      return bv - av;
    });
    return sorted.slice(0, 24);
  }, [incaTeorico]);

  const subtitle =
    mode === "PREV" ? t("DETAILS_INCA_PREV_SUB") : t("DETAILS_INCA_REAL_SUB");

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{subtitle}</div>

      <KpiSection title={t("MODAL_DETAILS")}>
        {!rows.length ? (
          <KpiEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="text-left py-2 pr-3">File</th>
                  <th className="text-left py-2 pr-3">COSTR</th>
                  <th className="text-left py-2 pr-3">Commessa</th>
                  <th className="text-right py-2 pr-3">Previsti</th>
                  <th className="text-right py-2 pr-3">Realizzati</th>
                  <th className="text-right py-2 pr-3">Posati</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={`${r.nome_file || ""}-${idx}`} className="border-t border-slate-800/60">
                    <td className="py-2 pr-3 text-slate-100">{(r.nome_file || "—").toString()}</td>
                    <td className="py-2 pr-3 text-slate-300">{(r.costr || "—").toString()}</td>
                    <td className="py-2 pr-3 text-slate-300">{(r.commessa || "—").toString()}</td>
                    <td className="py-2 pr-3 text-right text-slate-200">
                      {formatNumberIt(r.metri_previsti_totali || 0, 0)}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-200">
                      {formatNumberIt(r.metri_realizzati || 0, 0)}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-200">
                      {formatNumberIt(r.metri_posati || 0, 0)}
                    </td>
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
