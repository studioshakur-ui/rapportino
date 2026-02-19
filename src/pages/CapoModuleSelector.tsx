// src/pages/CapoModuleSelector.tsx
import { useEffect, useMemo, useRef  } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShip, type Ship } from "../context/ShipContext";
import { corePills } from "../ui/designSystem";

function findShipById(list: Ship[], shipId: string | undefined): Ship | null {
  if (!shipId) return null;
  const sid = String(shipId);
  return list.find((s) => String(s.id) === sid) ?? null;
}

export default function CapoModuleSelector(): JSX.Element {
  const navigate = useNavigate();
  const { shipId } = useParams();

  const { currentShip, ships, loadingShips, setCurrentShip, refreshShips } = useShip();

  // Prevent iOS ghost-tap / double trigger
  const navLockRef = useRef<number>(0);
  const canNavigate = (): boolean => Date.now() > navLockRef.current;
  const lockNav = (ms = 420): void => {
    navLockRef.current = Date.now() + ms;
  };

  useEffect(() => {
    refreshShips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvedShip = useMemo(() => findShipById(ships ?? [], shipId), [ships, shipId]);
  const uiShip = useMemo(() => resolvedShip || currentShip || null, [resolvedShip, currentShip]);

  const shipLabel = useMemo(() => {
    if (uiShip?.name) return uiShip.name;
    if (uiShip?.code) return String(uiShip.code);
    if (shipId) return String(shipId);
    return "Nave";
  }, [uiShip, shipId]);

  const goRapportino = (): void => {
    if (!canNavigate()) return;
    lockNav();
    navigate(`/app/ship/${shipId}/rapportino/role`);
  };

  const goTeams = (): void => {
    if (!canNavigate()) return;
    lockNav();
    navigate(`/app/ship/${shipId}/teams`);
  };

  const goInca = (): void => {
    if (!canNavigate()) return;
    lockNav();
    navigate(`/app/ship/${shipId}/inca`);
  };

  const goKpi = async (): Promise<void> => {
    if (!canNavigate()) return;
    lockNav();

    // KPI page depends on ShipContext.currentShip.code (costr)
    if (resolvedShip) {
      setCurrentShip(resolvedShip);
      await Promise.resolve();
    }
    navigate(`/app/kpi-operatori`, { state: { shipId } });
  };

  const goMegaKpi = async (): Promise<void> => {
    if (!canNavigate()) return;
    lockNav();

    if (resolvedShip) {
      setCurrentShip(resolvedShip);
      await Promise.resolve();
    }
    navigate(`/app/ship/${shipId}/kpi-stesura`, { state: { shipId } });
  };

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
          Scegli se organizzare le squadre del giorno, compilare il rapportino giornaliero, consultare
          l&apos;avanzamento cavi (INCA) o analizzare i KPI di produttività.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* ORGANIZZAZIONE SQUADRE */}
        <button
          type="button"
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goTeams();
          }}
          className="group relative overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-950/60 hover:bg-slate-950/75 hover:border-violet-400/80 transition-all px-4 py-4 text-left"
          style={{ touchAction: "manipulation" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-violet-300 mb-1">
                Squadre · Organizzazione
              </div>
              <div className="text-lg font-semibold text-slate-50">Prepara il giorno</div>
              <div className="text-xs text-slate-400">
                Crea squadre, assegna operatori e ore. Si riflette nel Rapportino.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "violet", "text-[10px] px-2 py-0.5")}>Capo</span>
              <span className={corePills(true, "slate", "text-[10px] px-2 py-0.5")}>Draft</span>
            </div>
          </div>
        </button>

        {/* Rapportino */}
        <button
          type="button"
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goRapportino();
          }}
          className="group relative overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950/60 hover:bg-slate-950/75 hover:border-sky-400/80 transition-all px-4 py-4 text-left"
          style={{ touchAction: "manipulation" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-sky-300 mb-1">
                Rapportino giornaliero
              </div>
              <div className="text-lg font-semibold text-slate-50">Compila / invia</div>
              <div className="text-xs text-slate-400">Inserisci attività, operatori, tempo e prodotto.</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "sky", "text-[10px] px-2 py-0.5")}>Capo</span>
            </div>
          </div>
        </button>

        {/* INCA */}
        <button
          type="button"
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goInca();
          }}
          className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950/60 hover:bg-slate-950/75 hover:border-amber-400/80 transition-all px-4 py-4 text-left"
          style={{ touchAction: "manipulation" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-amber-300 mb-1">INCA · Cockpit</div>
              <div className="text-lg font-semibold text-slate-50">Avanzamento cavi</div>
              <div className="text-xs text-slate-400">Stato cantiere (P/T/R/B/E/NP) + distribuzione.</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "amber", "text-[10px] px-2 py-0.5")}>Scope INCA</span>
            </div>
          </div>
        </button>

        {/* KPI */}
        <button
          type="button"
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void goKpi();
          }}
          className="group relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-slate-950/60 hover:bg-slate-950/75 hover:border-fuchsia-400/80 transition-all px-4 py-4 text-left"
          style={{ touchAction: "manipulation" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-fuchsia-300 mb-1">KPI · Produttività</div>
              <div className="text-lg font-semibold text-slate-50">Sintesi + famiglie</div>
              <div className="text-xs text-slate-400">
                Indice su <span className="font-mono">previsto</span> (global + per famiglia). Solo lettura.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "fuchsia", "text-[10px] px-2 py-0.5")}>Previsto · v3</span>
            </div>
          </div>

          {!resolvedShip && (
            <div className="mt-2 text-[11px] text-slate-500">
              Nota: KPI richiede nave selezionata. Sto sincronizzando…
            </div>
          )}
        </button>

        {/* MEGA KPI · STESURA */}
        <button
          type="button"
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void goMegaKpi();
          }}
          className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950/60 hover:bg-slate-950/75 hover:border-emerald-400/80 transition-all px-4 py-4 text-left"
          style={{ touchAction: "manipulation" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300 mb-1">Mega KPI · Posa cavi</div>
              <div className="text-lg font-semibold text-slate-50">Stesura + Ripresa</div>
              <div className="text-xs text-slate-400">
                Curva cumulata INCA-based. <span className="font-semibold text-slate-300">Fascettatura esclusa</span>.
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={corePills(true, "emerald", "text-[10px] px-2 py-0.5")}>ECharts</span>
              <span className={corePills(true, "slate", "text-[10px] px-2 py-0.5")}>Audit</span>
            </div>
          </div>
        </button>
      </div>

      {loadingShips ? <div className="text-sm text-slate-500">Caricamento navi…</div> : null}
    </div>
  );
}
