// src/features/kpi/pages/ManagerOperatorKPI.tsx
import { OperatorProductivityKpiPanel } from "../components";

export default function ManagerOperatorKPI({ isDark = true }: { isDark?: boolean }) {
  return (
    <OperatorProductivityKpiPanel
      scope="Manager"
      isDark={isDark}
      showCostrCommessaFilters={true}
      title="KPI Operatori"
      kicker="MANAGER · CNCS / CORE"
    />
  );
}
