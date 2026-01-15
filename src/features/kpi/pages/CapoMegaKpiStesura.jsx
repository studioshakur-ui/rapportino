// src/features/kpi/pages/CapoMegaKpiStesura.jsx
import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import MegaKpiCapoStesuraPanel from "../components/MegaKpiCapoStesuraPanel";
import { useShip } from "../../../context/ShipContext";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function CapoMegaKpiStesura({ isDark = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { currentShip, ships, loadingShips, setCurrentShip, refreshShips } = useShip();

  const resolvedShip = useMemo(() => {
    // Preferred: currentShip
    if (currentShip?.id) return currentShip;

    // Fallback: try to resolve from location.state.shipId (set by CapoModuleSelector)
    const sid = location?.state?.shipId;
    if (sid && Array.isArray(ships)) {
      const found = ships.find((s) => String(s.id) === String(sid));
      if (found) return found;
    }

    // Last fallback: take first ship if any (should be rare)
    if (Array.isArray(ships) && ships.length > 0) return ships[0];

    return null;
  }, [currentShip?.id, ships, location?.state?.shipId]);

  useEffect(() => {
    // Ensure we have ships and a resolved ship in context (similar to CapoOperatorKpi)
    let alive = true;

    async function boot() {
      if (!Array.isArray(ships) || ships.length === 0) {
        await refreshShips();
      }
      if (!alive) return;
      if (resolvedShip && (!currentShip || currentShip.id !== resolvedShip.id)) {
        setCurrentShip(resolvedShip);
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, [resolvedShip?.id]); // intentionally narrow: avoid loops

  if (loadingShips && !resolvedShip) {
    return (
      <div className="p-4 sm:p-6">
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
          <div className="text-lg font-semibold mb-1 text-slate-50">Mega KPI · Posa cavi</div>
          <div className="text-sm text-slate-400">Caricamento nave…</div>
        </div>
      </div>
    );
  }

  if (!resolvedShip) {
    return (
      <div className="p-4 sm:p-6">
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
          <div className="text-lg font-semibold mb-1 text-slate-50">Mega KPI · Posa cavi</div>
          <div className="text-sm text-slate-400 mb-3">
            Nessuna nave disponibile o nave non selezionata.
          </div>
          <button
            type="button"
            onClick={() => navigate("/app/ship-selector")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold",
              isDark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-900 text-white"
            )}
          >
            Seleziona nave
          </button>
        </div>
      </div>
    );
  }

  const costr = resolvedShip.costr ?? resolvedShip.code ?? null;
  const commessa = resolvedShip.commessa ?? null;

  return (
    <div className="p-4 sm:p-6 space-y-4">
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

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <div className="text-lg font-semibold text-slate-50">Mega KPI · Posa cavi</div>
            <div className="text-sm text-slate-400">
              Curva cumulata basata su INCA (scope) + rapportini (stesura + ripresa). Fascettatura esclusa.
            </div>
          </div>

          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Nave:</span>{" "}
            <span className="font-semibold text-slate-100">
              {resolvedShip.name || resolvedShip.code || resolvedShip.id}
            </span>
            {costr ? (
              <>
                {" "}
                <span className="text-slate-500">· costr:</span>{" "}
                <span className="font-mono text-slate-200">{String(costr)}</span>
              </>
            ) : null}
            {commessa ? (
              <>
                {" "}
                <span className="text-slate-500">· commessa:</span>{" "}
                <span className="font-mono text-slate-200">{String(commessa)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <MegaKpiCapoStesuraPanel isDark={isDark} costr={costr} commessa={commessa} />
    </div>
  );
}
