// src/pages/ManagerAnalytics.jsx
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

export default function ManagerAnalytics({ isDark = true }) {
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const borderClass = isDark ? "border-slate-800" : "border-slate-200";
  const bgCard = isDark ? "bg-slate-950/60" : "bg-white";

  const hoursByRole = useMemo(
    () => [
      { role: "Elettricisti", ore: 420 },
      { role: "Carpenteria", ore: 310 },
      { role: "Montaggio", ore: 260 },
      { role: "Supporto", ore: 120 },
    ],
    []
  );

  const latencyBuckets = useMemo(
    () => [
      { bucket: "0-1 gg", count: 62 },
      { bucket: "2-3 gg", count: 18 },
      { bucket: ">3 gg", count: 5 },
    ],
    []
  );

  const siteHealth = useMemo(
    () => [
      { metric: "C001", score: 82 },
      { metric: "C002", score: 75 },
      { metric: "6310", score: 58 },
    ],
    []
  );

  const accent1 = isDark ? "#38bdf8" : "#0f766e";
  const accent2 = isDark ? "#22c55e" : "#16a34a";
  const accent3 = isDark ? "#f97316" : "#ea580c";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Analitiche operative
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
          Lettura trasversale dei cantieri
        </h1>
        <p className={`text-xs ${textMuted} mt-1 max-w-2xl`}>
          Questa pagina è pensata per dare al Manager una lettura sintetica ma
          profonda: distribuzione ore per ruolo, latenza tra cantiere e ufficio,
          indice di salute per cantiere. Tutti i numeri sono demo finché non
          colleghiamo i dataset reali.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Heures par rôle */}
        <div className={["rounded-2xl border p-3 sm:p-4", borderClass, bgCard].join(" ")}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Ore per ruolo
              </div>
              <div className={`text-xs ${textMuted}`}>
                Ripartizione demo della settimana corrente
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByRole}>
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="role" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#020617" : "#ffffff",
                    borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    fontSize: 11,
                  }}
                  formatter={(value) => [`${value} h`, "Ore"]}
                />
                <Bar dataKey="ore" name="Ore" fill={accent1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latenza rapportini */}
        <div className={["rounded-2xl border p-3 sm:p-4", borderClass, bgCard].join(" ")}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                Latenza cantiere → ufficio
              </div>
              <div className={`text-xs ${textMuted}`}>
                Tempo tra compilazione e validazione (demo)
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyBuckets}>
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="bucket" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#020617" : "#ffffff",
                    borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" name="Rapportini" fill={accent3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Radar "indice salute" */}
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
              Indice di salute cantiere
            </div>
            <div className={`text-xs ${textMuted}`}>
              Score sintetico (demo) basato su copertura rapportini, INCA e
              costanza flussi.
            </div>
          </div>
        </div>
        <div className="h-60 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={siteHealth}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis
                dataKey="metric"
                stroke={axisColor}
                fontSize={11}
              />
              <PolarRadiusAxis
                stroke={axisColor}
                fontSize={10}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#020617" : "#ffffff",
                  borderColor: isDark ? "#1e293b" : "#e2e8f0",
                  fontSize: 11,
                }}
                formatter={(value) => [`${value} / 100`, "Indice"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Radar
                name="Indice salute"
                dataKey="score"
                stroke={accent2}
                fill={accent2}
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className={`mt-3 text-[11px] ${textMuted}`}>
          In produzione, questo indice potrà essere calcolato combinando più
          indicatori: continuità rapportini, latenza media verso ufficio, gap
          INCA, anomalie registrate. L’obiettivo è dare alla Direzione una
          lettura sintetica per cantiere, partendo dal lavoro del Manager.
        </p>
      </section>
    </div>
  );
}
