// /src/components/DirectionDashboard.jsx
//
// Dashboard Direzione — Tesla-X UX (v2)
// - Verdict system first (human language)
// - 4 KPI only (each with interpretation + no "—")
// - Causal explanation (drivers)
// - Trend that makes a decision (Produttività giornaliera)
// - Drilldown in-page (no routing assumptions)
//
// Canonique KPI Produttività:
// Indice = Σ(prodotto_alloc) / Σ(previsto_eff)  with previsto_eff = previsto * (tempo_hours/8)
// Source: kpi_operator_global_day_v2 (already normalized on previsto + alloc)
//
// KPI Temps stays separate via direzione_operator_facts_v1 (not mixed with productivity)

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

// Recharts – trends
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// ECharts – INCA
import ReactECharts from "echarts-for-react";

// ───────────────────────────
// Utils
// ───────────────────────────
function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

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

  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value, maxFrac = 0) {
  if (value == null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(
    Number(value)
  );
}

function formatIndex(v) {
  if (v == null || Number.isNaN(v)) return "N/D";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(Number(v));
}

function formatPct(v) {
  if (v == null || Number.isNaN(v)) return "N/D";
  return `${formatNumber(v, 0)}%`;
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function cutoffNextDay0830Z(reportDateISO) {
  const d = parseISODate(reportDateISO);
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}

// ───────────────────────────
// Tesla KPI helpers
// ───────────────────────────
function productivityTier(idx) {
  if (idx == null) return { label: "N/D", tone: "neutral" };
  if (idx >= 1.1) return { label: "Sopra standard", tone: "good" };
  if (idx >= 1.0) return { label: "In linea", tone: "warn" };
  return { label: "Sotto standard", tone: "bad" };
}

function punctualityTier(rateLatePct) {
  // rateLatePct = % ritardi
  if (rateLatePct == null) return { label: "N/D · Nessun piano DAY FROZEN", tone: "neutral" };
  if (rateLatePct <= 5) return { label: "Ottima", tone: "good" };
  if (rateLatePct <= 15) return { label: "Da monitorare", tone: "warn" };
  return { label: "Critica", tone: "bad" };
}

function incaTier(coverPct) {
  if (coverPct == null) return { label: "N/D", tone: "neutral" };
  if (coverPct >= 75) return { label: "Buona", tone: "good" };
  if (coverPct >= 40) return { label: "Parziale", tone: "warn" };
  return { label: "Debole", tone: "bad" };
}

function toneClasses(tone) {
  // Keep palette consistent with your dark theme
  if (tone === "good") return "border-emerald-500/25 text-emerald-200";
  if (tone === "warn") return "border-sky-500/25 text-sky-200";
  if (tone === "bad") return "border-rose-500/25 text-rose-200";
  return "border-slate-800 text-slate-200";
}

function verdictFromSignals({ prodIdx, lateRatePct, incaCoverPct }) {
  const prod = productivityTier(prodIdx).tone;
  const late = punctualityTier(lateRatePct).tone;
  const inca = incaTier(incaCoverPct).tone;

  // severity score: bad=2, warn=1, neutral=0, good=0
  const score = [prod, late, inca].reduce((acc, t) => {
    if (t === "bad") return acc + 2;
    if (t === "warn") return acc + 1;
    return acc;
  }, 0);

  if (score >= 4) return { title: "ATTENZIONE RICHIESTA", tone: "bad" };
  if (score >= 2) return { title: "SOTTO OSSERVAZIONE", tone: "warn" };
  return { title: "STATO DEL SISTEMA · STABILE", tone: "good" };
}

function safeText(x, fallback = "N/D") {
  const s = (x ?? "").toString().trim();
  return s || fallback;
}

// ───────────────────────────
// Component
// ───────────────────────────
export default function DirectionDashboard() {
  const { profile } = useAuth();

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [costrFilter, setCostrFilter] = useState("");
  const [commessaFilter, setCommessaFilter] = useState("");

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rapportini headers
  const [rapportiniCurrent, setRapportiniCurrent] = useState([]);
  const [rapportiniPrevious, setRapportiniPrevious] = useState([]);

  // INCA
  const [incaTeorico, setIncaTeorico] = useState([]);

  // Produzioni breakdown
  const [produzioniAggCurrent, setProduzioniAggCurrent] = useState([]);
  const [produzioniAggPrevious, setProduzioniAggPrevious] = useState([]);

  // Hours facts
  const [hoursFactsCurrent, setHoursFactsCurrent] = useState([]);
  const [hoursFactsPrevious, setHoursFactsPrevious] = useState([]);

  // Productivity daily (raw rows per operator/day)
  const [prodDailyCurrent, setProdDailyCurrent] = useState([]);
  const [prodDailyPrevious, setProdDailyPrevious] = useState([]);

  // Capi delays (from planning)
  const [capiDelayDaily, setCapiDelayDaily] = useState([]);

  // Tesla drill toggles
  const [openDrivers, setOpenDrivers] = useState(true);
  const [openTrend, setOpenTrend] = useState(true);
  const [openInca, setOpenInca] = useState(true);

  // Init last 7 days
  useEffect(() => {
    if (dateFrom || dateTo) return;
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
  }, [dateFrom, dateTo]);

  // ───────────────────────────
  // Load
  // ───────────────────────────
  useEffect(() => {
    if (!profile) return;
    if (!dateFrom || !dateTo) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Current window
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

        // Previous window (same duration just before)
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

        // INCA
        let incaQ = supabase.from("direzione_inca_teorico").select("*");
        if (costrFilter.trim()) incaQ = incaQ.eq("costr", costrFilter.trim());
        if (commessaFilter.trim()) incaQ = incaQ.eq("commessa", commessaFilter.trim());

        const { data: incaRows, error: incaErr } = await incaQ;
        if (incaErr) throw incaErr;

        // Produzioni breakdown (by descrizione) – from rapportino_rows (simple, deterministic)
        const nowIds = (rapNow || []).map((r) => r.id).filter(Boolean);
        const prevIds = (rapPrev || []).map((r) => r.id).filter(Boolean);

        async function aggByDescrizione(ids) {
          if (!ids.length) return [];
          const { data: rows, error: e } = await supabase
            .from("rapportino_rows")
            .select("rapportino_id, categoria, descrizione, prodotto")
            .in("rapportino_id", ids);

          if (e) return [];

          const m = new Map(); // key -> agg
          (rows || []).forEach((rr) => {
            const cat = safeText(rr?.categoria, "—");
            const desc = safeText(rr?.descrizione, "—");
            const k = `${cat}::${desc}`;
            const obj =
              m.get(k) || { categoria: cat, descrizione: desc, prodotto_sum: 0, righe: 0 };
            obj.prodotto_sum += toNumber(rr?.prodotto);
            obj.righe += 1;
            m.set(k, obj);
          });

          return Array.from(m.values()).sort((a, b) => b.prodotto_sum - a.prodotto_sum);
        }

        const [aggNow, aggPrev] = await Promise.all([
          aggByDescrizione(nowIds),
          aggByDescrizione(prevIds),
        ]);

        // Hours facts – tokenized
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

        // Productivity daily – v2 global-day view (per operator/day)
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

        // Capi delays (deadline 08:30 J+1) – only if planning exists
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

          const reportByDayCapo = new Map(); // `${date}::${capo}` -> created_at earliest
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

          const dates = Array.from(expectedByDate.keys()).sort(
            (a, b) => new Date(a) - new Date(b)
          );

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
        console.error("[DirectionDashboard] load error:", err);
        if (!cancelled) {
          setError("Errore nel caricamento dati Direzione. Verifica viste/RLS.");
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

  // ───────────────────────────
  // KPI / Signals
  // ───────────────────────────
  const kpi = useMemo(() => {
    const currCount = rapportiniCurrent.length;
    const prevCount = rapportiniPrevious.length;

    const currRighe = (produzioniAggCurrent || []).reduce(
      (sum, d) => sum + Number(d.righe || 0),
      0
    );
    const prevRighe = (produzioniAggPrevious || []).reduce(
      (sum, d) => sum + Number(d.righe || 0),
      0
    );

    // INCA aggregates
    let incaPrevisti = 0;
    let incaRealizzati = 0;
    let incaPosati = 0;

    let caviTotali = 0;
    let caviConPrevisti = 0;
    let caviConRealizzati = 0;

    (incaTeorico || []).forEach((row) => {
      incaPrevisti += toNumber(row.metri_previsti_totali);
      incaRealizzati += toNumber(row.metri_realizzati);
      incaPosati += toNumber(row.metri_posati);

      caviTotali += Number(row.cavi_totali || 0);
      caviConPrevisti += Number(row.cavi_con_metri_previsti || 0);
      caviConRealizzati += Number(row.cavi_con_metri_realizzati || 0);
    });

    const incaCoverPct =
      incaPrevisti > 0 ? Math.min(100, (incaRealizzati / incaPrevisti) * 100) : null;

    const pctPrevistiCompilati = caviTotali > 0 ? (caviConPrevisti / caviTotali) * 100 : null;
    const pctRealizzatiCompilati = caviTotali > 0 ? (caviConRealizzati / caviTotali) * 100 : null;

    const incaDataQuality =
      caviTotali > 0
        ? {
            caviTotali,
            pctPrevistiCompilati,
            pctRealizzatiCompilati,
          }
        : null;

    // Hours (separate)
    const sumHours = (facts) =>
      (facts || []).reduce((acc, f) => {
        const h = toNumber(f?.tempo_hours);
        return h > 0 ? acc + h : acc;
      }, 0);

    const currHours = sumHours(hoursFactsCurrent);
    const prevHours = sumHours(hoursFactsPrevious);

    // Productivity range index (Σprod / Σprev)
    const sumPrevNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.previsto_eff), 0);
    const sumProdNow = (prodDailyCurrent || []).reduce(
      (a, r) => a + toNumber(r.prodotto_alloc),
      0
    );
    const productivityIndexNow = sumPrevNow > 0 ? sumProdNow / sumPrevNow : null;

    const sumPrevPrev = (prodDailyPrevious || []).reduce((a, r) => a + toNumber(r.previsto_eff), 0);
    const sumProdPrev = (prodDailyPrevious || []).reduce(
      (a, r) => a + toNumber(r.prodotto_alloc),
      0
    );
    const productivityIndexPrev = sumPrevPrev > 0 ? sumProdPrev / sumPrevPrev : null;

    // Punctuality from delays (if planning exists)
    const totalAttesi = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_attesi || 0), 0);
    const totalRitardo = (capiDelayDaily || []).reduce(
      (a, d) => a + Number(d.capi_in_ritardo || 0),
      0
    );
    const lateRatePct = totalAttesi > 0 ? (totalRitardo / totalAttesi) * 100 : null;

    return {
      currCount,
      prevCount,
      currRighe,
      prevRighe,
      incaPrevisti,
      incaRealizzati,
      incaPosati,
      incaCoverPct,
      incaDataQuality,
      currHours,
      prevHours,
      sumPrevNow,
      sumProdNow,
      productivityIndexNow,
      productivityIndexPrev,
      totalAttesi,
      totalRitardo,
      lateRatePct,
    };
  }, [
    rapportiniCurrent,
    rapportiniPrevious,
    produzioniAggCurrent,
    produzioniAggPrevious,
    incaTeorico,
    hoursFactsCurrent,
    hoursFactsPrevious,
    prodDailyCurrent,
    prodDailyPrevious,
    capiDelayDaily,
  ]);

  // Drivers (top contributing families by prodotto sum, quick causal story)
  const drivers = useMemo(() => {
    const top = (produzioniAggCurrent || []).slice(0, 6);
    if (!top.length) return [];
    return top.map((x) => ({
      label: `${safeText(x.categoria, "—")} · ${safeText(x.descrizione, "—")}`,
      prodotto: toNumber(x.prodotto_sum),
      righe: Number(x.righe || 0),
    }));
  }, [produzioniAggCurrent]);

  // Productivity trend (group by report_date across operators)
  const prodTrend = useMemo(() => {
    const m = new Map(); // date -> {prev, prod}
    (prodDailyCurrent || []).forEach((r) => {
      const d = r.report_date ? String(r.report_date) : null;
      if (!d) return;
      const cur = m.get(d) || { date: d, label: formatDateLabel(d), prev: 0, prod: 0, idx: null };
      cur.prev += toNumber(r.previsto_eff);
      cur.prod += toNumber(r.prodotto_alloc);
      m.set(d, cur);
    });

    const arr = Array.from(m.values())
      .map((x) => ({
        ...x,
        idx: x.prev > 0 ? x.prod / x.prev : null,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return arr;
  }, [prodDailyCurrent]);

  // Delays map for tooltip context
  const lateCapiByDate = useMemo(() => {
    const m = new Map();
    (capiDelayDaily || []).forEach((d) => {
      m.set(d.report_date, {
        ids: d.capi_in_ritardo_ids || [],
        names: d.capi_in_ritardo_nomi || [],
        attesi: Number(d.capi_attesi || 0),
        ritardo: Number(d.capi_in_ritardo || 0),
      });
    });
    return m;
  }, [capiDelayDaily]);

  // Verdict
  const verdict = useMemo(() => {
    const v = verdictFromSignals({
      prodIdx: kpi.productivityIndexNow,
      lateRatePct: kpi.lateRatePct,
      incaCoverPct: kpi.incaCoverPct,
    });

    const reasons = [];

    // Productivity reason
    const pt = productivityTier(kpi.productivityIndexNow);
    if (pt.tone !== "neutral") {
      reasons.push(`Produttività: ${pt.label} (${formatIndex(kpi.productivityIndexNow)})`);
    } else {
      reasons.push("Produttività: N/D");
    }

    // Punctuality reason
    const lt = punctualityTier(kpi.lateRatePct);
    if (kpi.lateRatePct == null) reasons.push("Puntualità: N/D (nessun piano DAY FROZEN)");
    else reasons.push(`Puntualità: ${formatPct(100 - kpi.lateRatePct)} on-time`);

    // INCA reason
    const it = incaTier(kpi.incaCoverPct);
    if (kpi.incaCoverPct == null) reasons.push("INCA: N/D");
    else reasons.push(`INCA: ${it.label} (${formatPct(kpi.incaCoverPct)})`);

    return { ...v, reasons: reasons.slice(0, 3) };
  }, [kpi]);

  // INCA chart option (keep your style; avoid blank with explicit messages)
  const incaOption = useMemo(() => {
    const hasRows = (incaTeorico || []).length > 0;

    const anyMetric =
      toNumber(kpi.incaPrevisti) > 0 || toNumber(kpi.incaRealizzati) > 0 || toNumber(kpi.incaPosati) > 0;

    if (!hasRows) {
      return {
        backgroundColor: "transparent",
        title: {
          text: "INCA · N/D",
          subtext: "Nessun dato per i filtri correnti",
          textStyle: { color: "#e5e7eb", fontSize: 12 },
          subtextStyle: { color: "#9ca3af", fontSize: 11 },
          left: "center",
          top: 10,
        },
        grid: { left: 40, right: 10, top: 70, bottom: 30 },
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
      };
    }

    if (!anyMetric) {
      const q = kpi.incaDataQuality;
      const qLine = q
        ? `Import parziale · ${formatPct(q.pctPrevistiCompilati)} previsti · ${formatPct(q.pctRealizzatiCompilati)} realizzati`
        : "Import parziale";

      return {
        backgroundColor: "transparent",
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

  // KPI cards (Tesla interpretation)
  const prodTier = useMemo(() => productivityTier(kpi.productivityIndexNow), [kpi.productivityIndexNow]);
  const punTier = useMemo(() => punctualityTier(kpi.lateRatePct), [kpi.lateRatePct]);
  const incaTierObj = useMemo(() => incaTier(kpi.incaCoverPct), [kpi.incaCoverPct]);

  // ───────────────────────────
  // UI atoms
  // ───────────────────────────
  const card = "rounded-2xl border bg-slate-950/70";
  const cardPad = "px-4 py-3";
  const label = "text-[11px] uppercase tracking-[0.16em] text-slate-500";
  const sub = "text-[11px] text-slate-500";
  const btn = "px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/80 text-[11px] text-slate-300 hover:bg-slate-900 transition";

  function kpiValueOrND(value, fmt = (x) => String(x)) {
    if (value == null || Number.isNaN(value)) return "N/D";
    return fmt(value);
  }

  // ───────────────────────────
  // Render
  // ───────────────────────────
  return (
    <div className="space-y-5">
      {/* HEADER */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            Direzione · CNCS / CORE
          </div>
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

      {/* FILTERS */}
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
            className={btn}
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

      {/* 0) VERDICT SYSTEM */}
      <section
        className={cn(
          card,
          "border",
          verdict.tone === "good"
            ? "border-emerald-500/30"
            : verdict.tone === "warn"
            ? "border-sky-500/30"
            : "border-rose-500/30"
        )}
      >
        <div className={cn(cardPad, "flex flex-col gap-2")}>
          <div className={cn(label, verdict.tone === "good" ? "text-emerald-300" : verdict.tone === "warn" ? "text-sky-300" : "text-rose-300")}>
            {verdict.title}
          </div>

          <div className="text-sm text-slate-200">
            {verdict.reasons.map((r, i) => (
              <div key={`${r}-${i}`} className="flex items-start gap-2">
                <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-slate-600" />
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div className={sub}>
            Regole: Produttività = Σrealizzato_alloc / Σprevisto_eff · Puntualità = deadline 08:30 (J+1) · INCA = realizzato/previsto.
          </div>
        </div>
      </section>

      {/* 1) KPI STRATEGICI (max 4) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Produttività */}
        <button
          type="button"
          onClick={() => setOpenTrend((v) => !v)}
          className={cn(card, "text-left", "border", toneClasses(prodTier.tone))}
        >
          <div className={cardPad}>
            <div className={label}>Produttività vs standard</div>
            <div className="mt-1 text-2xl font-semibold">
              {kpiValueOrND(kpi.productivityIndexNow, (x) => formatIndex(x))}
            </div>
            <div className={sub}>{prodTier.label} · Σreal / Σprev_eff</div>
          </div>
        </button>

        {/* Puntualità */}
        <button
          type="button"
          onClick={() => setOpenDrivers((v) => !v)}
          className={cn(card, "text-left", "border", toneClasses(punTier.tone))}
        >
          <div className={cardPad}>
            <div className={label}>Puntualità rapportini</div>
            <div className="mt-1 text-2xl font-semibold">
              {kpi.totalAttesi > 0
                ? `${kpi.totalRitardo}/${kpi.totalAttesi}`
                : "N/D"}
            </div>
            <div className={sub}>
              {kpi.totalAttesi > 0
                ? `${formatPct(100 - kpi.lateRatePct)} on-time · deadline 08:30 (J+1)`
                : "Nessun piano DAY FROZEN"}
            </div>
          </div>
        </button>

        {/* INCA */}
        <button
          type="button"
          onClick={() => setOpenInca((v) => !v)}
          className={cn(card, "text-left", "border", toneClasses(incaTierObj.tone))}
        >
          <div className={cardPad}>
            <div className={label}>Avanzamento INCA</div>
            <div className="mt-1 text-2xl font-semibold">
              {kpi.incaCoverPct == null ? "N/D" : formatPct(kpi.incaCoverPct)}
            </div>
            <div className={sub}>
              {incaTierObj.label} · Realizzato/Previsto
            </div>
          </div>
        </button>

        {/* Volume operativo */}
        <div className={cn(card, "border border-slate-800")}>
          <div className={cardPad}>
            <div className={label}>Volume operativo</div>
            <div className="mt-1 text-2xl font-semibold text-slate-50">
              {formatNumber(kpi.currRighe, 0)}
            </div>
            <div className={sub}>
              Righe attività · Rapportini: {formatNumber(kpi.currCount, 0)}
            </div>
          </div>
        </div>
      </section>

      {/* 2) SPIEGAZIONE CAUSALE (drivers) */}
      <section className={cn(card, "border border-slate-800")}>
        <div className={cn(cardPad, "flex items-center justify-between gap-3")}>
          <div>
            <div className={label}>Cosa sta guidando il risultato</div>
            <div className="text-sm text-slate-200 mt-1">
              Top famiglie per volume (utile per leggere il “perché” senza aprire tabelle).
            </div>
          </div>

          <button type="button" onClick={() => setOpenDrivers((v) => !v)} className={btn}>
            {openDrivers ? "Nascondi" : "Mostra"}
          </button>
        </div>

        {openDrivers ? (
          <div className="px-4 pb-4">
            {drivers.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {drivers.map((d, i) => (
                  <div
                    key={`${d.label}-${i}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Driver #{i + 1}
                    </div>
                    <div className="mt-1 text-sm text-slate-100">{d.label}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Prodotto: <span className="text-slate-200">{formatNumber(d.prodotto, 0)}</span>{" "}
                      · Righe: <span className="text-slate-200">{formatNumber(d.righe, 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-1 pb-3 text-[12px] text-slate-500">Nessun driver nella finestra.</div>
            )}

            <div className="mt-3 text-[11px] text-slate-500">
              Nota: questo blocco spiega il “volume” (prodotto) e non sostituisce l’indice su previsto.
            </div>
          </div>
        ) : null}
      </section>

      {/* 3) TREND DECISIONALE (prod daily) + INCA */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)] gap-4">
        {/* Trend */}
        <div className={cn(card, "border border-slate-800")}>
          <div className={cn(cardPad, "flex items-center justify-between")}>
            <div>
              <div className={label}>Trend · Produttività giornaliera</div>
              <div className="text-[12px] text-slate-400 mt-1">
                Un grafico utile solo se evidenzia deriva o miglioramento.
              </div>
            </div>

            <button type="button" onClick={() => setOpenTrend((v) => !v)} className={btn}>
              {openTrend ? "Nascondi" : "Mostra"}
            </button>
          </div>

          {openTrend ? (
            <div className="h-64 w-full px-2 pb-4">
              {prodTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prodTrend}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: 11 }}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload;
                        const d = row?.date;
                        if (!d) return label;

                        const late = lateCapiByDate.get(d);
                        const base = `${label}`;
                        if (!late || !late.attesi) return base;

                        const names = (late.names || []).filter(Boolean).slice(0, 6);
                        const extra = late.names && late.names.length > 6 ? ` +${late.names.length - 6}` : "";
                        return `${base} · Ritardi capi: ${late.ritardo}/${late.attesi} · ${names.join(", ")}${extra}`;
                      }}
                      formatter={(value, name) => {
                        if (name === "Indice") return [formatIndex(value), "Indice"];
                        return [formatNumber(value, 2), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#e5e7eb" }} />
                    <Line
                      type="monotone"
                      dataKey="idx"
                      name="Indice"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
                  N/D · Nessun dato produttività per i filtri correnti
                </div>
              )}
            </div>
          ) : null}

          <div className="px-4 pb-4 text-[11px] text-slate-500">
            KPI range attuale: <span className="text-slate-200">{formatIndex(kpi.productivityIndexNow)}</span>{" "}
            · Prev_eff: <span className="text-slate-200">{formatNumber(kpi.sumPrevNow, 0)}</span>{" "}
            · Real_alloc: <span className="text-slate-200">{formatNumber(kpi.sumProdNow, 0)}</span>
          </div>
        </div>

        {/* INCA */}
        <div className={cn(card, "border border-slate-800")}>
          <div className={cn(cardPad, "flex items-center justify-between")}>
            <div>
              <div className={label}>INCA</div>
              <div className="text-[12px] text-slate-400 mt-1">
                Top file/commesse per volume previsto (lettura rapida).
              </div>
            </div>

            <button type="button" onClick={() => setOpenInca((v) => !v)} className={btn}>
              {openInca ? "Nascondi" : "Mostra"}
            </button>
          </div>

          {openInca ? (
            <div className="h-64 w-full px-2 pb-4">
              <ReactECharts option={incaOption} style={{ width: "100%", height: "100%" }} notMerge lazyUpdate />
            </div>
          ) : null}

          <div className="px-4 pb-4 text-[11px] text-slate-500">
            Previsti: <span className="text-slate-200">{formatNumber(kpi.incaPrevisti, 0)}</span> · Realizzati:{" "}
            <span className="text-slate-200">{formatNumber(kpi.incaRealizzati, 0)}</span> · Posati:{" "}
            <span className="text-slate-200">{formatNumber(kpi.incaPosati, 0)}</span>
          </div>
        </div>
      </section>

      {/* Minimal footer note */}
      <div className="text-[11px] text-slate-500">
        Regola CORE: nessun KPI “misto”. Produttività è solo su previsto (quantitativo), ore restano su facts tokenizzati.
      </div>
    </div>
  );
}
