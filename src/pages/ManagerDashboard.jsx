// src/pages/ManagerDashboard.jsx
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function ManagerDashboard({ isDark = true }) {
  // Données fictives pour l’instant (à remplacer plus tard par des agrégations réelles)
  const rapportiniSeries = useMemo(
    () => [
      { day: "Lun", expected: 18, received: 16, validated: 14 },
      { day: "Mar", expected: 20, received: 19, validated: 18 },
      { day: "Mer", expected: 20, received: 17, validated: 15 },
      { day: "Gio", expected: 22, received: 21, validated: 20 },
      { day: "Ven", expected: 18, received: 17, validated: 16 },
    ],
    []
  );

  const hoursByCantiere = useMemo(
    () => [
      { costr: "C001", ore: 320 },
      { costr: "C002", ore: 280 },
      { costr: "6310", ore: 150 },
    ],
    []
  );

  const incaHealth = useMemo(
    () => [
      { costr: "C001", imported: 92, checked: 78 },
      { costr: "C002", imported: 85, checked: 64 },
      { costr: "6310", imported: 60, checked: 40 },
    ],
    []
  );

  const accentBar = isDark ? "#38bdf8" : "#0f766e";
  const accentBar2 = isDark ? "#22c55e" : "#16a34a";
  const accentLine = isDark ? "#f97316" : "#ea580c";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-5">
      {/* Bandeau titre + résumé */}
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Supervisione cantieri
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
            Stato operativo · Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Vista sintetica dei cantieri assegnati: presenze, completamento
            rapportini, copertura INCA. Dati esemplificativi in attesa di
            collegamento ai flussi reali.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <div className="text-emerald-300 uppercase tracking-[0.16em] mb-1">
              Cantieri attivi
            </div>
            <div className="text-lg font-semibold text-slate-50">3</div>
            <div className="text-[10px] text-emerald-200/80 mt-0.5">
              Sotto supervisione Manager
            </div>
          </div>
          <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-3 py-2">
            <div className="text-sky-300 uppercase tracking-[0.16em] mb-1">
              Rapportini oggi
            </div>
            <div className="text-lg font-semibold text-slate-50">96%</div>
            <div className="text-[10px] text-sky-200/80 mt-0.5">
              Ricevuti vs attesi (demo)
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
            <div className="text-amber-300 uppercase tracking-[0.16em] mb-1">
              Copertura INCA
            </div>
            <div className="text-lg font-semibold text-slate-50">~ 80%</div>
            <div className="text-[10px] text-amber-200/80 mt-0.5">
              Import &amp; controlli (demo)
            </div>
          </div>
        </div>
      </section>

      {/* Graphs principaux */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rapportini expected/received/validated */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Flusso rapportini
              </div>
              <div className="text-xs text-slate-400">
                Attesi · ricevuti · validati (demo)
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rapportiniSeries}>
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="day" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#020617" : "#ffffff",
                    borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    fontSize: 11,
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="expected" name="Attesi" fill={gridColor} />
                <Bar dataKey="received" name="Ricevuti" fill={accentBar} />
                <Bar dataKey="validated" name="Validati" fill={accentBar2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heures par cantiere */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Ore caricate per cantiere
              </div>
              <div className="text-xs text-slate-400">
                Distribuzione demo · settimana corrente
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByCantiere} layout="vertical">
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke={axisColor}
                  fontSize={11}
                  tickFormatter={(v) => `${v} h`}
                />
                <YAxis
                  type="category"
                  dataKey="costr"
                  stroke={axisColor}
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#020617" : "#ffffff",
                    borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value} h`, "Ore"]}
                />
                <Bar dataKey="ore" name="Ore" fill={accentBar2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* INCA health + alertes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Santé INCA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Stato INCA per cantiere
              </div>
              <div className="text-xs text-slate-400">
                Import &amp; controlli (valori demo)
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incaHealth}>
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="costr" stroke={axisColor} fontSize={11} />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#020617" : "#ffffff",
                    borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value}%`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="imported"
                  name="% importati"
                  stroke={accentBar}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="checked"
                  name="% verificati"
                  stroke={accentLine}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertes (liste simple) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Alert &amp; priorità
              </div>
              <div className="text-xs text-slate-400">
                Esempi di situazioni da controllare
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="divide-y divide-slate-800 text-[12px]">
              <li className="py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-slate-200">
                    Rapportini mancanti · cantiere C002
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    2 giorni consecutivi senza rapportino per una squadra
                    elettrica.
                  </div>
                </div>
                <span className="mt-0.5 inline-flex h-5 px-2 items-center rounded-full bg-amber-500/20 text-amber-200 text-[10px]">
                  Priorità media
                </span>
              </li>
              <li className="py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-slate-200">
                    INCA non aggiornato · cantiere 6310
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Ultimo import INCA risale a più di 5 giorni fa.
                  </div>
                </div>
                <span className="mt-0.5 inline-flex h-5 px-2 items-center rounded-full bg-rose-500/20 text-rose-200 text-[10px]">
                  Priorità alta
                </span>
              </li>
              <li className="py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-slate-200">
                    Squadra carpenteria sotto-utilizzata · C001
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Volume ore molto inferiore alla media settimana precedente.
                  </div>
                </div>
                <span className="mt-0.5 inline-flex h-5 px-2 items-center rounded-full bg-sky-500/20 text-sky-200 text-[10px]">
                  Da monitorare
                </span>
              </li>
            </ul>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Queste voci sono esemplificative. In una fase successiva verranno
            popolate da regole automatiche basate sui dati reali di CORE.
          </p>
        </div>
      </section>
    </div>
  );
}
