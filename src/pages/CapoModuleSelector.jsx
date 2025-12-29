// src/pages/CapoModuleSelector.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShip } from "../context/ShipContext";
import { corePills } from "../ui/designSystem";

export default function CapoModuleSelector() {
  const navigate = useNavigate();
  const { shipId } = useParams();
  const { currentShip } = useShip();

  const ship =
    currentShip && String(currentShip.id) === String(shipId)
      ? currentShip
      : currentShip || { code: shipId, name: "Nave", yard: "" };

  const goRapportino = () => {
    navigate(`/app/ship/${shipId}/rapportino/role`);
  };

  const goInca = () => {
    navigate(`/app/ship/${shipId}/inca`);
  };

  const goKpiOperatori = () => {
    // KPI page uses currentShip (stored in ShipContext/localStorage)
    navigate(`/app/kpi-operatori`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Nave {ship.code} · Selezione modulo
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          Cosa vuoi fare su questa nave?
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Scegli se compilare il rapportino giornaliero, consultare
          l&apos;avanzamento cavi (INCA) o analizzare i KPI operatori per questa nave.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Carte Rapportino */}
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
                Ore, squadra, attività e note per l&apos;Ufficio e la
                Direzione.
              </div>
            </div>
            <div>
              <span
                className={corePills(
                  true,
                  "sky",
                  "text-[10px] px-2 py-0.5"
                )}
              >
                Compilazione
              </span>
            </div>
          </div>
        </button>

        {/* Carte INCA */}
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
                Curve di produzione, metri posati, scostamento dalla
                deadline e tratte critiche.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={corePills(
                  true,
                  "emerald",
                  "text-[10px] px-2 py-0.5"
                )}
              >
                Read-only · dati certificati
              </span>
            </div>
          </div>
        </button>

        {/* Carte KPI Operatori */}
        <button
          type="button"
          onClick={goKpiOperatori}
          className="group relative overflow-hidden rounded-2xl border border-fuchsia-700/60 bg-slate-950/80 hover:bg-slate-900/90 hover:border-fuchsia-400/80 transition-all px-4 py-4 text-left"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-fuchsia-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-fuchsia-300 mb-1">
                KPI · Operatori
              </div>
              <div className="text-lg font-semibold text-slate-50">
                Analizza produttività e famiglie
              </div>
              <div className="text-xs text-slate-400">
                Indice canonico su <span className="font-mono">previsto</span> (global + per famiglia).
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "fuchsia", "text-[10px] px-2 py-0.5")}>
                Previsto · v3
              </span>
            </div>
          </div>
        </button>

        {/* Carte KPI Operatori */}
        <button
          type="button"
          onClick={goKpiOperatori}
          className="group relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-slate-950/80 hover:bg-slate-900/90 hover:border-emerald-400/60 transition-all px-4 py-4 text-left"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300 mb-1">
                KPI operai
              </div>
              <div className="text-lg font-semibold text-slate-50">
                Indice produttività (Previsto)
              </div>
              <div className="text-xs text-slate-400">
                Global + per famiglia (categoria + descrizione). Solo dati indicizzabili.
              </div>
            </div>
            <div>
              <span
                className={corePills(
                  true,
                  "emerald",
                  "text-[10px] px-2 py-0.5"
                )}
              >
                Read-only
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
