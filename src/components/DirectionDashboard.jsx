// /src/components/DirectionDashboard.jsx
//
// Tesla X refactor + charts restored:
// - KPI cards cliquables (drill-down modal)
// - Lang (IT default via CoreI18nProvider + keys)
// - "lampes ON": contrast boosted, stronger text
// - Graphes bas restaurés (Timeline, INCA, Trend, Drivers) via CORE Chart Kit wrappers
//
// Sources:
// - rapportini_with_capo_v1
// - direzione_inca_teorico
// - direzione_operator_facts_v1 (heures)
// - kpi_operator_global_day_v2 (prod index)
//
// IMPORTANT:
// - This file expects that your app wraps routes with <CoreI18nProvider> somewhere at root.

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

import { useCoreI18n } from "../i18n/CoreI18n";
import LangSwitcher from "../components/shell/LangSwitcher";
import Modal from "../ui/Modal";
import KpiCard from "./ui/KpiCard";

import {
  toISODate,
  toNumber,
  formatNumberIt,
  formatIndexIt,
  formatDateLabelIt,
  cutoffNextDay0830,
} from "./direzione/direzioneUtils";

import KpiRapportiniDetails from "./direzione/kpiDetails/KpiRapportiniDetails";
import KpiRigheDetails from "./direzione/kpiDetails/KpiRigheDetails";
import KpiProdIndexDetails from "./direzione/kpiDetails/KpiProdIndexDetails";
import KpiIncaDetails from "./direzione/kpiDetails/KpiIncaDetails";
import KpiRitardiCapiDetails from "./direzione/kpiDetails/KpiRitardiCapiDetails";

// CORE Chart Kit (restored graphs)
import {
  CoreChartCard,
  CoreBarLineCombo,
  CoreEChart,
  CoreLineChart,
  CORE_CHART_THEME,
  formatNumberIT,
} from "./charts";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

const KPI_IDS = {
  RAPPORTINI: "RAPPORTINI",
  RIGHE: "RIGHE",
  PROD: "PROD",
  INCA_PREV: "INCA_PREV",
  INCA_REAL: "INCA_REAL",
  RITARDI: "RITARDI",
};

