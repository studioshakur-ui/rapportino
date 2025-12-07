// src/components/DirectionDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { coreLayout } from "../ui/coreLayout";
import { supabase } from "../lib/supabaseClient";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Helpers format
function formatNumber(value) {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function formatPercent(delta) {
  if (delta == null || isNaN(delta)) return "0%";
  const v = Number(delta);
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function computeDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

// Petite pastille ▲ / ▼
function DeltaBadge({ value }) {
  if (value == null || isNaN(value)) return null;

  const n = Number(value);
  const positive = n > 0;
  const negative = n < 0;
  const label = n === 0 ? "0%" : formatPercent(n);

  let color =
    "text-slate-300 border-slate-600 bg-slate-900/60";
  if (positive) {
    color =
      "text-emerald-300 border-emerald-500/60 bg-emerald-500/10";
  } else if (negative) {
    color = "text-rose-300 border-rose-500/60 bg-rose-500/10";
  }

  const arrow = positive ? "▲" : negative ? "▼" : "·";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px]",
        color,
      ].join(" ")}
    >
      <span className="text-[10px]">{arrow}</span>
      <span>{label}</span>
    </span>
  );
}

// Carte KPI standardisée
function KpiCard({
  isDark,
  tone = "neutral",
  label,
  value,
  hint,
  deltaLabel,
  deltaValue,
}) {
  return (
    <div className={coreLayout.kpiCard(isDark, tone)}>
      {/* Glow top */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent" />

      <div className="relative flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
            {label}
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-[11px] text-slate-400">
              {hint}
            </div>
          )}
        </div>

        {deltaValue != null && (
          <div className="flex flex-col items-end gap-1">
            {deltaLabel && (
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                {deltaLabel}
              </span>
            )}
            <DeltaBadge value={deltaValue} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectionDashboard({ isDark = true }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  // Chargement des données sur 30 jours glissants depuis ARCHIVE v1
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const todayKey = computeDateKey(now);
        const cutoff = new Date(
          now.getTime() - 29 * 24 * 60 * 60 * 1000
        );
        const cutoffKey = computeDateKey(cutoff);

        const { data, error: qError } = await supabase
          .from("archive_rapportini_v1")
          .select("id, data, totale_prodotto, capo_name, commessa, costr")
          .gte("data", cutoffKey)
          .lte("data", todayKey);

        if (qError) throw qError;

        setRows(data || []);
      } catch (err) {
        console.error("[DirectionDashboard] Errore load KPI", err);
        setError(
          "Errore nel caricamento delle metriche per la Direzione."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Agrégation par date
  const {
    todayStats,
    yesterdayStats,
    last7Stats,
    last30Stats,
    timelineData,
    topCommesse,
  } = useMemo(() => {
    if (!rows.length) {
      return {
        todayStats: null,
        yesterdayStats: null,
        last7Stats: null,
        last30Stats: null,
        timelineData: [],
        topCommesse: [],
      };
    }

    const now = new Date();
    const todayKey = computeDateKey(now);
    const yesterday = new Date(
      now.getTime() - 1 * 24 * 60 * 60 * 1000
    );
    const yesterdayKey = computeDateKey(yesterday);

    const cutoff7 = new Date(
      now.getTime() - 6 * 24 * 60 * 60 * 1000
    );
    const cutoff7Key = computeDateKey(cutoff7);

    const cutoff30 = new Date(
      now.getTime() - 29 * 24 * 60 * 60 * 1000
    );
    const cutoff30Key = computeDateKey(cutoff30);

    const byDate = new Map();

    rows.forEach((r) => {
      const key = computeDateKey(r.data);
      if (!key) return;

      if (!byDate.has(key)) {
        byDate.set(key, {
          date: key,
          count: 0,
          totalProd: 0,
          capi: new Set(),
          commesse: new Set(),
        });
      }
      const bucket = byDate.get(key);
      bucket.count += 1;
      bucket.totalProd += Number(r.totale_prodotto || 0);
      if (r.capo_name) bucket.capi.add(r.capo_name);
      if (r.commessa) bucket.commesse.add(r.commessa);
    });

    const toStats = (fromKey, toKey) => {
      let count = 0;
      let totalProd = 0;
      const capi = new Set();
      const commesse = new Set();

      for (const [key, bucket] of byDate.entries()) {
        if (key < fromKey || key > toKey) continue;
        count += bucket.count;
        totalProd += bucket.totalProd;
        bucket.capi.forEach((c) => capi.add(c));
        bucket.commesse.forEach((c) => commesse.add(c));
      }

      return {
        count,
        totalProd,
        capi: capi.size,
        commesse: commesse.size,
      };
    };

    const todayStats = byDate.has(todayKey)
      ? (() => {
          const b = byDate.get(todayKey);
          return {
            count: b.count,
            totalProd: b.totalProd,
            capi: b.capi.size,
            commesse: b.commesse.size,
          };
        })()
      : { count: 0, totalProd: 0, capi: 0, commesse: 0 };

    const yesterdayStats = byDate.has(yesterdayKey)
      ? (() => {
          const b = byDate.get(yesterdayKey);
          return {
            count: b.count,
            totalProd: b.totalProd,
            capi: b.capi.size,
            commesse: b.commesse.size,
          };
        })()
      : { count: 0, totalProd: 0, capi: 0, commesse: 0 };

    const last7Stats = toStats(cutoff7Key, todayKey);
    const last30Stats = toStats(cutoff30Key, todayKey);

    // Timeline pour graphique (30 jours)
    const timelineData = Array.from(byDate.values())
      .map((b) => ({
        date: b.date,
        count: b.count,
        totalProd: b.totalProd,
      }))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );

    // Top commesse par prodotto sur 30 jours
    const commessaMap = new Map();
    rows.forEach((r) => {
      const key = r.commessa || "Senza commessa";
      if (!commessaMap.has(key)) {
        commessaMap.set(key, {
          label: key,
          count: 0,
          totalProd: 0,
        });
      }
      const bucket = commessaMap.get(key);
      bucket.count += 1;
      bucket.totalProd += Number(r.totale_prodotto || 0);
    });

    const topCommesse = Array.from(commessaMap.values())
      .sort((a, b) => b.totalProd - a.totalProd)
      .slice(0, 8);

    return {
      todayStats,
      yesterdayStats,
      last7Stats,
      last30Stats,
      timelineData,
      topCommesse,
    };
  }, [rows]);

  // Deltas en pourcentage (simple ratio aujourd'hui / hier)
  const deltaPresenze =
    todayStats && yesterdayStats && yesterdayStats.count > 0
      ? ((todayStats.count - yesterdayStats.count) /
          yesterdayStats.count) *
        100
      : todayStats && todayStats.count > 0
      ? 100
      : 0;

  const deltaProdotto =
    todayStats &&
    yesterdayStats &&
    yesterdayStats.totalProd > 0
      ? ((todayStats.totalProd - yesterdayStats.totalProd) /
          yesterdayStats.totalProd) *
        100
      : todayStats && todayStats.totalProd > 0
      ? 100
      : 0;

  const deltaCapi =
    todayStats && yesterdayStats && yesterdayStats.capi > 0
      ? ((todayStats.capi - yesterdayStats.capi) /
          yesterdayStats.capi) *
        100
      : todayStats && todayStats.capi > 0
      ? 100
      : 0;

  const deltaCommesse =
    todayStats &&
    yesterdayStats &&
    yesterdayStats.commesse > 0
      ? ((todayStats.commesse - yesterdayStats.commesse) /
          yesterdayStats.commesse) *
        100
      : todayStats && todayStats.commesse > 0
      ? 100
      : 0;

  const hasData = rows.length > 0;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Direzione · Mission Control
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Panoramica &amp; presenze cantiere
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Vista sintetica delle presenze e del prodotto generato
            negli ultimi 30 giorni, basata sull&apos;ARCHIVE v1 dei
            rapportini digitali.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 text-[11px] text-slate-400">
          <div>
            Finestra dati:{" "}
            <span className="font-medium text-slate-200">
              ultimi 30 giorni
            </span>
          </div>
          <div>
            Fonte:{" "}
            <span className="font-medium text-slate-200">
              archive_rapportini_v1
            </span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
            <span className="uppercase tracking-[0.16em]">
              Read-only · dati certificati
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="text-xs text-rose-300 border border-rose-500/40 bg-rose-500/10 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* KPI STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Presenze (≈ rapportini) oggi */}
        <KpiCard
          isDark={isDark}
          tone="emerald"
          label="Presenze oggi (rapportini)"
          value={todayStats ? formatNumber(todayStats.count) : "0"}
          hint={
            last7Stats
              ? `Media 7 giorni: ${formatNumber(
                  last7Stats.count / 7 || 0
                )} rapportini/giorno`
              : ""
          }
          deltaLabel="vs ieri"
          deltaValue={deltaPresenze}
        />

        {/* Prodotto totale oggi */}
        <KpiCard
          isDark={isDark}
          tone="sky"
          label="Prodotto totale oggi"
          value={
            todayStats ? formatNumber(todayStats.totalProd) : "0"
          }
          hint={
            last7Stats
              ? `Media 7 giorni: ${formatNumber(
                  (last7Stats.totalProd || 0) / 7 || 0
                )} u/giorno`
              : ""
          }
          deltaLabel="vs ieri"
          deltaValue={deltaProdotto}
        />

        {/* Capi attivi oggi */}
        <KpiCard
          isDark={isDark}
          tone="amber"
          label="Capi attivi oggi"
          value={todayStats ? formatNumber(todayStats.capi) : "0"}
          hint={
            last30Stats
              ? `Capi unici 30g: ${formatNumber(
                  last30Stats.capi
                )}`
              : ""
          }
          deltaLabel="vs ieri"
          deltaValue={deltaCapi}
        />

        {/* Commesse attive oggi */}
        <KpiCard
          isDark={isDark}
          tone="violet"
          label="Commesse attive oggi"
          value={
            todayStats ? formatNumber(todayStats.commesse) : "0"
          }
          hint={
            last30Stats
              ? `Commesse 30g: ${formatNumber(
                  last30Stats.commesse
                )}`
              : ""
          }
          deltaLabel="vs ieri"
          deltaValue={deltaCommesse}
        />
      </section>

      {/* ZONE GRAPHIQUES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline production (2/3) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Timeline produzione
              </div>
              <div className="text-xs text-slate-400">
                Numero rapportini e prodotto totale per giorno
                (ultimi 30).
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {timelineData.length} giorni con dati
            </div>
          </div>

          {!hasData ? (
            <div className="text-xs text-slate-500">
              Nessun dato disponibile negli ultimi 30 giorni.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      backgroundColor: "#020617",
                      borderColor: "#1e293b",
                    }}
                    labelFormatter={(d) =>
                      new Date(d).toLocaleDateString("it-IT")
                    }
                    formatter={(value, name) => {
                      if (name === "Prodotto") {
                        return [formatNumber(value), name];
                      }
                      return [value, name];
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    name="Rapportini"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalProd"
                    name="Prodotto"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top commesse (1/3) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Top commesse · 30 giorni
            </div>
            <div className="text-xs text-slate-400">
              Ordinato per prodotto totale dai rapportini v1.
            </div>
          </div>

          {!hasData ? (
            <div className="text-xs text-slate-500">
              Nessuna commessa con dati.
            </div>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCommesse}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        backgroundColor: "#020617",
                        borderColor: "#1e293b",
                      }}
                      formatter={(value, name) => {
                        if (name === "Prodotto") {
                          return [formatNumber(value), name];
                        }
                        return [value, name];
                      }}
                    />
                    <Bar
                      dataKey="totalProd"
                      name="Prodotto"
                      fill="#38bdf8"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                {topCommesse.slice(0, 4).map((c) => (
                  <div
                    key={c.label}
                    className="border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {c.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Rapportini:{" "}
                        <span className="font-semibold text-slate-200">
                          {c.count}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">
                        Prodotto
                      </div>
                      <div className="text-sm font-semibold text-sky-300">
                        {formatNumber(c.totalProd)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* STATE LOADING */}
      {loading && (
        <div className="text-[11px] text-slate-500">
          Caricamento metriche direzione…
        </div>
      )}
    </div>
  );
}
