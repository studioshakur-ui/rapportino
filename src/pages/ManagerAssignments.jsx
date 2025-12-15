// src/pages/ManagerAssignments.jsx
import React from "react";

export default function ManagerAssignments({ isDark = true }) {
  const borderClass = isDark ? "border-slate-800" : "border-slate-200";
  const bgCard = isDark ? "bg-slate-950/60" : "bg-white";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const textMain = isDark ? "text-slate-50" : "text-slate-900";

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Operativo (Manager)
        </div>
        <h1 className={`text-xl sm:text-2xl font-semibold ${textMain}`}>
          Scopes · Capi · Squadre
        </h1>
        <p className={`text-xs ${textMuted} mt-1 max-w-3xl`}>
          Questa pagina serve per leggere e pilotare l’operativo (cantieri/scopes),
          capire quali capi e squadre sono coinvolti e monitorare copertura/criticità.
          <span className="text-slate-300">
            {" "}
            Nessuna gestione account o ruoli qui: quello è dominio ADMIN.
          </span>
        </p>
      </header>

      <section
        className={[
          "rounded-2xl border p-3 sm:p-4",
          borderClass,
          bgCard,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Modello (many-to-many)
            </div>
            <div className={`text-xs ${textMuted} mt-1`}>
              Coerente con le tue regole: un scope ↔ più capi, un capo ↔ più scopes,
              un nave ↔ più managers.
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-500">
            <div className="uppercase tracking-[0.18em] text-slate-600">
              Governance
            </div>
            <div>Account/ruoli → ADMIN</div>
          </div>
        </div>

        {/* Placeholder “Percorso-level” : structure claire, sans actions admin */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left py-1.5 pr-3">Nave</th>
                <th className="text-left py-1.5 pr-3">Scope</th>
                <th className="text-left py-1.5 pr-3">Capi</th>
                <th className="text-left py-1.5 pr-3">Squadre / Operai</th>
                <th className="text-left py-1.5 pr-3">Stato</th>
                <th className="text-right py-1.5 pl-3">Note</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-900/40">
                <td className="py-2 pr-3 text-slate-100">COSTR 6368</td>
                <td className="py-2 pr-3 text-slate-300">
                  SDC · Zona A · W34
                </td>
                <td className="py-2 pr-3 text-slate-300">
                  Capo A · Capo B
                </td>
                <td className="py-2 pr-3 text-slate-300">
                  Squadra 1 (8) · Squadra 2 (6)
                </td>
                <td className="py-2 pr-3 text-emerald-300">OK</td>
                <td className="py-2 pl-3 text-right text-slate-500 text-[11px]">
                  Monitoraggio
                </td>
              </tr>

              <tr className="hover:bg-slate-900/40">
                <td className="py-2 pr-3 text-slate-100">COSTR 6358</td>
                <td className="py-2 pr-3 text-slate-300">
                  IPC · Zona C · W34
                </td>
                <td className="py-2 pr-3 text-slate-300">
                  Capo C
                </td>
                <td className="py-2 pr-3 text-slate-300">
                  Squadra 3 (10)
                </td>
                <td className="py-2 pr-3 text-amber-300">Rischio</td>
                <td className="py-2 pl-3 text-right text-slate-500 text-[11px]">
                  Copertura &lt; 100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={`mt-3 text-[11px] ${textMuted}`}>
          Prossimo step: collegare questa vista ai dati reali (scopes/cantieri/capi/operai)
          con RLS “manager-perimetro”, mantenendo l’UI senza funzioni admin.
        </div>
      </section>
    </div>
  );
}
