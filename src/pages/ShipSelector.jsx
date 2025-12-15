// src/pages/ShipSelector.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useShip } from "../context/ShipContext";
import { corePills } from "../ui/designSystem";

const FALLBACK_SHIPS = [
  {
    id: "C001",
    code: "C001",
    name: "COMM01",
    yard: "Sede operativa",
    progress_inca: 62,
    deadline_date: "2026-02-15",
    recent_reports: 34,
  },
    {
    id: "C002",
    code: "C002",
    name: "COMM02",
    yard: "Sede operativa",
    progress_inca: 48,
    deadline_date: "2026-03-10",
    recent_reports: 21,
  },
];

function formatDate(itDateString) {
  if (!itDateString) return "—";
  const d = new Date(itDateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT");
}

export default function ShipSelector() {
  const navigate = useNavigate();
  const { currentShip, setCurrentShip } = useShip();
  const [ships, setShips] = useState(FALLBACK_SHIPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tentative de chargement depuis Supabase (soft-fail : on garde le fallback)
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Ajuste le nom de la table si tu crées "ships" côté DB
        const { data, error: qError } = await supabase
          .from("ships")
          .select(
            "id, code, name, yard, deadline_date, progress_inca, recent_reports"
          )
          .eq("is_active", true);

        if (qError) throw qError;

        if (isMounted && data && data.length > 0) {
          setShips(data);
        }
      } catch (err) {
        console.warn("[ShipSelector] Errore caricamento ships:", err);
        setError(
          "Impossibile recuperare le navi dal server. Uso della configurazione locale."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectShip = (ship) => {
    setCurrentShip(ship);
    navigate(`/app/ship/${ship.id}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Modulo Capo · Selezione nave
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          Seleziona la nave su cui stai lavorando
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Ogni rapportino e ogni dato INCA saranno agganciati alla nave
          corretta. Le navi visibili sono quelle assegnate al tuo profilo.
        </p>
        {currentShip && (
          <div className="mt-1 text-xs text-slate-500">
            Nave attualmente selezionata:{" "}
            <span className="font-semibold text-slate-200">
              {currentShip.code} · {currentShip.name}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs rounded-xl border border-amber-500/50 bg-amber-500/10 text-amber-100 px-3 py-2">
          {error}
        </div>
      )}

      {/* Grille de cartes bateaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ships.map((ship) => (
          <button
            key={ship.id}
            type="button"
            onClick={() => handleSelectShip(ship)}
            className={[
              "group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all",
              "bg-slate-950/70 border-slate-800 hover:border-sky-500/70 hover:bg-slate-900/80",
              "shadow-[0_18px_45px_rgba(15,23,42,0.85)] hover:shadow-[0_22px_60px_rgba(8,47,73,0.95)]",
            ].join(" ")}
          >
            {/* Glow top */}
            <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent" />

            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-sky-300 mb-1">
                  NAVE {ship.code}
                </div>
                <div className="text-lg font-semibold text-slate-50">
                  {ship.name}
                </div>
                <div className="text-xs text-slate-400">
                  Cantiere:{" "}
                  <span className="text-slate-200">{ship.yard}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={corePills(
                    true,
                    "sky",
                    "text-[10px] px-2 py-0.5"
                  )}
                >
                  Seleziona nave
                </span>
                <span className="text-[11px] text-slate-500">
                  Rapporto ultimi 7g:{" "}
                  <span className="text-slate-200 font-medium">
                    {ship.recent_reports ?? "—"}
                  </span>
                </span>
              </div>
            </div>

            {/* Progress + deadline */}
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Avanzamento INCA</span>
                <span className="text-slate-200 font-medium">
                  {ship.progress_inca ?? 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{
                    width: `${Math.min(
                      Math.max(ship.progress_inca ?? 0, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Deadline INCA</span>
                <span className="text-slate-300">
                  {formatDate(ship.deadline_date)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
