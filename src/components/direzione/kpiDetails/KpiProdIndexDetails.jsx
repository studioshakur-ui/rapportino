// src/components/direzione/kpiDetails/KpiProdIndexDetails.jsx
import React from "react";
import { useCoreI18n } from "../../../i18n/CoreI18n";
import { KpiMetaLine, KpiSection } from "./KpiDetailsCommon";
import { formatIndexIt, formatNumberIt } from "../direzioneUtils";

export default function KpiProdIndexDetails({
  sumPrevEff = 0,
  sumProdAlloc = 0,
  sumHoursIndexed = 0,
  productivityIndex = null,
}) {
  const { t } = useCoreI18n();

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{t("DETAILS_PROD_SUB")}</div>

      <KpiSection title={t("MODAL_DETAILS")}>
        <KpiMetaLine label="Σ Previsto eff" value={formatNumberIt(sumPrevEff)} />
        <KpiMetaLine label="Σ Realizzato alloc" value={formatNumberIt(sumProdAlloc)} />
        <KpiMetaLine label="Σ Ore indicizzate" value={formatNumberIt(sumHoursIndexed)} />
        <KpiMetaLine label="Indice" value={formatIndexIt(productivityIndex)} />
        <div className="mt-3 text-[11px] text-slate-400">
          Regola: <span className="font-mono">previsto_eff = previsto × (ore/8)</span>. Indice range:
          <span className="font-mono"> Σreal / Σprev</span>.
        </div>
      </KpiSection>
    </div>
  );
}
