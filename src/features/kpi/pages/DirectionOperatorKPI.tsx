// src/features/kpi/pages/DirectionOperatorKPI.jsx
import { OperatorProductivityKpiPanel } from "../components";

export default function DirectionOperatorKPI({ isDark = true }: { isDark?: boolean }) {
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
