// src/components/direzione/kpiDetails/KpiProdIndexDetails.tsx
//
// Direzione · KPI "Indice Produttività" (chantier)
// Canonical rule:
//   - Source: public.kpi_chantier_global_day_v1 (built on direzione_operator_facts_v4)
//   - Formula: indice = Σ(realizzato_alloc) / Σ(previsto_alloc)
//   - Allocations are prorata per line: tempo_hours / sum_line_hours (facts v4)

import React from "react";

import { useCoreI18n } from "../../../i18n/CoreI18n";
import { KpiMetaLine, KpiSection } from "./KpiDetailsCommon";
import { formatIndexIt, formatNumberIt } from "../direzioneUtils";

export type KpiProdIndexDetailsProps = {
  sumPrevAlloc?: number;
  sumProdAlloc?: number;
  sumHoursIndexed?: number;
  productivityIndex?: number | null;
};

export default function KpiProdIndexDetails({
  sumPrevAlloc = 0,
  sumProdAlloc = 0,
  sumHoursIndexed = 0,
  productivityIndex = null,
}: KpiProdIndexDetailsProps): JSX.Element {
  const { t } = useCoreI18n();

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{t("DETAILS_PROD_SUB")}</div>

      <KpiSection title={t("MODAL_DETAILS")}>
        <KpiMetaLine label="Σ Previsto alloc (MT)" value={formatNumberIt(sumPrevAlloc)} />
        <KpiMetaLine label="Σ Realizzato alloc (MT)" value={formatNumberIt(sumProdAlloc)} />
        <KpiMetaLine label="Σ Ore uomo indicizzate" value={formatNumberIt(sumHoursIndexed)} />
        <KpiMetaLine label="Indice" value={formatIndexIt(productivityIndex)} />

        <div className="mt-3 text-[11px] text-slate-400">
          Regola canonica: <span className="font-mono">indice = Σreal_alloc / Σprevisto_alloc</span> (allocazioni prorata per
          riga: <span className="font-mono">tempo_hours / sum_line_hours</span>, solo <span className="font-mono">unit=MT</span>,
          solo rapportini <span className="font-mono">APPROVED_UFFICIO</span>.
        </div>
      </KpiSection>
    </div>
  );
}