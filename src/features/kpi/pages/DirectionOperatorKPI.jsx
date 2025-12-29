// src/features/kpi/pages/DirectionOperatorKPI.jsx
import React from "react";
import { OperatorProductivityKpiPanel } from "../components";

export default function DirectionOperatorKPI({ isDark = true }) {
  return (
    <OperatorProductivityKpiPanel
      scope="DIRECTION"
      isDark={isDark}
      showCostrCommessaFilters={true}
      title="KPI Operatori"
      kicker="DIREZIONE · CNCS / CORE"
    />
  );
}
