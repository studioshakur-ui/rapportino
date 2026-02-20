// /src/pages/ManagerOperatorKpi.jsx
import { OperatorProductivityKpiPanel } from "../components";


export default function ManagerOperatorKpi({ isDark = true }: { isDark?: boolean }) {
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
