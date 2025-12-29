// /src/pages/ManagerOperatorKpi.jsx
import React from "react";
import { OperatorProductivityKpiPanel } from "../components";


export default function ManagerOperatorKpi({ isDark = true }) {
  return (
    <OperatorProductivityKpiPanel
      scope="MANAGER"
      isDark={isDark}
      showCostrCommessaFilters={false}
      title="KPI Operatori"
      kicker="CNCS · Manager"
    />
  );
}
