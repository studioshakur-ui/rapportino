// src/components/DirectionDashboard.tsx
//
// Direction Dashboard (Direzione) — KPI strip cliquable + charts.
// Fix pack (Direction-level):
// - Branche le drill-down (Modal) sur les composants existants src/components/direzione/kpiDetails/*
// - Unifie la source Produttivita avec fallback view v3 -> v2 (comme KPI Operatori)
// - Expose le KPI "Ore lavoro" (facts) + drill-down
// - Continue a utiliser CORE Chart Kit

import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

import { useCoreI18n } from "../i18n/CoreI18n";
import LangSwitcher from "./shell/LangSwitcher";
import Modal from "../ui/Modal";
import KpiCard from "./ui/KpiCard";

import {
  CoreChartCard,
  CoreBarLineCombo,
  CoreEChart,
  CoreLineChart,
  CORE_CHART_THEME,
  formatNumberIT,
} from "./charts";

import KpiRapportiniDetails from "./direzione/kpiDetails/KpiRapportiniDetails";
import KpiRigheDetails from "./direzione/kpiDetails/KpiRigheDetails";
import KpiProdIndexDetails from "./direzione/kpiDetails/KpiProdIndexDetails";
import KpiIncaDetails from "./direzione/kpiDetails/KpiIncaDetails";
import KpiRitardiCapiDetails from "./direzione/kpiDetails/KpiRitardiCapiDetails";
import KpiHoursDetails from "./direzione/kpiDetails/KpiHoursDetails";

type AnyRow = Record<string, any>;

