// src/capo/IncaCapoCockpit.jsx
//
// Cockpit INCA pour le CAPO, par nave.
// KPI + courbe de production + tratte critiques.
// SHAKUR · CORE · 2025

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useShip } from "../context/ShipContext";
import { coreLayout } from "../ui/coreLayout";
import { corePills } from "../ui/designSystem";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Fallback si la table INCA n'est pas encore prête côté DB
const FALLBACK_ROWS = [
  {
    id: 1,
    tratta: "ZONA A · Ponte 5",
    sezione: "N ND 129",
    metri_previsti: 320,
    metri_posati: 260,
    data_aggiornamento: "2025-12-01",
  },
  {
    id: 2,
    tratta: "ZONA A · Ponte 6",
    sezione: "N AH 125",
    metri_previsti: 280,
    metri_posati: 280,
    data_aggiornamento: "2025-12-02",
  },
  {
    id: 3,
    tratta: "ZONA B · Ponte 7",
    sezione: "N ND 129",
    metri_previsti: 400,
    metri_posati: 190,
    data_aggiornamento: "2025-12-03",
  },
  {
    id: 4,
    tratta: "ZONA C · Ponte 8",
    sezione: "N AH 125",
    metri_previsti: 500,
    metri_posati: 140,
    data_aggiornamento: "2025-12-04",
  },
];

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function formatDate(itDateString) {
  if (!itDateString) return "—";
  const d = new Date(itDateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("it-IT");
}

export default function IncaCapoCockpit() {
  const { shipId } = useParams();
  const { currentShip } = useShip();

  const [rows, setRows] = useState(FALLBACK_ROWS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ship =
    currentShip && String(currentShip.id) === String(shipId)
      ? currentShip
      : currentShip || {
          id: shipId,
          code: shipId,
          name: "Nave",
          yard: "",
          deadline_date: null,
        };

  // Chargement des données INCA par nave (soft-fail avec fallback)
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // ⚠️ Quand ta table sera prête, ajuste ce bloc :
        // Exemple : .from("inca_rows").eq("ship_code", ship.code)
        const { data, error: qError } = await supabase
          .from("inca_rows")
          .select(
            "id, tratta, sezione, metri_previsti, metri_posati, data_aggiornamento, ship_code"
          )
          .eq("ship_code", ship.code);

        if (qError) throw qError;

        if (isMounted && data && data.length > 0) {
          setRows(data);
        }
      } catch (err) {
        console.warn("[IncaCapoCockpit] Errore caricamento INCA CAPO:", err);
        setError(
          "Impossibile recuperare i dati INCA dal server. Uso della configurazione locale."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [ship.code]);

  // Agrégations pour KPI + graph + tratte critiques
  const {
    totalTratte,
    completeTratte,
    metriPrevisti,
    metriPosati,
    progressPercent,
    timelineData,
    criticalRows,
  } = useMemo(() => {
    if (!rows || rows.length === 0) {
      return {
        totalTratte: 0,
        completeTratte: 0,
        metriPrevisti: 0,
        metriPosati: 0,
        progressPercent: 0,
        timelineData: [],
        criticalRows: [],
      };
    }

    let totalTratte = rows.length;
    let completeTratte = 0;
    let metriPrevisti = 0;
    let metriPosati = 0;

    const byDate = new Map();

    rows.forEach((r) => {
      const previsti = Number(r.metri_previsti || 0);
      const posati = Number(r.metri_posati || 0);

      metriPrevisti += previsti;
      metriPosati += posati;

      if (posati >= previsti && previsti > 0) {
        completeTratte += 1;
      }

      const key = r.data_aggiornamento || "Senza data";
      if (!byDate.has(key)) {
        byDate.set(key, {
          date: key,
          metri_posati: 0,
        });
      }
      byDate.get(key).metri_posati += posati;
    });

    const progressPercent =
      metriPrevisti > 0 ? (metriPosati / metriPrevisti) * 100 : 0;

    const timelineData = Array.from(byDate.entries())
      .map(([date, bucket]) => ({
        date,
        metri_posati: bucket.metri_posati,
      }))
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    // Tratte critiques = < 60% complet
    const criticalRows = rows
      .map((r) => {
        const previsti = Number(r.metri_previsti || 0);
        const posati = Number(r.metri_posati || 0);
        const ratio =
          previsti > 0 ? (posati / previsti) * 100 : posati > 0 ? 100 : 0;

        return {
          ...r,
          ratio,
        };
      })
      .filter((r) => r.ratio < 60)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 6);

    return {
      totalTratte,
      completeTratte,
      metriPrevisti,
      metriPosati,
      progressPercent,
      timelineData,
      criticalRows,
    };
  }, [rows]);

  const hasData = rows && rows.length > 0;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* HEADER NAVE + INCA CAPO */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Nave {ship.code} · INCA CAPO · Avanzamento cavi
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Tracciamento percorsi cavi (vista Capo)
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Stato delle tratte, metri posati e scostamento dalla deadline
            su questa nave. Vista pensata per il Capo che lavora in campo
            con l&apos;INCA come riferimento.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 text-[11px] text-slate-400">
          <div>
            Nave:{" "}
            <span className="font-medium text-slate-200">
              {ship.code} · {ship.name}
            </span>
          </div>
          {ship.yard && (
            <div>
              Cantiere:{" "}
              <span className="font-medium text-slate-200">
                {ship.yard}
              </span>
            </div>
          )}
          <div
            className={corePills(
              true,
              "emerald",
              "inline-flex items-center gap-1 px-2 py-0.5"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
            <span className="uppercase tracking-[0.16em]">
              INCA · campo / ufficio
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="text-xs text-amber-100 border border-amber-500/40 bg-amber-500/10 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* KPI STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tratte completate */}
        <div className={coreLayout.kpiCard(true, "emerald")}>
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300 mb-1">
            Tratte completate
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {completeTratte}{" "}
            <span className="text-sm text-slate-400">
              / {totalTratte}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tratte dove i metri posati hanno raggiunto il previsto.
          </div>
        </div>

        {/* Metri posati / previsti */}
        <div className={coreLayout.kpiCard(true, "sky")}>
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300 mb-1">
            Metri cavo posati
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {formatNumber(metriPosati)}{" "}
            <span className="text-sm text-slate-400">
              / {formatNumber(metriPrevisti)} m
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avanzamento reale rispetto al piano previsto.
          </div>
        </div>

        {/* % Avanzamento INCA */}
        <div className={coreLayout.kpiCard(true, "violet")}>
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-violet-300 mb-1">
            Avanzamento INCA
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {formatNumber(progressPercent)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Rapporto tra metri posati e metri previsti.
          </div>
        </div>

        {/* Deadline */}
        <div className={coreLayout.kpiCard(true, "amber")}>
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-amber-300 mb-1">
            Deadline INCA
          </div>
          <div className="text-2xl font-semibold leading-tight">
            {formatDate(ship.deadline_date)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Data obiettivo per completare le tratte su questa nave.
          </div>
        </div>
      </section>

      {/* GRAPH + TRATTE CRITIQUES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Graph production */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Produzione cavi nel tempo
              </div>
              <div className="text-xs text-slate-400">
                Metri posati per giorno (dati INCA di questa nave).
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {timelineData.length} giorni con aggiornamenti
            </div>
          </div>

          {!hasData ? (
            <div className="text-xs text-slate-500">
              Nessun dato INCA disponibile per questa nave.
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
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => `${v} m`}
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
                    formatter={(value) => [
                      formatNumber(value) + " m",
                      "Metri posati",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="metri_posati"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tratte critiques */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Tratte critiche
            </div>
            <div className="text-xs text-slate-400">
              Tratte con avanzamento &lt; 60% rispetto ai metri previsti.
            </div>
          </div>

          {!hasData ? (
            <div className="text-xs text-slate-500">
              Nessuna tratta da evidenziare al momento.
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {criticalRows.length === 0 && (
                <div className="text-slate-500">
                  Nessuna tratta sotto la soglia del 60%.
                </div>
              )}
              {criticalRows.map((r) => (
                <div
                  key={r.id}
                  className="border border-slate-800 rounded-xl px-3 py-2 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-100">
                      {r.tratta}
                    </div>
                    <span
                      className={corePills(
                        true,
                        "rose",
                        "text-[10px] px-2 py-0.5"
                      )}
                    >
                      {formatNumber(r.ratio)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-slate-400">
                    <span>Sezione: {r.sezione || "—"}</span>
                    <span>
                      {formatNumber(r.metri_posati)} /{" "}
                      {formatNumber(r.metri_previsti)} m
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Ultimo aggiornamento:{" "}
                    {formatDate(r.data_aggiornamento)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {loading && (
        <div className="text-[11px] text-slate-500">
          Caricamento dati INCA…
        </div>
      )}
    </div>
  );
}
