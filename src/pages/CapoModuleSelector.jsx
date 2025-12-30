// src/pages/CapoModuleSelector.jsx
import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShip } from "../context/ShipContext";
import { corePills } from "../ui/designSystem";

export default function CapoModuleSelector() {
  const navigate = useNavigate();
  const { shipId } = useParams();

  const {
    currentShip,
    ships,
    loadingShips,
    setCurrentShip,
    refreshShips,
  } = useShip();

  // Try to resolve the ship from the canonical allowed ships list
  const resolvedShip = useMemo(() => {
    const sid = shipId ? String(shipId) : "";
    if (!sid) return null;

    const match = (ships || []).find((s) => String(s?.id) === sid) || null;

    // Prefer the canonical match
    if (match) return match;

    // If currentShip already matches, keep it
    if (currentShip && String(currentShip.id) === sid) return currentShip;

    // Fallback minimal object (UI only), but note: KPI needs code, so this won’t be enough.
    return null;
  }, [shipId, ships, currentShip]);

  // Ensure ShipContext is aligned with the shipId route
  useEffect(() => {
    const sid = shipId ? String(shipId) : "";
    if (!sid) return;

    // If ships not loaded yet, ensure refresh is attempted (safe no-op if already loaded)
    if (!loadingShips && (!ships || ships.length === 0)) {
      // Not fatal if it fails; user can still navigate back
      refreshShips?.();
    }

    // If we can resolve a canonical ship and it’s not current, set it
    if (resolvedShip && (!currentShip || String(currentShip.id) !== String(resolvedShip.id))) {
      setCurrentShip(resolvedShip);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, resolvedShip?.id]);

  const uiShip = useMemo(() => {
    if (resolvedShip) return resolvedShip;
    if (currentShip) return currentShip;

    // Last resort: show shipId as technical identifier
    return {
      id: shipId,
      code: "",
      name: "",
      yard: "",
    };
  }, [resolvedShip, currentShip, shipId]);

  const goRapportino = () => {
    navigate(`/app/ship/${shipId}/rapportino/role`);
  };

  const goInca = () => {
    navigate(`/app/ship/${shipId}/inca`);
  };

  const goKpi = async () => {
    // KPI page depends on ShipContext.currentShip.code (costr)
    // Ensure currentShip is set to the resolvedShip before navigating.
    if (resolvedShip) {
      setCurrentShip(resolvedShip);
      // Yield one microtask to let state propagate before route render
      await Promise.resolve();
    }
    navigate(`/app/kpi-operatori`, { state: { shipId: shipId || null } });
  };

  const shipLabel = useMemo(() => {
    const code = (uiShip?.code ?? "").toString().trim();
    const name = (uiShip?.name ?? "").toString().trim();

    if (code) return `${code}${name ? ` · ${name}` : ""}`;
    if (shipId) return shipId.toString();
    return "Nave";
  }, [uiShip, shipId]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Nave {shipLabel} · Selezione modulo
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          Cosa vuoi fare su questa nave?
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Scegli se compilare il rapportino giornaliero, consultare l&apos;avanzamento cavi (INCA)
          o analizzare i KPI di produttività per questa nave.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rapportino */}
        <button
          type="button"
          onClick={goRapportino}
          className="group relative overflow-hidden rounded-2xl border border-sky-700/70 bg-slate-950/80 hover:bg-slate-900/90 hover:border-sky-400/80 transition-all px-4 py-4 text-left"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-sky-300 mb-1">
                Rapportino giornaliero
              </div>
              <div className="text-lg font-semibold text-slate-50">
                Compila e invia il rapportino
              </div>
              <div className="text-xs text-slate-400">
                Ore, squadra, attività e note per l&apos;Ufficio e la Direzione.
              </div>
            </div>
            <div>
              <span className={corePills(true, "sky", "text-[10px] px-2 py-0.5")}>Compilazione</span>
            </div>
          </div>
        </button>

        {/* INCA */}
        <button
          type="button"
          onClick={goInca}
          className="group relative overflow-hidden rounded-2xl border border-emerald-700/70 bg-slate-950/80 hover:bg-slate-900/90 hover:border-emerald-400/80 transition-all px-4 py-4 text-left"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300 mb-1">
                INCA · Avanzamento cavi
              </div>
              <div className="text-lg font-semibold text-slate-50">
                Vedi stato tratte e produzione
              </div>
              <div className="text-xs text-slate-400">
                Curve di produzione, metri posati, scostamento dalla deadline e tratte critiche.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "emerald", "text-[10px] px-2 py-0.5")}>
                Read-only · dati certificati
              </span>
            </div>
          </div>
        </button>

        {/* KPI */}
        <button
          type="button"
          onClick={goKpi}
          className="group relative overflow-hidden rounded-2xl border border-fuchsia-700/60 bg-slate-950/80 hover:bg-slate-900/90 hover:border-fuchsia-400/80 transition-all px-4 py-4 text-left"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-fuchsia-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-fuchsia-300 mb-1">
                KPI · Produttività
              </div>
              <div className="text-lg font-semibold text-slate-50">Sintesi + famiglie</div>
              <div className="text-xs text-slate-400">
                Indice su <span className="font-mono">previsto</span> (global + per famiglia). Solo lettura.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "fuchsia", "text-[10px] px-2 py-0.5")}>
                Previsto · v3
              </span>
            </div>
          </div>

          {/* Subtle helper when ship isn't resolved yet */}
          {!resolvedShip && (
            <div className="mt-2 text-[11px] text-slate-500">
              Nota: KPI richiede nave selezionata. Sto sincronizzando…
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
