import React from "react";
import { useNavigate } from "react-router-dom";

import { OperatorProductivityKpiPanel } from "../components";

import { useShip } from "../../../context/ShipContext";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function CapoOperatorKpi({ isDark = true }) {
  const navigate = useNavigate();
  const { currentShip } = useShip();

  const shipCode = (currentShip?.code ?? "").toString().trim();
  const shipName = (currentShip?.name ?? "").toString().trim();

  if (!shipCode) {
    return (
      <div className="p-4 sm:p-6">
        <div
          className={cn(
            "rounded-2xl border px-4 py-4",
            isDark
              ? "border-slate-800 bg-slate-950/60 text-slate-200"
              : "border-slate-200 bg-white text-slate-900"
          )}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">CNCS · Capo</div>
          <div className={cn("mt-1 text-lg font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
            KPI Operatori
          </div>
          <div className={cn("mt-1 text-sm", isDark ? "text-slate-400" : "text-slate-600")}>
            Seleziona prima una nave per bloccare i KPI al cantiere corretto.
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate("/app/ships")}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em] transition",
                isDark
                  ? "border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/35"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              Vai a selezionare nave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OperatorProductivityKpiPanel
      scope="CAPO"
      isDark={isDark}
      showCostrCommessaFilters={false}
      fixedCostr={shipCode}
      lockCostr
      title={`KPI Operatori · ${shipCode}${shipName ? ` · ${shipName}` : ""}`}
      kicker="CNCS · Capo"
    />
  );
}
