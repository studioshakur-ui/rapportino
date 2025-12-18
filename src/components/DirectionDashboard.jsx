// /src/components/DirectionDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

// Recharts – timeline
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// ECharts – INCA
import ReactECharts from "echarts-for-react";

// Utils dates / format
function toISODate(d) {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function formatDateLabel(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0;
    const normalized = s
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(
    Number(value)
  );
}

export default function DirectionDashboard() {
  const { profile } = useAuth();

  // Filtres globaux
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [costrFilter, setCostrFilter] = useState("");
  const [commessaFilter, setCommessaFilter] = useState("");

  // État data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rapportiniCurrent, setRapportiniCurrent] = useState([]);
  const [rapportiniPrevious, setRapportiniPrevious] = useState([]);
  const [incaTeorico, setIncaTeorico] = useState([]);

  // ─────────────────────────────
  // INIT : dernière semaine glissante
  // ─────────────────────────────
  useEffect(() => {
    if (dateFrom || dateTo) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
  }, [dateFrom, dateTo]);

  // ─────────────────────────────
  // CHARGEMENT des données
  // ─────────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (!dateFrom || !dateTo) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) Fenêtre actuelle
        let qNow = supabase
          .from("rapportini")
          .select("*")
          .gte("report_date", dateFrom)
          .lte("report_date", dateTo)
          .order("report_date", { ascending: true });

        if (costrFilter.trim()) qNow = qNow.eq("costr", costrFilter.trim());
        if (commessaFilter.trim())
          qNow = qNow.eq("commessa", commessaFilter.trim());

        const { data: rapNow, error: rapNowErr } = await qNow;
        if (rapNowErr) throw rapNowErr;

        // 2) Fenêtre précédente (même durée juste avant) pour le Δ
        const fromDateObj = new Date(dateFrom);
        const toDateObj = new Date(dateTo);
        const diffMs = toDateObj.getTime() - fromDateObj.getTime();

        const prevTo = new Date(fromDateObj.getTime() - 24 * 60 * 60 * 1000);
        const prevFrom = new Date(prevTo.getTime() - diffMs);

        let qPrev = supabase
          .from("rapportini")
          .select("*")
          .gte("report_date", toISODate(prevFrom))
          .lte("report_date", toISODate(prevTo));

        if (costrFilter.trim()) qPrev = qPrev.eq("costr", costrFilter.trim());
        if (commessaFilter.trim())
          qPrev = qPrev.eq("commessa", commessaFilter.trim());

        const { data: rapPrev, error: rapPrevErr } = await qPrev;
        if (rapPrevErr) throw rapPrevErr;

        // 3) INCA (agrégé) – vue dédiée Direction
        let incaQ = supabase.from("direzione_inca_teorico").select("*");
        if (costrFilter.trim()) incaQ = incaQ.eq("costr", costrFilter.trim());
        if (commessaFilter.trim())
          incaQ = incaQ.eq("commessa", commessaFilter.trim());

        const { data: incaRows, error: incaErr } = await incaQ;
        if (incaErr) throw incaErr;

        if (!cancelled) {
          setRapportiniCurrent(rapNow || []);
          setRapportiniPrevious(rapPrev || []);
          setIncaTeorico(incaRows || []);
        }
      } catch (err) {
        console.error("[DirectionDashboard] Errore caricamento dati:", err);
        if (!cancelled) {
          setError(
            "Errore nel caricamento dei dati Direzione. Riprova o contatta l’Ufficio."
          );
          setRapportiniCurrent([]);
          setRapportiniPrevious([]);
          setIncaTeorico([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profile, dateFrom, dateTo, costrFilter, commessaFilter]);

  // ───────────────────────────
  // KPI PRINCIPAUX
  // ───────────────────────────
  const kpi = useMemo(() => {
    const currCount = rapportiniCurrent.length;
    const prevCount = rapportiniPrevious.length;

    const sumProd = (rows) =>
      rows.reduce((sum, r) => sum + toNumber(r.prodotto_totale), 0);

    const currProd = sumProd(rapportiniCurrent);
    const prevProd = sumProd(rapportiniPrevious);

    const currAvg = currCount ? currProd / currCount : 0;
    const prevAvg = prevCount ? prevProd / prevCount : 0;

    let incaPrevisti = 0;
    let incaRealizzati = 0;
    let incaPosati = 0;

    let caviTotali = 0;
    let caviConPrevisti = 0;
    let caviConRealizzati = 0;

    incaTeorico.forEach((row) => {
      incaPrevisti += toNumber(row.metri_previsti_totali);
      incaRealizzati += toNumber(row.metri_realizzati);
      incaPosati += toNumber(row.metri_posati);

      caviTotali += Number(row.cavi_totali || 0);
      caviConPrevisti += Number(row.cavi_con_metri_previsti || 0);
      caviConRealizzati += Number(row.cavi_con_metri_realizzati || 0);
    });

    const incaCover =
      incaPrevisti > 0 ? Math.min(100, (incaRealizzati / incaPrevisti) * 100) : 0;

    const deltaProd = currProd - prevProd;
    const deltaProdPerc = prevProd > 0 ? (deltaProd / prevProd) * 100 : null;

    const pctPrevistiCompilati =
      caviTotali > 0 ? (caviConPrevisti / caviTotali) * 100 : 0;

    const pctRealizzatiCompilati =
      caviTotali > 0 ? (caviConRealizzati / caviTotali) * 100 : 0;

    const incaDataQuality =
      caviTotali > 0
        ? {
            caviTotali,
            caviConPrevisti,
            caviConRealizzati,
            pctPrevistiCompilati,
            pctRealizzatiCompilati,
          }
        : null;

    return {
      currCount,
      prevCount,
      currProd,
      prevProd,
      currAvg,
      prevAvg,
      incaPrevisti,
      incaRealizzati,
      incaPosati,
      incaCover,
      incaDataQuality,
      deltaProd,
      deltaProdPerc,
    };
  }, [rapportiniCurrent, rapportiniPrevious, incaTeorico]);

  // ───────────────────────────
  // TIMELINE – Recharts
  // ───────────────────────────
  const timelineData = useMemo(() => {
    if (!rapportiniCurrent.length) return [];

    const map = new Map();

    rapportiniCurrent.forEach((r) => {
      const key = r.report_date || r.data || r.created_at?.slice(0, 10);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          date: key,
          label: formatDateLabel(key),
          rapportini: 0,
          prodotto: 0,
        });
      }

      const entry = map.get(key);
      entry.rapportini += 1;
      entry.prodotto += toNumber(r.prodotto_totale);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [rapportiniCurrent]);

  // ───────────────────────────
  // INCA – ECharts (anti-bruit)
  // ───────────────────────────
  const incaOption = useMemo(() => {
    const hasRows = incaTeorico.length > 0;
    const hasAnyMetric =
      toNumber(kpi.incaPrevisti) > 0 ||
      toNumber(kpi.incaRealizzati) > 0 ||
      toNumber(kpi.incaPosati) > 0;

    if (!hasRows) {
      return {
        title: {
          text: "INCA · nessun dato",
          textStyle: { color: "#9ca3af", fontSize: 12 },
        },
        grid: { left: 40, right: 10, top: 30, bottom: 30 },
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
        backgroundColor: "transparent",
      };
    }

    if (!hasAnyMetric) {
      const q = kpi.incaDataQuality;
      const qLine = q
        ? `Import parziale · ${formatNumber(q.pctPrevistiCompilati)}% previsti · ${formatNumber(
            q.pctRealizzatiCompilati
          )}% realizzati`
        : "Import parziale";

      return {
        title: {
          text: "INCA · dati parziali",
          subtext: qLine,
          textStyle: { color: "#e5e7eb", fontSize: 12 },
          subtextStyle: { color: "#9ca3af", fontSize: 11 },
          left: "center",
          top: 10,
        },
        grid: { left: 40, right: 10, top: 70, bottom: 30 },
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
        backgroundColor: "transparent",
      };
    }

    const sorted = [...incaTeorico].sort(
      (a, b) =>
        toNumber(b.metri_previsti_totali) - toNumber(a.metri_previsti_totali)
    );
    const top = sorted.slice(0, 12);

    const labels = top.map((row) => {
      const file = row.nome_file || "";
      if (file) return file.length > 26 ? `${file.slice(0, 26)}…` : file;
      if (row.commessa)
        return `${(row.costr || "").trim()} · ${String(row.commessa).trim()}`.trim();
      if (row.costr) return String(row.costr).trim();
      if (row.caricato_il) return formatDateLabel(row.caricato_il);
      return "";
    });

    const previsti = top.map((r) => toNumber(r.metri_previsti_totali));
    const realizzati = top.map((r) => toNumber(r.metri_realizzati));
    const posati = top.map((r) => toNumber(r.metri_posati));

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: {
        data: ["Previsti", "Realizzati", "Posati"],
        textStyle: { color: "#e5e7eb", fontSize: 11 },
      },
      grid: { left: 40, right: 10, top: 40, bottom: 40 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: "#9ca3af", fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: "#1f2937" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#9ca3af", fontSize: 10 },
        axisLine: { lineStyle: { color: "#1f2937" } },
        splitLine: { lineStyle: { color: "#111827" } },
      },
      series: [
        { name: "Previsti", type: "bar", data: previsti, emphasis: { focus: "series" } },
        { name: "Realizzati", type: "bar", data: realizzati, emphasis: { focus: "series" } },
        { name: "Posati", type: "line", data: posati, smooth: true },
      ],
      color: ["#38bdf8", "#22c55e", "#f97316"],
    };
  }, [incaTeorico, kpi]);

  // ───────────────────────────
  // RISKS & ACTIONS (génération)
  // ───────────────────────────
  const risks = useMemo(() => {
    const out = [];

    if (kpi.prevProd > 0 && kpi.deltaProdPerc != null && kpi.deltaProdPerc < -10) {
      out.push({
        level: "ALTA",
        title: "Produzione in calo",
        detail: `-${formatNumber(Math.abs(kpi.deltaProdPerc))}%`,
        hint: "Verifica commesse critiche",
      });
    }

    if (kpi.currCount > 0 && kpi.currCount < kpi.prevCount) {
      out.push({
        level: "MEDIA",
        title: "Meno rapportini",
        detail: `${kpi.currCount} vs ${kpi.prevCount}`,
        hint: "Controlla giornate mancanti",
      });
    }

    if (kpi.incaCover > 0 && kpi.incaCover < 50) {
      out.push({
        level: "ALTA",
        title: "Copertura INCA bassa",
        detail: `${formatNumber(kpi.incaCover)}%`,
        hint: "Recovery mirato",
      });
    }

    if (kpi.incaDataQuality && kpi.incaPrevisti === 0 && kpi.incaRealizzati === 0) {
      out.push({
        level: "MEDIA",
        title: "INCA parziale",
        detail: `${formatNumber(kpi.incaDataQuality.pctPrevistiCompilati)}% prev · ${formatNumber(
          kpi.incaDataQuality.pctRealizzatiCompilati
        )}% real`,
        hint: "Note import / parsing",
      });
    }

    if (!out.length && (rapportiniCurrent.length || incaTeorico.length)) {
      out.push({
        level: "BASSA",
        title: "Sotto controllo",
        detail: "OK",
        hint: "",
      });
    }

    if (!out.length) {
      out.push({
        level: "INFO",
        title: "Nessun dato",
        detail: "Range vuoto",
        hint: "",
      });
    }

    return out.slice(0, 2);
  }, [kpi, rapportiniCurrent.length, incaTeorico.length]);

  const nextActions = useMemo(() => {
    const actions = [];

    if (kpi.deltaProdPerc != null && kpi.deltaProdPerc < -10) {
      actions.push("Allineamento Capi oggi");
    }

    if (kpi.incaCover > 0 && kpi.incaCover < 60) {
      actions.push("Review INCA–campo");
    }

    if (kpi.incaDataQuality && kpi.incaPrevisti === 0 && kpi.incaRealizzati === 0) {
      actions.push("Fix import INCA (metri)");
    }

    if (!actions.length && rapportiniCurrent.length) {
      actions.push("Nessuna azione richiesta");
    }

    if (!actions.length) {
      actions.push("Seleziona un range con dati");
    }

    return actions.slice(0, 2);
  }, [kpi, rapportiniCurrent.length]);

  // ───────────────────────────
  // BRIEF DIREZIONE (ultra-compact)
  // ───────────────────────────
  const brief = useMemo(() => {
    const r0 = risks[0] || { level: "INFO", title: "Nessun dato", detail: "" };
    const a0 = nextActions[0] || "—";

    const level =
      r0.level === "ALTA" ? "ALTA" : r0.level === "MEDIA" ? "MEDIA" : "BASSA";

    const levelTone =
      level === "ALTA"
        ? "border-rose-500/60 text-rose-200 bg-rose-900/20"
        : level === "MEDIA"
        ? "border-amber-400/60 text-amber-200 bg-amber-900/20"
        : "border-emerald-400/60 text-emerald-200 bg-emerald-900/20";

    const riskLine =
      r0.level === "BASSA"
        ? "Stato: sotto controllo · Rischio: BASSO"
        : `${r0.title}${r0.detail ? ` · ${r0.detail}` : ""} · Livello: ${level}`;

    const actionLine =
      a0 === "Nessuna azione richiesta" ? "Azione: nessuna" : `Azione: ${a0}`;

 return {
  riskLine,
  actionLine,
  levelTone,
  level,
};



  }, [risks, nextActions]);

  // ───────────────────────────
  // RENDER
  // ───────────────────────────
  return (
    <div className="space-y-5">
      {/* HEADER + FILTRES TEMPS */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Direzione · CNCS / CORE
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
            Dashboard Direzione
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2 text-[11px]">
          <div className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/70 bg-emerald-900/40 text-emerald-100">
              Sola lettura
            </span>
            {kpi.incaDataQuality && kpi.incaPrevisti === 0 && kpi.incaRealizzati === 0 && (
              <span className="px-2 py-0.5 rounded-full border border-amber-400/70 bg-amber-900/30 text-amber-100">
                INCA parziale
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Finestra:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100"
            />
            <span className="text-slate-500">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100"
            />
          </div>
        </div>
      </header>

      {/* FILTRES NAVIRE / COMMESSA */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">COSTR</span>
          <input
            type="text"
            value={costrFilter}
            onChange={(e) => setCostrFilter(e.target.value)}
            placeholder="es. 6368"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">Commessa</span>
          <input
            type="text"
            value={commessaFilter}
            onChange={(e) => setCommessaFilter(e.target.value)}
            placeholder="es. SDC"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCostrFilter("");
              setCommessaFilter("");
            }}
            className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/80 text-[11px] text-slate-300 hover:bg-slate-900"
          >
            Reset filtri
          </button>
        </div>
      </section>

      {/* MESSAGES ERREUR / LOADING */}
      {error && (
        <div className="rounded-xl border border-rose-500/60 bg-rose-900/30 px-4 py-2 text-[12px] text-rose-100">
          {error}
        </div>
      )}
      {loading && !error && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-[12px] text-slate-300">
          Caricamento…
        </div>
      )}

      {/* STRIP KPI (6 tuiles) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Rapportini
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{kpi.currCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {kpi.prevCount ? `Prev: ${kpi.prevCount}` : "Prev: —"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Prodotto
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">
            {formatNumber(kpi.currProd)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>vs prev</span>
            {kpi.deltaProdPerc != null && (
              <span
                className={[
                  "ml-1 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px]",
                  kpi.deltaProdPerc > 0
                    ? "border-emerald-500 text-emerald-300"
                    : "border-rose-500 text-rose-300",
                ].join(" ")}
              >
                {kpi.deltaProdPerc > 0 ? "▲" : "▼"}{" "}
                {formatNumber(Math.abs(kpi.deltaProdPerc))}%
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Media
          </div>
          <div className="mt-1 text-2xl font-semibold text-sky-300">{formatNumber(kpi.currAvg)}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {kpi.prevAvg ? `Prev: ${formatNumber(kpi.prevAvg)}` : "Prev: —"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            INCA prev
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{formatNumber(kpi.incaPrevisti)}</div>
          <div className="mt-1 text-[11px] text-slate-500">metri</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            INCA real
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">{formatNumber(kpi.incaRealizzati)}</div>
          <div className="mt-1 text-[11px] text-slate-500">metri</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Copertura
          </div>
          <div className="mt-1 text-2xl font-semibold text-fuchsia-300">
            {kpi.incaCover ? `${formatNumber(kpi.incaCover)}%` : "—"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">stimata</div>
        </div>
      </section>

      {/* LIGNE PRINCIPALE : Timeline + INCA */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Timeline
            </div>
          </div>

          <div className="h-60 w-full">
            {timelineData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#e5e7eb" }} />
                  <Bar yAxisId="left" dataKey="prodotto" name="Prodotto" fill="#38bdf8" barSize={18} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rapportini"
                    name="Rapportini"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
                Nessun dato
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              INCA
            </div>
          </div>

          <div className="h-60 w-full">
            <ReactECharts option={incaOption} style={{ width: "100%", height: "100%" }} notMerge lazyUpdate />
          </div>
        </div>
      </section>

      {/* BRIEF DIREZIONE (ultra-compact, zéro bruit) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Brief Direzione
          </div>
          <span
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
              risks[0]?.level === "ALTA"
                ? "border-rose-500/60 text-rose-200 bg-rose-900/20"
                : risks[0]?.level === "MEDIA"
                ? "border-amber-400/60 text-amber-200 bg-amber-900/20"
                : "border-emerald-400/60 text-emerald-200 bg-emerald-900/20",
            ].join(" ")}
          >
            {risks[0]?.level === "ALTA"
              ? "ALTA"
              : risks[0]?.level === "MEDIA"
              ? "MEDIA"
              : "BASSA"}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <div className="text-[13px] text-slate-100 font-medium">
            {risks[0]?.level === "BASSA"
              ? "Stato: sotto controllo · Rischio: BASSO"
              : `${risks[0]?.title || "Rischio"}${risks[0]?.detail ? ` · ${risks[0].detail}` : ""}`}
          </div>

          <div className="text-[12px] text-slate-300">
            {nextActions[0] === "Nessuna azione richiesta"
              ? "Azione: nessuna"
              : `Azione: ${nextActions[0] || "—"}`}
          </div>
        </div>
      </section>
    </div>
  );
}
