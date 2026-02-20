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
            "rounded-2xl border px-4 py-4",
            isDark
              ? "border-slate-800 bg-slate-950/60 text-slate-200"
              : "border-slate-200 bg-white text-slate-800"
          )}
        >
          <div className="text-[11px] uppercase tracking-[0.20em] mb-1 text-slate-400">
            CNCS · Capo
          </div>

          <div className="text-lg font-semibold mb-1 text-slate-50">
            KPI Operatori
          </div>

          <div className="text-sm mb-3 text-slate-300">
            Seleziona prima una nave per bloccare i KPI al cantiere corretto.
          </div>

          <button
            type="button"
            onClick={() => navigate("/app")}
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-50 border border-slate-800"
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