// Utils dates / format
function toISODate(d: Date): string {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function parseISODate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateLabel(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

function toNumber(v: unknown): number {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = Number((v as any) ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function cutoffNextDay0830(reportDateISO: string): Date | null {
  const d = parseISODate(reportDateISO);
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}

const KPI_IDS = {
  RAPPORTINI: "RAPPORTINI",
  RIGHE: "RIGHE",
  PROD: "PROD",
  INCA_PREV: "INCA_PREV",
  INCA_REAL: "INCA_REAL",
  ORE: "ORE",
  RITARDI: "RITARDI",
} as const;

type KpiId = (typeof KPI_IDS)[keyof typeof KPI_IDS] | null;

function formatIndexIT(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatNumberIT(v, 2);
}

function isMissingRelation(err: unknown): boolean {
  const e = err as { message?: string; code?: string };
  const msg = String(e?.message || "");
  const code = String(e?.code || "");
  return code === "42P01" || /relation .* does not exist/i.test(msg) || /does not exist/i.test(msg);
}

export default function DirectionDashboard({ isDark = true }: { isDark?: boolean }): JSX.Element {
  const { profile } = useAuth();

  // i18n (fallback if missing keys)
  const i18n = useCoreI18n();
  const tRaw = i18n?.t ? i18n.t : (k: string) => k;
  const t = (key: string, fallback?: string) => {
    const v = tRaw(key);
    if (!v || v === key) return fallback ?? key;
    return v;
  };

  // Filtres globaux
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [costrFilter, setCostrFilter] = useState<string>("");
  const [commessaFilter, setCommessaFilter] = useState<string>("");

  // État data
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Rapportini (vue enrichie) — canonique pour noms capo
  const [rapportiniCurrent, setRapportiniCurrent] = useState<AnyRow[]>([]);
  const [rapportiniPrevious, setRapportiniPrevious] = useState<AnyRow[]>([]);

  // INCA
  const [incaTeorico, setIncaTeorico] = useState<AnyRow[]>([]);

  // Produzioni – breakdown par descrizione sur la fenêtre
  const [produzioniAggCurrent, setProduzioniAggCurrent] = useState<AnyRow[]>([]);
  const [produzioniAggPrevious, setProduzioniAggPrevious] = useState<AnyRow[]>([]);

  // KPI heures (facts tokenisés)
  const [hoursFactsCurrent, setHoursFactsCurrent] = useState<AnyRow[]>([]);
  const [hoursFactsPrevious, setHoursFactsPrevious] = useState<AnyRow[]>([]);

  // KPI indice produttività (daily) su previsto
  const [prodDailyCurrent, setProdDailyCurrent] = useState<AnyRow[]>([]);
  const [prodDailyPrevious, setProdDailyPrevious] = useState<AnyRow[]>([]);

  // Retards capi (deadline J+1 08:30)
  const [capiDelayDaily, setCapiDelayDaily] = useState<AnyRow[]>([]);

  // Modal KPI
  const [activeKpi, setActiveKpi] = useState<KpiId>(null);

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

    async function load(): Promise<void> {
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

        // 2) Fenêtre précédente (même durée juste avant)
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

        // 3) INCA (agrégé)
        let incaQ = supabase.from("direzione_inca_teorico").select("*");
        if (costrFilter.trim()) incaQ = incaQ.eq("costr", costrFilter.trim());
        if (commessaFilter.trim()) incaQ = incaQ.eq("commessa", commessaFilter.trim());

        const { data: incaRows, error: incaErr } = await incaQ;
        if (incaErr) throw incaErr;

        // 4) Produzioni – agrège par descrizione depuis rapportino_rows
        const nowIds = (rapNow || []).map((r: AnyRow) => r.id).filter(Boolean);
        const prevIds = (rapPrev || []).map((r: AnyRow) => r.id).filter(Boolean);

        async function aggByDescrizione(ids: string[]): Promise<AnyRow[]> {
          if (!ids.length) return [];
          const { data: rows, error: e } = await supabase
            .from("rapportino_rows")
            .select("rapportino_id, descrizione, prodotto")
            .in("rapportino_id", ids);
          if (e) return [];

          const m = new Map<string, { descrizione: string; prodotto_sum: number; righe: number }>();
          (rows || []).forEach((rr: AnyRow) => {
            const k = (rr?.descrizione ?? "—").toString().trim() || "—";
            const obj = m.get(k) || { descrizione: k, prodotto_sum: 0, righe: 0 };
            obj.prodotto_sum += toNumber(rr?.prodotto);
            obj.righe += 1;
            m.set(k, obj);
          });

          return Array.from(m.values()).sort((a, b) => b.prodotto_sum - a.prodotto_sum);
        }

        const [aggNow, aggPrev] = await Promise.all([aggByDescrizione(nowIds), aggByDescrizione(prevIds)]);

        // 5) Facts heures (tokenisés)
        async function loadHoursFacts(rangeFrom: string, rangeTo: string): Promise<AnyRow[]> {
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

        // 5bis) KPI Indice Produttività (daily) — v3 -> v2 fallback
        function normalizeProd(rows: AnyRow[]): AnyRow[] {
          return (rows || []).map((r: AnyRow) => ({
            report_date: r?.report_date ? String(r.report_date) : null,
            previsto_eff: toNumber(r?.total_previsto_eff),
            prodotto_alloc: toNumber(r?.total_prodotto_alloc),
            ore_indexed: toNumber(r?.total_hours_indexed),
          }));
        }

        async function loadProdDaily(rangeFrom: string, rangeTo: string): Promise<AnyRow[]> {
          const views = ["kpi_operator_global_day_v3", "kpi_operator_global_day_v2"];

          let lastErr: unknown = null;
          for (const view of views) {
            try {
              let q = supabase
                .from(view)
                .select("report_date, total_previsto_eff, total_prodotto_alloc, total_hours_indexed, costr, commessa")
                .gte("report_date", rangeFrom)
                .lte("report_date", rangeTo);

              if (costrFilter.trim()) q = q.eq("costr", costrFilter.trim());
              if (commessaFilter.trim()) q = q.eq("commessa", commessaFilter.trim());

              const { data, error: e } = await q;
              if (e) throw e;
              return normalizeProd(data || []);
            } catch (e) {
              lastErr = e;
              if (!isMissingRelation(e)) throw e;
            }
          }

          if (lastErr) throw lastErr;
          return [];
        }

        const [factsNow, factsPrev, prodNow, prodPrev] = await Promise.all([
          loadHoursFacts(dateFrom, dateTo),
          loadHoursFacts(toISODate(prevFrom), toISODate(prevTo)),
          loadProdDaily(dateFrom, dateTo),
          loadProdDaily(toISODate(prevFrom), toISODate(prevTo)),
        ]);

        // 6) Retards capi J+1 08:30 (planning DAY FROZEN)
        async function loadCapiDelays(
          rangeFrom: string,
          rangeTo: string,
          rapListNow: AnyRow[]
        ): Promise<AnyRow[]> {
          const { data: plans, error: pErr } = await supabase
            .from("manager_plans")
            .select("id, manager_id, plan_date, period_type, status, year_iso, week_iso")
            .gte("plan_date", rangeFrom)
            .lte("plan_date", rangeTo)
            .eq("period_type", "DAY")
            .eq("status", "FROZEN");
          if (pErr) throw pErr;

          const planIds = (plans || []).map((p: AnyRow) => p.id).filter(Boolean);
          if (!planIds.length) return [];

          const { data: slots, error: sErr } = await supabase
            .from("plan_capo_slots")
            .select("id, plan_id, capo_id")
            .in("plan_id", planIds);
          if (sErr) throw sErr;

          const planById = new Map<string, AnyRow>();
          (plans || []).forEach((p: AnyRow) => planById.set(p.id, p));

          const expectedByDate = new Map<string, Set<string>>();
          (slots || []).forEach((s: AnyRow) => {
            const p = planById.get(s.plan_id);
            if (!p?.plan_date || !s?.capo_id) return;
            const d = p.plan_date as string;
            if (!expectedByDate.has(d)) expectedByDate.set(d, new Set());
            expectedByDate.get(d)?.add(String(s.capo_id));
          });

          const reportByDayCapo = new Map<string, Date | null>();
          (rapListNow || []).forEach((r: AnyRow) => {
            const d = r.report_date as string;
            const c = r.capo_id as string;
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

          const capoNameById = new Map<string, string>();
          if (uniqueCapoIds.length) {
            const { data: capiProfiles } = await supabase
              .from("profiles")
              .select("id, full_name, display_name, email")
              .in("id", uniqueCapoIds);
            (capiProfiles || []).forEach((p: AnyRow) => {
              const label =
                (p?.display_name || "").trim() ||
                (p?.full_name || "").trim() ||
                (p?.email || "").trim() ||
                "CAPO";
              capoNameById.set(p.id, label);
            });
          }

          const dates = Array.from(expectedByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

          return dates.map((d) => {
            const expected = expectedByDate.get(d) || new Set<string>();
            const cutoff = cutoffNextDay0830(d);

            let inOrario = 0;
            const lateIds: string[] = [];
            const lateNames: string[] = [];

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
        // eslint-disable-next-line no-console
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

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile, dateFrom, dateTo, costrFilter, commessaFilter]);

  // KPI PRINCIPAUX
  const kpi = useMemo(() => {
    const currCount = rapportiniCurrent.length;
    const prevCount = rapportiniPrevious.length;

    const currRighe = (produzioniAggCurrent || []).reduce((sum, d) => sum + Number(d.righe || 0), 0);

    let incaPrevisti = 0;
    let incaRealizzati = 0;
    let incaPosati = 0;

    (incaTeorico || []).forEach((row) => {
      incaPrevisti += toNumber(row.metri_previsti_totali);
      incaRealizzati += toNumber(row.metri_realizzati);
      incaPosati += toNumber(row.metri_posati);
    });

    const sumHoursFacts = (facts: AnyRow[]) =>
      (facts || []).reduce((acc, f) => {
        const h = toNumber(f?.tempo_hours);
        return h > 0 ? acc + h : acc;
      }, 0);

    const currHours = sumHoursFacts(hoursFactsCurrent);
    const prevHours = sumHoursFacts(hoursFactsPrevious);

    const totalAttesi = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_attesi || 0), 0);
    const totalRitardo = (capiDelayDaily || []).reduce((a, d) => a + Number(d.capi_in_ritardo || 0), 0);
    const lateRate = totalAttesi > 0 ? (totalRitardo / totalAttesi) * 100 : null;

    const sumPrevNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.previsto_eff), 0);
    const sumProdNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.prodotto_alloc), 0);
    const sumHoursIndexedNow = (prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.ore_indexed), 0);
    const productivityIndexNow = sumPrevNow > 0 ? sumProdNow / sumPrevNow : null;

    return {
      currCount,
      prevCount,
      currRighe,
      incaPrevisti,
      incaRealizzati,
      incaPosati,
      currHours,
      prevHours,
      totalAttesi,
      totalRitardo,
      lateRate,
      productivityIndexNow,
      sumPrevNow,
      sumProdNow,
      sumHoursIndexedNow,
    };
  }, [
    rapportiniCurrent,
    rapportiniPrevious,
    incaTeorico,
    produzioniAggCurrent,
    hoursFactsCurrent,
    hoursFactsPrevious,
    capiDelayDaily,
    prodDailyCurrent,
  ]);

  // Timeline data (combo chart)
  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; label: string; rapportini: number; capi_ritardo: number }>();

    (rapportiniCurrent || []).forEach((r) => {
      const key = String(r.report_date || "");
      if (!key) return;
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabel(key), rapportini: 0, capi_ritardo: 0 });
      map.get(key)!.rapportini += 1;
    });

    (capiDelayDaily || []).forEach((d) => {
      const key = String(d.report_date || "");
      if (!key) return;
      if (!map.has(key)) map.set(key, { date: key, label: formatDateLabel(key), rapportini: 0, capi_ritardo: 0 });
      map.get(key)!.capi_ritardo = Number(d.capi_in_ritardo || 0);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rapportiniCurrent, capiDelayDaily]);

  // Trend productivity (line)
  const prodTrend = useMemo(() => {
    const m = new Map<string, { report_date: string; label: string; prev: number; prod: number }>();
    (prodDailyCurrent || []).forEach((r) => {
      if (!r.report_date) return;
      const key = String(r.report_date);
      const cur = m.get(key) || { report_date: key, label: formatDateLabel(key), prev: 0, prod: 0 };
      cur.prev += toNumber(r.previsto_eff);
      cur.prod += toNumber(r.prodotto_alloc);
      m.set(key, cur);
    });

    return Array.from(m.values())
      .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
      .map((x) => ({ ...x, indice: x.prev > 0 ? x.prod / x.prev : null }));
  }, [prodDailyCurrent]);

  // ECharts INCA option
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

  // Modal title/subtitle (fallbacks)
  const modalTitle = useMemo(() => {
    switch (activeKpi) {
      case KPI_IDS.RAPPORTINI:
        return t("KPI_RAPPORTINI", "Rapportini");
      case KPI_IDS.RIGHE:
        return t("KPI_RIGHE_ATTIVITA", "Righe attività");
      case KPI_IDS.PROD:
        return t("KPI_INDICE_PROD", "Indice Produttività");
      case KPI_IDS.INCA_PREV:
        return t("KPI_INCA_PREV", "INCA prev");
      case KPI_IDS.INCA_REAL:
        return t("KPI_INCA_REAL", "INCA real");
      case KPI_IDS.ORE:
        return t("KPI_ORE_LAVORO", "Ore lavoro");
      case KPI_IDS.RITARDI:
        return t("KPI_RITARDI_CAPI", "Ritardi Capi");
      default:
        return t("MODAL_DETAILS", "Dettagli");
    }
  }, [activeKpi]);

  const modalSubtitle = useMemo(() => {
    const windowLabel = t("DIR_WINDOW", "Finestra");
    const costrLabel = t("DIR_COSTR", "COSTR");
    const commessaLabel = t("DIR_COMMESSA", "Commessa");
    return `${windowLabel}: ${formatDateLabel(dateFrom)} → ${formatDateLabel(dateTo)} · ${costrLabel}: ${
      costrFilter || "—"
    } · ${commessaLabel}: ${commessaFilter || "—"}`;
  }, [dateFrom, dateTo, costrFilter, commessaFilter]);

  const modalContent = useMemo(() => {
    switch (activeKpi) {
      case KPI_IDS.RAPPORTINI:
        return <KpiRapportiniDetails rapportini={rapportiniCurrent} dateFrom={dateFrom} dateTo={dateTo} />;
      case KPI_IDS.RIGHE:
        return <KpiRigheDetails produzioniAgg={produzioniAggCurrent} />;
      case KPI_IDS.PROD:
        return (
          <KpiProdIndexDetails
            sumPrevEff={kpi.sumPrevNow}
            sumProdAlloc={kpi.sumProdNow}
            sumHoursIndexed={kpi.sumHoursIndexedNow}
            productivityIndex={kpi.productivityIndexNow}
          />
        );
      case KPI_IDS.INCA_PREV:
        return <KpiIncaDetails incaTeorico={incaTeorico} mode="PREV" />;
      case KPI_IDS.INCA_REAL:
        return <KpiIncaDetails incaTeorico={incaTeorico} mode="REAL" />;
      case KPI_IDS.ORE:
        return <KpiHoursDetails dateFrom={dateFrom} dateTo={dateTo} hoursFacts={hoursFactsCurrent} />;
      case KPI_IDS.RITARDI:
        return <KpiRitardiCapiDetails capiDelayDaily={capiDelayDaily} />;
      default:
        return null;
    }
  }, [activeKpi, rapportiniCurrent, dateFrom, dateTo, produzioniAggCurrent, incaTeorico, capiDelayDaily, hoursFactsCurrent, kpi]);

  // isDark is currently used for future-proofing (shell-level theme toggle). The dashboard itself is styled dark-first.
  // Keeping the prop avoids breaking DirectionShell which passes isDark.

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">{t("DIR_KICKER", "Direzione · CNCS / CORE")}</div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">{t("DIR_TITLE", "Dashboard Direzione")}</h1>
        </div>

        <div className="flex flex-col items-end gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-emerald-400/70 bg-emerald-500/12 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.14)]">
              {t("DIR_READONLY", "Sola lettura")}
            </span>
            <LangSwitcher compact />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">{t("DIR_WINDOW", "Finestra")}:</span>
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

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">{t("DIR_COSTR", "COSTR")}</span>
          <input
            type="text"
            value={costrFilter}
            onChange={(e) => setCostrFilter(e.target.value)}
            placeholder="es. 6368"
            className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 min-w-[72px]">{t("DIR_COMMESSA", "Commessa")}</span>
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
            {t("DIR_RESET_FILTERS", "Reset filtri")}
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-[12px] text-rose-100">{error}</div>}
      {loading && !error && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-2 text-[12px] text-slate-300">{t("DETAILS_LOADING", "Caricamento…")}</div>
      )}

      {/* KPI STRIP (clickable) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <KpiCard
          title={t("KPI_RAPPORTINI", "Rapportini")}
          value={loading ? "—" : String(kpi.currCount)}
          subline={loading ? "" : `${t("KPI_PREV", "Prev")}: ${kpi.prevCount || "—"}`}
          accent="slate"
          onClick={() => setActiveKpi(KPI_IDS.RAPPORTINI)}
        />

        <KpiCard
          title={t("KPI_RIGHE_ATTIVITA", "Righe attività")}
          value={loading ? "—" : formatNumberIT(kpi.currRighe, 0)}
          subline={t("KPI_VS_PREV", "vs prev")}
          accent="sky"
          onClick={() => setActiveKpi(KPI_IDS.RIGHE)}
        />

        <KpiCard
          title={t("KPI_INDICE_PROD", "Indice Produttività")}
          value={loading ? "—" : formatIndexIT(kpi.productivityIndexNow)}
          subline="Σrealizzato / Σprevisto_eff"
          accent="fuchsia"
          onClick={() => setActiveKpi(KPI_IDS.PROD)}
        />

        <KpiCard
          title={t("KPI_INCA_PREV", "INCA prev")}
          value={loading ? "—" : formatNumberIT(kpi.incaPrevisti, 0)}
          subline={t("KPI_METRI", "metri")}
          accent="slate"
          onClick={() => setActiveKpi(KPI_IDS.INCA_PREV)}
        />

        <KpiCard
          title={t("KPI_INCA_REAL", "INCA real")}
          value={loading ? "—" : formatNumberIT(kpi.incaRealizzati, 0)}
          subline={t("KPI_METRI", "metri")}
          accent="emerald"
          onClick={() => setActiveKpi(KPI_IDS.INCA_REAL)}
        />

        <KpiCard
          title={t("KPI_ORE_LAVORO", "Ore lavoro")}
          value={loading ? "—" : formatNumberIT(kpi.currHours, 1)}
          subline={loading ? "" : `${t("KPI_PREV", "Prev")}: ${formatNumberIT(kpi.prevHours, 1)}`}
          accent="amber"
          onClick={() => setActiveKpi(KPI_IDS.ORE)}
        />

        <KpiCard
          title={t("KPI_RITARDI_CAPI", "Ritardi Capi")}
          value={loading ? "—" : kpi.totalAttesi > 0 ? `${kpi.totalRitardo}/${kpi.totalAttesi}` : "—"}
          subline={t("KPI_DEADLINE", "deadline 08:30 (J+1)")}
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
        {modalContent}
      </Modal>

      {/* CHARTS (kept) */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-4">
        <CoreChartCard isDark={isDark} title="Timeline" subtitle="Bar: Ritardi Capi · Line: Rapportini">
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
            emptyHint="Nessun piano DAY FROZEN o nessun rapporto nella finestra."
          />
          <div className="mt-2 text-[11px] text-slate-500">
            Nota: “Ritardi Capi” deriva dal planning (DAY FROZEN) e dalla deadline 08:30 del giorno successivo.
          </div>
        </CoreChartCard>

        <CoreChartCard isDark={isDark} title="INCA" subtitle="Top file/commesse per volume previsto (lettura rapida).">
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
        <CoreChartCard isDark={isDark} title="Trend · Produttività giornaliera" subtitle="Evidenzia deriva o miglioramento (indice su previsto).">
          <CoreLineChart
            loading={loading}
            data={prodTrend}
            height={260}
            xKey="label"
            yLines={[{ key: "indice", name: "Indice", stroke: CORE_CHART_THEME.accent }]}
            yDomain={[0, "auto"]}
            emptyHint="Serve almeno 1 giorno con linee indicizzabili (previsto > 0)."
            yTickFormatter={(v: unknown) => (v == null ? "—" : formatNumberIT(v, 2))}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            KPI range attuale: {kpi.productivityIndexNow == null ? "—" : formatNumberIT(kpi.productivityIndexNow, 2)} · Prev_eff:{" "}
            {formatNumberIT(kpi.sumPrevNow, 0)} · Real_alloc: {formatNumberIT(kpi.sumProdNow, 0)}
          </div>
        </CoreChartCard>

        <CoreChartCard isDark={isDark} title="Produzioni · Top descrizioni" subtitle="Volume (prodotto) per leggere il “perché” senza aprire tabelle.">
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
