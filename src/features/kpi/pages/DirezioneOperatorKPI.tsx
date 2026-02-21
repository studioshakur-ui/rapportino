// src/features/kpi/pages/DirezioneOperatorKPI.jsx
import { OperatorProductivityKpiPanel } from "../components";

export default function DirezioneOperatorKPI({ isDark = true }: { isDark?: boolean }) {
  return (
    <OperatorProductivityKpiPanel
      scope="Direzione"
      isDark={isDark}
      showCostrCommessaFilters={true}
      title="KPI Operatori"
      kicker="DIREZIONE · CNCS / CORE"
    />
  );
}