export default function DirectionDashboard() {
  const { profile } = useAuth();
  const { t } = useCoreI18n();

  // filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [costrFilter, setCostrFilter] = useState("");
  const [commessaFilter, setCommessaFilter] = useState("");

  // state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // data
  const [rapportiniCurrent, setRapportiniCurrent] = useState([]);
  const [rapportiniPrevious, setRapportiniPrevious] = useState([]);
  const [incaTeorico, setIncaTeorico] = useState([]);
  const [produzioniAggCurrent, setProduzioniAggCurrent] = useState([]);
  const [produzioniAggPrevious, setProduzioniAggPrevious] = useState([]);
  const [hoursFactsCurrent, setHoursFactsCurrent] = useState([]);
  const [hoursFactsPrevious, setHoursFactsPrevious] = useState([]);
  const [prodDailyCurrent, setProdDailyCurrent] = useState([]);
  const [prodDailyPrevious, setProdDailyPrevious] = useState([]);
  const [capiDelayDaily, setCapiDelayDaily] = useState([]);

  // modal
  const [activeKpi, setActiveKpi] = useState(null);

  // init last 7 days
  useEffect(() => {
    if (dateFrom || dateTo) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
  }, [dateFrom, dateTo]);

  // load data
  useEffect(() => {
    if (!profile) return;
    if (!dateFrom || !dateTo) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) current rapportini
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

        // 2) previous window
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

        // 3) INCA aggregate
        let incaQ = supabase.from("direzione_inca_teorico").select("*");
        if (costrFilter.trim()) incaQ = incaQ.eq("costr", costrFilter.trim());
        if (commessaFilter.trim()) incaQ = incaQ.eq("commessa", commessaFilter.trim());

        const { data: incaRows, error: incaErr } = await incaQ;
        if (incaErr) throw incaErr;

        // 4) Produzioni aggregate by descrizione
        const nowIds = (rapNow || []).map((r) => r.id).filter(Boolean);
        const prevIds = (rapPrev || []).map((r) => r.id).filter(Boolean);

        async function aggByDescrizione(ids) {
          if (!ids.length) return [];
          const { data: rows, error: e } = await supabase
            .from("rapportino_rows")
            .select("rapportino_id, descrizione, prodotto")
            .in("rapportino_id", ids);

          if (e) return [];

          const m = new Map();
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

        // 5) hours facts
        async function loadHoursFacts(rangeFrom, rangeTo) {
          let q = supabase
            .from("direzione_operator_facts_v1")
            .select(
              "report_date, manager_id, capo_id, ship_id, costr, commessa, ship_code, ship_name, operator_id, tempo_hours, unit"
            )
            .gte("report_date", rangeFrom)
            .lte("report_date", rangeTo);

          if (costrFilter.trim()) q = q.eq("costr", costrFilter.trim());
          if (commessaFilter.trim()) q = q.eq("commessa", commessaFilter.trim());

          const { data, error: e } = await q;
          if (e) throw e;
          return data || [];
        }

        // 6) productivity daily (range = sum)
        function normalizeProd(rows) {
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
          return normalizeProd(data);
        }

        const [factsNow, factsPrev, prodNow, prodPrev] = await Promise.all([
          loadHoursFacts(dateFrom, dateTo),
          loadHoursFacts(toISODate(prevFrom), toISODate(prevTo)),
          loadProdDaily(dateFrom, dateTo),
          loadProdDaily(toISODate(prevFrom), toISODate(prevTo)),
        ]);

        // 7) capi delays
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
            const { data: capiProfiles, error: capiErr } = await supabase
              .from("profiles")
              .select("id, full_name, display_name, email")
              .in("id", uniqueCapoIds);

            if (!capiErr) {
              (capiProfiles || []).forEach((p) => {
                const label =
                  (p?.display_name || "").trim() ||
                  (p?.full_name || "").trim() ||
                  (p?.email || "").trim() ||
                  "CAPO";
                capoNameById.set(p.id, label);
              });
            }
          }

          const dates = Array.from(expectedByDate.keys()).sort((a, b) => new Date(a) - new Date(b));

          return dates.map((d) => {
            const expected = expectedByDate.get(d) || new Set();
            const cutoff = cutoffNextDay0830(d);

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
        console.error("[DirectionDashboard] load error:", err);
        if (!cancelled) {
          setError("Errore nel caricamento dei dati Direzione.");
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

  // KPIs computed (strip)
  const kpi = useMemo(() => {
    const currCount = rapportiniCurrent.length;
    const prevCount = rapportiniPrevious.length;

    const currRighe = (produzioniAggCurrent || []).reduce((sum, d) => sum + Number(d.righe || 0), 0);

    // INCA sums
    let incaPrevisti = 0;
    let incaRealizzati = 0;
    let incaPosati = 0;
    incaTeorico.forEach((row) => {
      incaPrevisti += toNumber(row.metri_previsti_totali);
      incaRealizzati += toNumber(row.metri_realizzati);
      incaPosati += toNumber(row.metri_posati);
    });

    // hours indexed (facts)
    const sumHours = (facts) =>
      (facts || []).reduce((acc, f) => {
        const h = toNumber(f?.tempo_hours);
        return h > 0 ? acc + h : acc;
      }, 0);

    const currHours = sumHours(hoursFactsCurrent);

    // prod index range (sum on daily rows)
    const sumPrevNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.previsto_eff), 0);
    const sumProdNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.prodotto_alloc), 0);
    const productivityIndexNow = sumPrevNow > 0 ? sumProdNow / sumPrevNow : null;

    // capi delays totals
    const totalAttesi = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_attesi || 0), 0);
    const totalRitardo = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_in_ritardo || 0), 0);

    return {
      currCount,
      prevCount,
      currRighe,
      incaPrevisti,
      incaRealizzati,
      incaPosati,
      currHours,
      sumPrevNow,
      sumProdNow,
      productivityIndexNow,
      totalAttesi,
      totalRitardo,
    };
  }, [
    rapportiniCurrent,
    rapportiniPrevious,
    produzioniAggCurrent,
    incaTeorico,
    hoursFactsCurrent,
    prodDailyCurrent,
    capiDelayDaily,
  ]);

  // Timeline data (graphs)
  const timelineData = useMemo(() => {
    const map = new Map();

    (rapportiniCurrent || []).forEach((r) => {
      const key = r.report_date;
      if (!key) return;
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabelIt(key), rapportini: 0, capi_ritardo: 0 });
      map.get(key).rapportini += 1;
    });

    (capiDelayDaily || []).forEach((d) => {
      const key = d.report_date;
      if (!key) return;
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabelIt(key), rapportini: 0, capi_ritardo: 0 });
      map.get(key).capi_ritardo = Number(d.capi_in_ritardo || 0);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [rapportiniCurrent, capiDelayDaily, dateFrom, dateTo, costrFilter, commessaFilter]);

  // Trend productivity (graphs)
  const prodTrend = useMemo(() => {
    const m = new Map(); // date -> {prev, prod}
    (prodDailyCurrent || []).forEach((r) => {
      if (!r.report_date) return;
      const cur = m.get(r.report_date) || {
        report_date: r.report_date,
        label: formatDateLabelIt(r.report_date),
        prev: 0,
        prod: 0,
      };
      cur.prev += toNumber(r.previsto_eff);
      cur.prod += toNumber(r.prodotto_alloc);
      m.set(r.report_date, cur);
    });

    return Array.from(m.values())
      .sort((a, b) => new Date(a.report_date) - new Date(b.report_date))
      .map((x) => ({
        ...x,
        indice: x.prev > 0 ? x.prod / x.prev : null,
      }));
  }, [prodDailyCurrent, dateFrom, dateTo, costrFilter, commessaFilter]);

  // ECharts INCA option (graphs)
  const incaOption = useMemo(() => {
    const hasRows = (incaTeorico || []).length > 0;

    if (!hasRows) {
      return {
        title: { text: "INCA · nessun dato", textStyle: { color: CORE_CHART_THEME.subtext, fontSize: 12 } },
        grid: CORE_CHART_THEME.grid,
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
      };
    }

    const sorted = [...incaTeorico].sort(
      (a, b) => toNumber(b.metri_previsti_totali) - toNumber(a.metri_previsti_totali)
    );
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
  }, [incaTeorico, dateFrom, dateTo, costrFilter, commessaFilter]);

  // modal rendering
  const modalTitle = useMemo(() => {
    switch (activeKpi) {
      case KPI_IDS.RAPPORTINI:
        return t("KPI_RAPPORTINI");
      case KPI_IDS.RIGHE:
        return t("KPI_RIGHE_ATTIVITA");
      case KPI_IDS.PROD:
        return t("KPI_INDICE_PROD");
      case KPI_IDS.INCA_PREV:
        return t("KPI_INCA_PREV");
      case KPI_IDS.INCA_REAL:
        return t("KPI_INCA_REAL");
      case KPI_IDS.RITARDI:
        return t("KPI_RITARDI_CAPI");
      default:
        return t("MODAL_DETAILS");
    }
  }, [activeKpi, t]);

  const modalSubtitle = useMemo(() => {
    return `${t("DIR_WINDOW")}: ${formatDateLabelIt(dateFrom)} → ${formatDateLabelIt(dateTo)} · ${t("DIR_COSTR")}: ${
      costrFilter || "—"
    } · ${t("DIR_COMMESSA")}: ${commessaFilter || "—"}`;
  }, [t, dateFrom, dateTo, costrFilter, commessaFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">{t("DIR_KICKER")}</div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">{t("DIR_TITLE")}</h1>
        </div>

        <div className="flex flex-col items-end gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-emerald-400/70 bg-emerald-500/12 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.14)]">
              {t("DIR_READONLY")}
            </span>
            <LangSwitcher compact />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">{t("DIR_WINDOW")}:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
            <span className="text-slate-500">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">{t("DIR_COSTR")}</span>
          <input
            type="text"
            value={costrFilter}
            onChange={(e) => setCostrFilter(e.target.value)}
            placeholder="es. 6368"
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">{t("DIR_COMMESSA")}</span>
          <input
            type="text"
            value={commessaFilter}
            onChange={(e) => setCommessaFilter(e.target.value)}
            placeholder="es. SDC"
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCostrFilter("");
              setCommessaFilter("");
            }}
            className="px-3 py-1.5 rounded-full border border-slate-700/80 bg-slate-950/60 text-[11px] text-slate-200 hover:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            {t("DIR_RESET_FILTERS")}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-[12px] text-rose-100">
          {error}
        </div>
      ) : null}

      {loading && !error ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-[12px] text-slate-300">
          {t("DETAILS_LOADING")}
        </div>
      ) : null}

      {/* KPI STRIP (all clickable) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title={t("KPI_RAPPORTINI")}
          value={loading ? "—" : String(kpi.currCount)}
          subline={loading ? "" : `${t("KPI_PREV")}: ${kpi.prevCount || "—"}`}
          accent="slate"
          onClick={() => setActiveKpi(KPI_IDS.RAPPORTINI)}
        />

        <KpiCard
          title={t("KPI_RIGHE_ATTIVITA")}
          value={loading ? "—" : formatNumberIt(kpi.currRighe, 0)}
          subline={t("KPI_VS_PREV")}
          accent="sky"
          onClick={() => setActiveKpi(KPI_IDS.RIGHE)}
        />

        <KpiCard
          title={t("KPI_INDICE_PROD")}
          value={loading ? "—" : formatIndexIt(kpi.productivityIndexNow)}
          subline="Σrealizzato / Σprevisto_eff"
          accent="fuchsia"
          onClick={() => setActiveKpi(KPI_IDS.PROD)}
        />

        <KpiCard
          title={t("KPI_INCA_PREV")}
          value={loading ? "—" : formatNumberIt(kpi.incaPrevisti, 0)}
          subline={t("KPI_METRI")}
          accent="slate"
          onClick={() => setActiveKpi(KPI_IDS.INCA_PREV)}
        />

        <KpiCard
          title={t("KPI_INCA_REAL")}
          value={loading ? "—" : formatNumberIt(kpi.incaRealizzati, 0)}
          subline={t("KPI_METRI")}
          accent="emerald"
          onClick={() => setActiveKpi(KPI_IDS.INCA_REAL)}
        />

        <KpiCard
          title={t("KPI_RITARDI_CAPI")}
          value={loading ? "—" : kpi.totalAttesi > 0 ? `${kpi.totalRitardo}/${kpi.totalAttesi}` : "—"}
          subline={t("KPI_DEADLINE")}
          accent="rose"
          onClick={() => setActiveKpi(KPI_IDS.RITARDI)}
        />
      </section>

      {/* Modal drill-down */}
      <Modal
        open={!!activeKpi}
        onClose={() => setActiveKpi(null)}
        title={modalTitle}
        subtitle={modalSubtitle}
        maxWidthClass="max-w-5xl"
      >
        {activeKpi === KPI_IDS.RAPPORTINI ? (
          <KpiRapportiniDetails rapportini={rapportiniCurrent} dateFrom={dateFrom} dateTo={dateTo} />
        ) : null}

        {activeKpi === KPI_IDS.RIGHE ? <KpiRigheDetails produzioniAgg={produzioniAggCurrent} /> : null}

        {activeKpi === KPI_IDS.PROD ? (
          <KpiProdIndexDetails
            sumPrevEff={kpi.sumPrevNow}
            sumProdAlloc={kpi.sumProdNow}
            sumHoursIndexed={kpi.currHours}
            productivityIndex={kpi.productivityIndexNow}
          />
        ) : null}

        {activeKpi === KPI_IDS.INCA_PREV ? <KpiIncaDetails incaTeorico={incaTeorico} mode="PREV" /> : null}

        {activeKpi === KPI_IDS.INCA_REAL ? <KpiIncaDetails incaTeorico={incaTeorico} mode="REAL" /> : null}

        {activeKpi === KPI_IDS.RITARDI ? <KpiRitardiCapiDetails capiDelayDaily={capiDelayDaily} /> : null}
      </Modal>

      {/* GRAPHS RESTORED (bottom) */}
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
            labelFormatter={(label) => label}
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
          <div className="mt-2 text-[11px] text-slate-500">Previsti / Realizzati / Posati: vista di lettura (non sostituisce il cockpit).</div>
        </CoreChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CoreChartCard title="Trend · Produttività giornaliera" subtitle="Evidenzia deriva o miglioramento (indice su previsto).">
          <CoreLineChart
            loading={loading}
            data={prodTrend.map((x) => ({ ...x, indice: x.indice == null ? null : x.indice }))}
            height={260}
            xKey="label"
            yLines={[{ key: "indice", name: "Indice", stroke: CORE_CHART_THEME.accent }]}
            yDomain={[0, "auto"]}
            emptyHint="Serve almeno 1 giorno con linee indicizzabili (QUANTITATIVE MT/PZ + previsto > 0)."
            yTickFormatter={(v) => (v == null ? "—" : formatNumberIT(v, 2))}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            KPI range attuale: {kpi.productivityIndexNow == null ? "—" : formatNumberIT(kpi.productivityIndexNow, 2)} · Prev_eff:{" "}
            {formatNumberIT(kpi.sumPrevNow, 0)} · Real_alloc: {formatNumberIT(kpi.sumProdNow, 0)}
          </div>
        </CoreChartCard>

        <CoreChartCard title="Produzioni · Top descrizioni" subtitle="Volume (prodotto) per leggere il “perché” senza aprire tabelle.">
          <div className="space-y-2">
            {(produzioniAggCurrent || []).slice(0, 6).map((r, idx) => (
              <div
                key={`${r.descrizione}-${idx}`}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
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
