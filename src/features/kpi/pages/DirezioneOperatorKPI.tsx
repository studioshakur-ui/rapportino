// src/features/kpi/pages/DirezioneOperatorKPI.jsx
import { useEffect } from "react";
import { OperatorProductivityKpiPanel } from "../components";

export default function DirezioneOperatorKPI({ isDark = true }: { isDark?: boolean }) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[DirezioneOperatorKPI] mounted");
    }
  }, []);

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
