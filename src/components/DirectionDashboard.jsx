// /src/components/DirectionDashboard.jsx
//
// PATCH (go code 1): replace raw Recharts/ECharts usage with CORE Chart Kit wrappers.
// - No commercial libs.
// - Unified theme/tooltip/empty-state.
// - Keeps your existing data loading & KPI logic intact.
// NOTE: This file is complete (full content) and assumes your existing queries remain as-is.

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

import {
  CoreChartCard,
  CoreBarLineCombo,
  CoreEChart,
  CoreLineChart,
  CORE_CHART_THEME,
  formatNumberIT,
} from "./charts";

// Utils dates / format
function toISODate(d) {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function parseISODate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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

function cutoffNextDay0830Z(reportDateISO) {
  const d = parseISODate(reportDateISO);
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
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

  // Rapportini (vue enrichie) — canonique pour noms capo
  const [rapportiniCurrent, setRapportiniCurrent] = useState([]);
  const [rapportiniPrevious, setRapportiniPrevious] = useState([]);

  // INCA
  const [incaTeorico, setIncaTeorico] = useState([]);

  // Produzioni (canonique): breakdown par descrizione sur la fenêtre
  const [produzioniAggCurrent, setProduzioniAggCurrent] = useState([]);
  const [produzioniAggPrevious, setProduzioniAggPrevious] = useState([]);

  // KPI heures (facts tokenisés) — et drilldown
  const [hoursFactsCurrent, setHoursFactsCurrent] = useState([]);
  const [hoursFactsPrevious, setHoursFactsPrevious] = useState([]);

  // KPI indice produttività (daily) su previsto (normalisé)
  const [prodDailyCurrent, setProdDailyCurrent] = useState([]); // [{report_date, previsto_eff, prodotto_alloc}]
  const [prodDailyPrevious, setProdDailyPrevious] = useState([]);

  // Retards capi (deadline J+1 08:30)
  const [capiDelayDaily, setCapiDelayDaily] = useState([]);

  // INIT : dernière semaine glissante
  useEffect(() => {
    if (dateFrom || dateTo) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
  }, [dateFrom, dateTo]);

  // CHARGEMENT des données
  useEffect(() => {
    if (!profile) return;
    if (!dateFrom || !dateTo) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) Fenêtre actuelle (rapportini headers) — vue enrichie
        let qNow = supabase
          .from("rapportini_with_capo_v1")
          .select(
            "id, report_date, created_at, updated_at, status, costr, commessa, capo_id, capo_display_name, capo_email, capo_app_role"
          )
          .gte("report_date", dateFrom)
          .lte("report_date", dateTo)
          .order("report_date", { ascending: true });

        if (costrFilter.trim()) qNow = qNow.eq("costr", costrFilter.trim());
        if (commessaFilter.trim()) qNow = qNow.eq("commessa", commessaFilter.trim());

        const { data: rapNow, error: rapNowErr } = await qNow;
        if (rapNowErr) throw rapNowErr;

        // 2) Fenêtre précédente (même durée juste avant) pour le Δ
        const fromDateObj = new Date(dateFrom);
        const toDateObj = new Date(dateTo);
        const diffMs = toDateObj.getTime() - fromDateObj.getTime();

        const prevTo = new Date(fromDateObj.getTime() - 24 * 60 * 60 * 1000);
        const prevFrom = new Date(prevTo.getTime() - diffMs);

        let qPrev = supabase
          .from("rapportini_with_capo_v1")
          .select(
            "id, report_date, created_at, updated_at, status, costr, commessa, capo_id, capo_display_name, capo_email, capo_app_role"
          )
          .gte("report_date", toISODate(prevFrom))
          .lte("report_date", toISODate(prevTo));

        if (costrFilter.trim()) qPrev = qPrev.eq("costr", costrFilter.trim());
        if (commessaFilter.trim()) qPrev = qPrev.eq("commessa", commessaFilter.trim());

        const { data: rapPrev, error: rapPrevErr } = await qPrev;
        if (rapPrevErr) throw rapPrevErr;

        // 3) INCA (agrégé) – vue dédiée Direction
        let incaQ = supabase.from("direzione_inca_teorico").select("*");
        if (costrFilter.trim()) incaQ = incaQ.eq("costr", costrFilter.trim());
        if (commessaFilter.trim()) incaQ = incaQ.eq("commessa", commessaFilter.trim());

        const { data: incaRows, error: incaErr } = await incaQ;
        if (incaErr) throw incaErr;

        // 4) Produzioni (canonique) – agrège par descrizione depuis rapportino_rows
        const nowIds = (rapNow || []).map((r) => r.id).filter(Boolean);
        const prevIds = (rapPrev || []).map((r) => r.id).filter(Boolean);

        async function aggByDescrizione(ids) {
          if (!ids.length) return [];
          const { data: rows, error: e } = await supabase
            .from("rapportino_rows")
            .select("rapportino_id, descrizione, prodotto")
            .in("rapportino_id", ids);

          if (e) return [];

          const m = new Map(); // descr -> { descrizione, prodotto_sum, righe }
          (rows || []).forEach((rr) => {
            const k = (rr?.descrizione ?? "—").toString().trim() || "—";
            const obj = m.get(k) || { descrizione: k, prodotto_sum: 0, righe: 0 };
            obj.prodotto_sum += toNumber(rr?.prodotto);
            obj.righe += 1;
            m.set(k, obj);
          });

          return Array.from(m.values()).sort((a, b) => b.prodotto_sum - a.prodotto_sum);
        }

        const [aggNow, aggPrev] = await Promise.all([aggByDescrizione(nowIds), aggByDescrizione(prevIds)]);

        // 5) Facts heures (tokenisés) — direzione_operator_facts_v1
        async function loadHoursFacts(rangeFrom, rangeTo) {
          let q = supabase
            .from("direzione_operator_facts_v1")
            .select("report_date, manager_id, capo_id, ship_id, costr, commessa, ship_code, ship_name, operator_id, tempo_hours, unit")
            .gte("report_date", rangeFrom)
            .lte("report_date", rangeTo);

          if (costrFilter.trim()) q = q.eq("costr", costrFilter.trim());
          if (commessaFilter.trim()) q = q.eq("commessa", commessaFilter.trim());

          const { data, error: e } = await q;
          if (e) throw e;
          return data || [];
        }

        // 5bis) KPI Indice Produttività (daily) — v2
        function normalizeProdFromGlobalDayV2(rows) {
          return (rows || []).map((r) => ({
            report_date: r?.report_date ? String(r.report_date) : null,
            previsto_eff: toNumber(r?.total_previsto_eff),
            prodotto_alloc: toNumber(r?.total_prodotto_alloc),
          }));
        }

        async function loadProdDaily(rangeFrom, rangeTo) {
          let q = supabase
            .from("kpi_operator_global_day_v2")
            .select("report_date, total_previsto_eff, total_prodotto_alloc")
            .gte("report_date", rangeFrom)
            .lte("report_date", rangeTo);

          if (costrFilter.trim()) q = q.eq("costr", costrFilter.trim());
          if (commessaFilter.trim()) q = q.eq("commessa", commessaFilter.trim());

          const { data, error: e } = await q;
          if (e) throw e;
          return normalizeProdFromGlobalDayV2(data);
        }

        const [factsNow, factsPrev, prodNow, prodPrev] = await Promise.all([
          loadHoursFacts(dateFrom, dateTo),
          loadHoursFacts(toISODate(prevFrom), toISODate(prevTo)),
          loadProdDaily(dateFrom, dateTo),
          loadProdDaily(toISODate(prevFrom), toISODate(prevTo)),
        ]);

        // 6) Retards capi J+1 08:30
        async function loadCapiDelays(rangeFrom, rangeTo, rapListNow) {
          let pQ = supabase
            .from("manager_plans")
            .select("id, manager_id, plan_date, period_type, status, year_iso, week_iso")
            .gte("plan_date", rangeFrom)
            .lte("plan_date", rangeTo)
            .eq("period_type", "DAY")
            .eq("status", "FROZEN");

          const { data: plans, error: pErr } = await pQ;
          if (pErr) throw pErr;

          const planIds = (plans || []).map((p) => p.id).filter(Boolean);
          if (!planIds.length) return [];

          const { data: slots, error: sErr } = await supabase
            .from("plan_capo_slots")
            .select("id, plan_id, capo_id")
            .in("plan_id", planIds);

          if (sErr) throw sErr;

          const planById = new Map();
          (plans || []).forEach((p) => planById.set(p.id, p));

          const expectedByDate = new Map(); // date -> Set(capo_id)
          (slots || []).forEach((s) => {
            const p = planById.get(s.plan_id);
            if (!p?.plan_date || !s?.capo_id) return;
            const d = p.plan_date;
            if (!expectedByDate.has(d)) expectedByDate.set(d, new Set());
            expectedByDate.get(d).add(s.capo_id);
          });

          const reportByDayCapo = new Map(); // `${date}::${capo}` -> created_at
          (rapListNow || []).forEach((r) => {
            const d = r.report_date;
            const c = r.capo_id;
            if (!d || !c) return;
            const k = `${d}::${c}`;
            const createdAt = r.created_at ? new Date(r.created_at) : null;
            if (!reportByDayCapo.has(k)) reportByDayCapo.set(k, createdAt);
            else {
              const prev = reportByDayCapo.get(k);
              if (prev && createdAt && createdAt < prev) reportByDayCapo.set(k, createdAt);
              if (!prev && createdAt) reportByDayCapo.set(k, createdAt);
            }
          });

          const allCapoIds = Array.from(expectedByDate.values()).flatMap((s) => Array.from(s));
          const uniqueCapoIds = Array.from(new Set(allCapoIds));

          let capoNameById = new Map();
          if (uniqueCapoIds.length) {
            const { data: capiProfiles } = await supabase
              .from("profiles")
              .select("id, full_name, display_name, email")
              .in("id", uniqueCapoIds);

            (capiProfiles || []).forEach((p) => {
              const label =
                (p?.display_name || "").trim() ||
                (p?.full_name || "").trim() ||
                (p?.email || "").trim() ||
                "CAPO";
              capoNameById.set(p.id, label);
            });
          }

          const dates = Array.from(expectedByDate.keys()).sort((a, b) => new Date(a) - new Date(b));

          return dates.map((d) => {
            const expected = expectedByDate.get(d) || new Set();
            const cutoff = cutoffNextDay0830Z(d);

            let inOrario = 0;
            const lateIds = [];
            const lateNames = [];

            expected.forEach((capoId) => {
              const k = `${d}::${capoId}`;
              const createdAt = reportByDayCapo.get(k) || null;
              const isOk = createdAt && cutoff ? createdAt <= cutoff : false;

              if (isOk) inOrario += 1;
              else {
                lateIds.push(capoId);
                lateNames.push(capoNameById.get(capoId) || "CAPO");
              }
            });

            return {
              report_date: d,
              capi_attesi: expected.size,
              capi_in_orario: inOrario,
              capi_in_ritardo: Math.max(0, expected.size - inOrario),
              capi_in_ritardo_ids: lateIds,
              capi_in_ritardo_nomi: lateNames,
            };
          });
        }

        const delays = await loadCapiDelays(dateFrom, dateTo, rapNow || []);

        if (!cancelled) {
          setRapportiniCurrent(rapNow || []);
          setRapportiniPrevious(rapPrev || []);
          setIncaTeorico(incaRows || []);
          setProduzioniAggCurrent(aggNow || []);
          setProduzioniAggPrevious(aggPrev || []);
          setHoursFactsCurrent(factsNow || []);
          setHoursFactsPrevious(factsPrev || []);
          setProdDailyCurrent(prodNow || []);
          setProdDailyPrevious(prodPrev || []);
          setCapiDelayDaily(delays || []);
        }
      } catch (err) {
        console.error("[DirectionDashboard] Errore caricamento dati:", err);
        if (!cancelled) {
          setError("Errore nel caricamento dei dati Direzione. Riprova o contatta l’Ufficio.");
          setRapportiniCurrent([]);
          setRapportiniPrevious([]);
          setIncaTeorico([]);
          setProduzioniAggCurrent([]);
          setProduzioniAggPrevious([]);
          setHoursFactsCurrent([]);
          setHoursFactsPrevious([]);
          setProdDailyCurrent([]);
          setProdDailyPrevious([]);
          setCapiDelayDaily([]);
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

  // KPI PRINCIPAUX
  const kpi = useMemo(() => {
    const currCount = rapportiniCurrent.length;
    const prevCount = rapportiniPrevious.length;

    const currRighe = (produzioniAggCurrent || []).reduce((sum, d) => sum + Number(d.righe || 0), 0);
    const prevRighe = (produzioniAggPrevious || []).reduce((sum, d) => sum + Number(d.righe || 0), 0);

    let incaPrevisti = 0;
    let incaRealizzati = 0;
    let incaPosati = 0;

    incaTeorico.forEach((row) => {
      incaPrevisti += toNumber(row.metri_previsti_totali);
      incaRealizzati += toNumber(row.metri_realizzati);
      incaPosati += toNumber(row.metri_posati);
    });

    const sumHours = (facts) =>
      (facts || []).reduce((acc, f) => {
        const h = toNumber(f?.tempo_hours);
        return h > 0 ? acc + h : acc;
      }, 0);

    const currHours = sumHours(hoursFactsCurrent);
    const prevHours = sumHours(hoursFactsPrevious);

    const totalAttesi = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_attesi || 0), 0);
    const totalRitardo = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_in_ritardo || 0), 0);
    const lateRate = totalAttesi > 0 ? (totalRitardo / totalAttesi) * 100 : null;

    const sumPrevNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.previsto_eff), 0);
    const sumProdNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.prodotto_alloc), 0);
    const productivityIndexNow = sumPrevNow > 0 ? sumProdNow / sumPrevNow : null;

    const sumPrevPrev = (prodDailyPrevious || []).reduce((a, r) => a + toNumber(r.previsto_eff), 0);
    const sumProdPrev = (prodDailyPrevious || []).reduce((a, r) => a + toNumber(r.prodotto_alloc), 0);
    const productivityIndexPrev = sumPrevPrev > 0 ? sumProdPrev / sumPrevPrev : null;

    return {
      currCount,
      prevCount,
      currRighe,
      prevRighe,
      incaPrevisti,
      incaRealizzati,
      incaPosati,
      currHours,
      prevHours,
      totalAttesi,
      totalRitardo,
      lateRate,
      productivityIndexNow,
      productivityIndexPrev,
      sumPrevNow,
      sumProdNow,
    };
  }, [
    rapportiniCurrent,
    rapportiniPrevious,
    incaTeorico,
    produzioniAggCurrent,
    produzioniAggPrevious,
    hoursFactsCurrent,
    hoursFactsPrevious,
    capiDelayDaily,
    prodDailyCurrent,
    prodDailyPrevious,
  ]);

  // Timeline data (for combo chart)
  const timelineData = useMemo(() => {
    const map = new Map();

    (rapportiniCurrent || []).forEach((r) => {
      const key = r.report_date;
      if (!key) return;
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabel(key), rapportini: 0, capi_ritardo: 0 });
      map.get(key).rapportini += 1;
    });

    (capiDelayDaily || []).forEach((d) => {
      const key = d.report_date;
      if (!key) return;
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabel(key), rapportini: 0, capi_ritardo: 0 });
      map.get(key).capi_ritardo = Number(d.capi_in_ritardo || 0);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [rapportiniCurrent, capiDelayDaily]);

  // Trend productivity (line)
  const prodTrend = useMemo(() => {
    const m = new Map(); // date -> {prev, prod}
    (prodDailyCurrent || []).forEach((r) => {
      if (!r.report_date) return;
      const cur = m.get(r.report_date) || { report_date: r.report_date, label: formatDateLabel(r.report_date), prev: 0, prod: 0 };
      cur.prev += toNumber(r.previsto_eff);
      cur.prod += toNumber(r.prodotto_alloc);
      m.set(r.report_date, cur);
    });

    const arr = Array.from(m.values())
      .sort((a, b) => new Date(a.report_date) - new Date(b.report_date))
      .map((x) => ({
        ...x,
        indice: x.prev > 0 ? x.prod / x.prev : null,
      }));

    return arr;
  }, [prodDailyCurrent]);

  // ECharts INCA option (themed by CoreEChart)
  const incaOption = useMemo(() => {
    const hasRows = incaTeorico.length > 0;

    if (!hasRows) {
      return {
        title: { text: "INCA · nessun dato", textStyle: { color: CORE_CHART_THEME.subtext, fontSize: 12 } },
        grid: CORE_CHART_THEME.grid,
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
      };
    }

    const sorted = [...incaTeorico].sort((a, b) => toNumber(b.metri_previsti_totali) - toNumber(a.metri_previsti_totali));
    const top = sorted.slice(0, 12);

    const labels = top.map((row) => {
      const file = row.nome_file || "";
      if (file) return file.length > 26 ? `${file.slice(0, 26)}…` : file;
      if (row.commessa) return `${(row.costr || "").trim()} · ${String(row.commessa).trim()}`.trim();
      if (row.costr) return String(row.costr).trim();
      return "";
    });

    const previsti = top.map((r) => toNumber(r.metri_previsti_totali));
    const realizzati = top.map((r) => toNumber(r.metri_realizzati));
    const posati = top.map((r) => toNumber(r.metri_posati));

    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["Previsti", "Realizzati", "Posati"], textStyle: { color: CORE_CHART_THEME.text, fontSize: 11 } },
      grid: { ...CORE_CHART_THEME.grid, top: 44, bottom: 44 },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: CORE_CHART_THEME.subtext, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: CORE_CHART_THEME.axisLine } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: CORE_CHART_THEME.subtext, fontSize: 10 },
        axisLine: { lineStyle: { color: CORE_CHART_THEME.axisLine } },
        splitLine: { lineStyle: { color: CORE_CHART_THEME.gridLine } },
      },
      series: [
        { name: "Previsti", type: "bar", data: previsti, emphasis: { focus: "series" } },
        { name: "Realizzati", type: "bar", data: realizzati, emphasis: { focus: "series" } },
        { name: "Posati", type: "line", data: posati, smooth: true },
      ],
      color: [CORE_CHART_THEME.info, CORE_CHART_THEME.positive, CORE_CHART_THEME.warning],
    };
  }, [incaTeorico]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">Direzione · CNCS / CORE</div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Dashboard Direzione</h1>
        </div>

        <div className="flex flex-col items-end gap-2 text-[11px]">
          <div className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/70 bg-emerald-900/40 text-emerald-100">
              Sola lettura
            </span>
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

      {/* STRIP KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Rapportini</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{kpi.currCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">{kpi.prevCount ? `Prev: ${kpi.prevCount}` : "Prev: —"}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Righe attività</div>
          <div className="mt-1 text-2xl font-semibold text-sky-300">{formatNumberIT(kpi.currRighe, 0)}</div>
          <div className="mt-1 text-[11px] text-slate-500">vs prev</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Indice Produttività</div>
          <div className="mt-1 text-2xl font-semibold text-fuchsia-300">
            {kpi.productivityIndexNow == null ? "—" : formatNumberIT(kpi.productivityIndexNow, 2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Σrealizzato / Σprevisto_eff</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">INCA prev</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{formatNumberIT(kpi.incaPrevisti, 0)}</div>
          <div className="mt-1 text-[11px] text-slate-500">metri</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">INCA real</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">{formatNumberIT(kpi.incaRealizzati, 0)}</div>
          <div className="mt-1 text-[11px] text-slate-500">metri</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Ritardi Capi</div>
          <div className="mt-1 text-2xl font-semibold text-rose-300">
            {kpi.totalAttesi > 0 ? `${kpi.totalRitardo}/${kpi.totalAttesi}` : "—"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {kpi.lateRate != null ? `${formatNumberIT(kpi.lateRate, 1)}%` : "deadline 08:30 (J+1)"}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-4">
        <CoreChartCard title="Timeline" subtitle="Bar: Ritardi Capi · Line: Rapportini">
          <CoreBarLineCombo
            loading={loading}
            data={timelineData}
            height={260}
            xKey="label"
            barKey="capi_ritardo"
            barName="Ritardi Capi"
            barColor={CORE_CHART_THEME.danger}
            lineKey="rapportini"
            lineName="Rapportini"
            lineColor={CORE_CHART_THEME.positive}
            labelFormatter={(label, payload) => {
              if (!payload?.length) return label;
              const d = payload[0]?.payload?.date;
              if (!d) return label;
              return `${label}`;
            }}
            emptyHint="Nessun piano DAY FROZEN o nessun rapporto nella finestra."
          />
          <div className="mt-2 text-[11px] text-slate-500">
            Nota: “Ritardi Capi” deriva dal planning (DAY FROZEN) e dalla deadline 08:30 del giorno successivo.
          </div>
        </CoreChartCard>

        <CoreChartCard title="INCA" subtitle="Top file/commesse per volume previsto (lettura rapida).">
          <CoreEChart
            loading={loading}
            option={incaOption}
            height={260}
            empty={!!(!loading && (!incaTeorico || incaTeorico.length === 0))}
            emptyHint="Import INCA assente o non filtrabile con COSTR/Commessa."
          />
          <div className="mt-2 text-[11px] text-slate-500">
            Previsti / Realizzati / Posati: vista di lettura (non sostituisce il cockpit).
          </div>
        </CoreChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CoreChartCard title="Trend · Produttività giornaliera" subtitle="Evidenzia deriva o miglioramento (indice su previsto).">
          <CoreLineChart
            loading={loading}
            data={prodTrend.map((x) => ({ ...x, indice: x.indice == null ? null : x.indice }))}
            height={260}
            xKey="label"
            yLines={[
              { key: "indice", name: "Indice", stroke: CORE_CHART_THEME.accent },
            ]}
            yDomain={[0, "auto"]}
            emptyHint="Serve almeno 1 giorno con linee indicizzabili (QUANTITATIVE MT/PZ + previsto > 0)."
            yTickFormatter={(v) => (v == null ? "—" : formatNumberIT(v, 2))}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            KPI range attuale: {kpi.productivityIndexNow == null ? "—" : formatNumberIT(kpi.productivityIndexNow, 2)} · Prev_eff:{" "}
            {formatNumberIT(kpi.sumPrevNow, 0)} · Real_alloc: {formatNumberIT(kpi.sumProdNow, 0)}
          </div>
        </CoreChartCard>

        <CoreChartCard
          title="Produzioni · Top descrizioni"
          subtitle="Volume (prodotto) per leggere il “perché” senza aprire tabelle."
        >
          <div className="space-y-2">
            {(produzioniAggCurrent || []).slice(0, 6).map((r, idx) => (
              <div key={`${r.descrizione}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{`Driver #${idx + 1}`}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">{String(r.descrizione || "—")}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Prodotto: {formatNumberIT(r.prodotto_sum, 0)} · Righe: {formatNumberIT(r.righe, 0)}
                </div>
              </div>
            ))}

            {!loading && (!produzioniAggCurrent || produzioniAggCurrent.length === 0) ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-8 text-center text-[12px] text-slate-500">
                Nessun driver nella finestra.
              </div>
            ) : null}
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Nota: questo blocco spiega il “volume” (prodotto) e non sostituisce l’indice su previsto.
          </div>
        </CoreChartCard>
      </section>

      <div className="text-[11px] text-slate-500">
        Regola CORE: nessun KPI “misto”. Produttività = solo su previsto (quantitativo). Ore = facts tokenizzati.
      </div>
    </div>
  );
}
