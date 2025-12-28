// /src/pages/CapoOperatorKpi.jsx
import React from "react";
import OperatorProductivityKpiPanel from "../components/kpi/OperatorProductivityKpiPanel";

export default function CapoOperatorKpi({ isDark = true }) {
  return (
    <OperatorProductivityKpiPanel
      scope="CAPO"
      isDark={isDark}
      showCostrCommessaFilters={false}
      title="KPI Operatori"
      kicker="CNCS · Capo"
    />
  );
}
