// src/pages/CapoRoleSelector.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShip } from "../context/ShipContext";
import { corePills } from "../ui/designSystem";

const ROLES = [
  {
    id: "ELETTRICISTA",
    label: "Elettricista",
    tone: "sky",
    description: "Passacavi, collegamenti, prove e collaudi.",
  },
  {
    id: "CARPENTERIA",
    label: "Carpenteria",
    tone: "amber",
    description: "Supporti, strutture, carpenteria navale.",
  },
  {
    id: "MONTAGGIO",
    label: "Montaggio",
    tone: "emerald",
    description: "Montaggio quadri, apparecchiature e sistemi.",
  },
];

export default function CapoRoleSelector() {
  const navigate = useNavigate();
  const { shipId } = useParams();
  const { currentShip } = useShip();

  const ship =
    currentShip && String(currentShip.id) === String(shipId)
      ? currentShip
      : currentShip || { code: shipId, name: "Nave", yard: "" };

  const handleSelectRole = (roleId) => {
    try {
      window.localStorage.setItem("core-current-role", roleId);
    } catch {
      // ignore
    }
    navigate(`/app/ship/${shipId}/rapportino`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Nave {ship.code} · Selezione ruolo
        </span>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          Che ruolo stai coprendo oggi?
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Questo imposta il modello di attività, le colonne del rapportino e
          alcuni controlli HSE. Puoi cambiare ruolo in futuro se necessario.
        </p>

        {/* NOTE CANONIQUE */}
        <p className="text-[12px] text-slate-500 max-w-2xl pt-1">
          Nota: la “Lista Cavi / INCA” (picker) è disponibile solo per{" "}
          <span className="text-slate-300">Elettricista</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => handleSelectRole(role.id)}
            className={[
              "group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all",
              "bg-slate-950/80 border-slate-800 hover:border-sky-500/70 hover:bg-slate-900/90",
              "shadow-[0_16px_40px_rgba(15,23,42,0.85)]",
            ].join(" ")}
          >
            <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Ruolo
                </div>
                <span
                  className={corePills(true, role.tone, "text-[10px] px-2 py-0.5")}
                >
                  {role.label}
                </span>
              </div>
              <div className="text-xs text-slate-400">{role.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
