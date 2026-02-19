// src/features/direzione/dashboard/components/DirezioneKpiModal.tsx

import React, { useMemo } from "react";

import Modal from "../../../../ui/Modal";

import KpiRapportiniDetails from "../../../../components/direzione/kpiDetails/KpiRapportiniDetails";
import KpiRigheDetails from "../../../../components/direzione/kpiDetails/KpiRigheDetails";
import KpiProdIndexDetails from "../../../../components/direzione/kpiDetails/KpiProdIndexDetails";
import KpiIncaDetails from "../../../../components/direzione/kpiDetails/KpiIncaDetails";
import KpiRitardiCapiDetails from "../../../../components/direzione/kpiDetails/KpiRitardiCapiDetails";
import KpiHoursDetails from "../../../../components/direzione/kpiDetails/KpiHoursDetails";

import type { DirezioneDashboardDataset, DirezioneFilters } from "../types";
import { KPI_IDS, type KpiId, getKpiModalSubtitle, getKpiModalTitle, type KpiTitleFn } from "../kpiRegistry";

export type DirezioneKpiModalProps = {
  isOpen: boolean;
  activeKpi: KpiId;
  onClose: () => void;

  filters: DirezioneFilters;
  dataset: DirezioneDashboardDataset;

  t: KpiTitleFn;
};

export default function DirezioneKpiModal({
  isOpen,
  activeKpi,
  onClose,
  filters,
  dataset,
  t,
}: DirezioneKpiModalProps): JSX.Element {
  const title = useMemo(() => getKpiModalTitle(activeKpi, t), [activeKpi, t]);
  const subtitle = useMemo(() => getKpiModalSubtitle(filters, t), [filters, t]);

  const body = useMemo(() => {
    switch (activeKpi) {
      case KPI_IDS.RAPPORTINI:
        return (
          <KpiRapportiniDetails
            rapportini={dataset.rapportiniCurrent}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
          />
        );
      case KPI_IDS.RIGHE:
        return <KpiRigheDetails produzioniAgg={dataset.produzioniAggCurrent} />;
      case KPI_IDS.PROD:
        return <KpiProdIndexDetails prodDaily={dataset.prodDailyCurrent} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />;
      case KPI_IDS.INCA_PREV:
      case KPI_IDS.INCA_REAL:
        return (
          <KpiIncaDetails
            incaTeorico={dataset.incaChantier}
            mode={activeKpi === KPI_IDS.INCA_REAL ? "REAL" : "PREV"}
          />
        );
      case KPI_IDS.RITARDI:
        return <KpiRitardiCapiDetails capiDelayDaily={dataset.capiDelayDaily} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />;
      case KPI_IDS.ORE:
        return <KpiHoursDetails hoursFacts={dataset.hoursFactsCurrent} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />;
      default:
        return null;
    }
  }, [activeKpi, dataset, filters.dateFrom, filters.dateTo]);

  return (
    <Modal open={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      {body}
    </Modal>
  );
}