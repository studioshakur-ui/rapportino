// /src/pages/CapoOperatorKpi.jsx
import OperatorProductivityKpiPanel from "../../../features/kpi/components/OperatorProductivityKpiPanel";

export default function CapoOperatorKpi({ isDark = true }: { isDark?: boolean }): JSX.Element {
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
