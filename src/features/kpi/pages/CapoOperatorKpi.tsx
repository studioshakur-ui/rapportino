// src/features/kpi/pages/CapoOperatorKpi.jsx
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import OperatorProductivityKpiPanel from "../components/OperatorProductivityKpiPanel";
import { useShip } from "../../../context/ShipContext";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function CapoOperatorKpi({ isDark = true }: { isDark?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { currentShip, ships, loadingShips, setCurrentShip, refreshShips } = useShip();

  const routeShipId = useMemo(() => {
    const sid = location?.state?.shipId;
    return sid ? String(sid) : "";
  }, [location?.state?.shipId]);

  // Self-heal ship context
  useEffect(() => {
    if (currentShip?.code) return;

    if (!loadingShips && (!ships || ships.length === 0)) {
      refreshShips?.();
    }

    if (routeShipId && ships?.length) {
      const match = ships.find((s) => String(s?.id) === routeShipId) || null;
      if (match) setCurrentShip(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeShipId, ships?.length, loadingShips]);

  const shipCode = (currentShip?.code ?? "").trim();
  const shipName = (currentShip?.name ?? "").trim();

  // ❗️ IMPORTANT :
  // Pas de min-h-screen ici
  // Pas de header plein écran
  // Le Topbar est géré par AppShell

  if (!shipCode) {
    return (
      <div className="px-4 py-4">
        <div
          className={cn(
            "theme-panel-2 rounded-2xl px-4 py-4"
          )}
        >
          <div className="kicker mb-1">CNCS · Capo</div>

          <div className="text-lg font-semibold mb-1 theme-text">KPI Operatori</div>

          <div className="text-sm mb-3 theme-text-muted">
            Seleziona prima una nave per bloccare i KPI al cantiere corretto.
          </div>

          <button
            type="button"
            onClick={() => navigate("/app")}
            className="btn-instrument inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold"
          >
            Vai a selezionare nave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <OperatorProductivityKpiPanel
        scope="CAPO"
        isDark={isDark}
        showCostrCommessaFilters={false}
        fixedCostr={shipCode}
        lockCostr
        title={`KPI Operatori · ${shipCode}${shipName ? ` · ${shipName}` : ""}`}
        kicker="CNCS · Capo"
      />
    </div>
  );
}
