// src/pages/ManagerAssignments.jsx
import React from "react";

export default function ManagerAssignments({ isDark = true }) {
  const borderClass = isDark ? "border-slate-800" : "border-slate-200";
  const bgCard = isDark ? "bg-slate-950/60" : "bg-white";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Struttura utenti &amp; cantieri
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
          Utenti, ruoli e cantieri assegnati
        </h1>
        <p className={`text-xs ${textMuted} mt-1 max-w-2xl`}>
          Questa vista serve al Manager per avere sotto controllo la struttura
          operativa: quali capi sono collegati a quali cantieri e quali ruoli
          sono attivi. In questa fase l’interfaccia è solo dimostrativa, in
          attesa del collegamento alle API reali.
        </p>
      </header>

      <section
        className={[
          "rounded-2xl border p-3 sm:p-4",
          borderClass,
          bgCard,
        ].join(" ")}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Utenti demo
            </div>
            <div className={`text-xs ${textMuted}`}>
              Esempio di struttura tipica (CAPO · UFFICIO · MANAGER ·
              DIREZIONE)
            </div>
          </div>
          <button
            type="button"
            className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/10"
          >
            Crea nuovo utente (demo)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left py-1.5 pr-3">Email</th>
                <th className="text-left py-1.5 pr-3">Ruolo</th>
                <th className="text-left py-1.5 pr-3">Cantieri</th>
                <th className="text-left py-1.5 pr-3">Stato</th>
                <th className="text-right py-1.5 pl-3">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-1.5 pr-3 text-slate-100">
                  maiga@core.com
                </td>
                <td className="py-1.5 pr-3 text-slate-300">CAPO</td>
                <td className="py-1.5 pr-3 text-slate-300">
                  6368 · 6358
                </td>
                <td className="py-1.5 pr-3 text-emerald-300">Attivo</td>
                <td className="py-1.5 pl-3 text-right">
                  <button className="text-[11px] underline underline-offset-2 text-sky-300 hover:text-sky-200">
                    Modifica (demo)
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-slate-100">
                  ufficio@core.com
                </td>
                <td className="py-1.5 pr-3 text-slate-300">UFFICIO</td>
                <td className="py-1.5 pr-3 text-slate-300">
                  6368 · 6358 · 6310
                </td>
                <td className="py-1.5 pr-3 text-emerald-300">Attivo</td>
                <td className="py-1.5 pl-3 text-right">
                  <button className="text-[11px] underline underline-offset-2 text-sky-300 hover:text-sky-200">
                    Modifica (demo)
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-slate-100">
                  manager@core.com
                </td>
                <td className="py-1.5 pr-3 text-slate-300">MANAGER</td>
                <td className="py-1.5 pr-3 text-slate-300">
                  6368 · 6358
                </td>
                <td className="py-1.5 pr-3 text-emerald-300">Attivo</td>
                <td className="py-1.5 pl-3 text-right">
                  <button className="text-[11px] underline underline-offset-2 text-sky-300 hover:text-sky-200">
                    Modifica (demo)
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 text-slate-100">
                  direzione@core.com
                </td>
                <td className="py-1.5 pr-3 text-slate-300">DIREZIONE</td>
                <td className="py-1.5 pr-3 text-slate-300">
                  Tutti i cantieri
                </td>
                <td className="py-1.5 pr-3 text-emerald-300">Attivo</td>
                <td className="py-1.5 pl-3 text-right">
                  <button className="text-[11px] underline underline-offset-2 text-sky-300 hover:text-sky-200">
                    Modifica (demo)
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className={`mt-3 text-[11px] ${textMuted}`}>
          In una fase successiva, questa tabella verrà collegata direttamente
          alla tabella <code className="font-mono">profiles</code> (app_role,
          allowed_cantieri) con azioni reali di creazione, modifica e
          disattivazione utenze. Per ora rappresenta solo la struttura logica
          desiderata.
        </p>
      </section>
    </div>
  );
}
