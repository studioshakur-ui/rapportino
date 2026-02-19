// src/features/direzione/dashboard/useDirezioneDashboardData.ts

import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../../lib/supabaseClient";
import type {
  DirezioneDashboardDataset,
  DirezioneFilters,
  IncaChantierRow,
  ProdDailyRow,
  ProduzioniAggRow,
  RapportinoHeaderRow,
  HoursFactRow,
  DelayDailyRow,
} from "./types";
import { computePrevWindow, cutoffNextDay0830, isMissingRelation, toNumber } from "./utils";

export type DirezioneDashboardLoadState = {
  loading: boolean;
  error: string | null;
  dataset: DirezioneDashboardDataset;
  prevWindow: { prevFrom: string; prevTo: string };
};

const EMPTY_DATASET: DirezioneDashboardDataset = {
  rapportiniCurrent: [],
  rapportiniPrevious: [],
  incaChantier: [],
  produzioniAggCurrent: [],
  produzioniAggPrevious: [],
  hoursFactsCurrent: [],
  hoursFactsPrevious: [],
  prodDailyCurrent: [],
  prodDailyPrevious: [],
  capiDelayDaily: [],
};

function normalizeProdRows(rows: Array<Record<string, any>>): ProdDailyRow[] {
  return (rows || [])
    .map((r) => {
      const report_date = r?.report_date ? String(r.report_date) : "";
      return {
        report_date,
        previsto_alloc: toNumber(r?.total_previsto_alloc ?? r?.total_previsto_eff ?? 0),
        prodotto_alloc: toNumber(r?.total_prodotto_alloc ?? 0),
        ore_indexed: toNumber(r?.total_hours_indexed ?? 0),
        productivity_index: r?.productivity_index != null ? toNumber(r.productivity_index) : null,
      };
    })
    .filter((x) => !!x.report_date);
}

async function trySelectView<T = any>(
  viewName: string,
  select: string,
  filters: { costr?: string; commessa?: string }
): Promise<{ data: T[]; ok: boolean }> {
  try {
    let q = supabase.from(viewName).select(select);
    if (filters.costr && filters.costr.trim()) q = q.eq("costr", filters.costr.trim());
    if (filters.commessa && filters.commessa.trim()) q = q.eq("commessa", filters.commessa.trim());

    const { data, error } = await q;
    if (error) throw error;
    return { data: (data as T[]) || [], ok: true };
  } catch (e) {
    if (isMissingRelation(e)) return { data: [], ok: false };
    throw e;
  }
}

export function useDirezioneDashboardData(opts: {
  profilePresent: boolean;
  filters: DirezioneFilters;
}): DirezioneDashboardLoadState {
  const { profilePresent, filters } = opts;

  const prevWindow = useMemo(
    () => computePrevWindow(filters.dateFrom, filters.dateTo),
    [filters.dateFrom, filters.dateTo]
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<DirezioneDashboardDataset>(EMPTY_DATASET);

  useEffect(() => {
    if (!profilePresent) return;
    if (!filters.dateFrom || !filters.dateTo) return;

    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        // 1) Rapportini (current) — APPROVED_UFFICIO
        let qNow = supabase
          .from("rapportini_with_capo_v1")
          .select(
            "id, report_date, created_at, updated_at, status, costr, commessa, capo_id, capo_display_name, capo_email, capo_app_role"
          )
          .gte("report_date", filters.dateFrom)
          .lte("report_date", filters.dateTo)
          .eq("status", "APPROVED_UFFICIO")
          .order("report_date", { ascending: true });

        if (filters.costr.trim()) qNow = qNow.eq("costr", filters.costr.trim());
        if (filters.commessa.trim()) qNow = qNow.eq("commessa", filters.commessa.trim());

        const { data: rapNow, error: rapNowErr } = await qNow;
        if (rapNowErr) throw rapNowErr;

        // 2) Rapportini (previous) — same duration just before
        let qPrev = supabase
          .from("rapportini_with_capo_v1")
          .select(
            "id, report_date, created_at, updated_at, status, costr, commessa, capo_id, capo_display_name, capo_email, capo_app_role"
          )
          .gte("report_date", prevWindow.prevFrom)
          .lte("report_date", prevWindow.prevTo)
          .eq("status", "APPROVED_UFFICIO");

        if (filters.costr.trim()) qPrev = qPrev.eq("costr", filters.costr.trim());
        if (filters.commessa.trim()) qPrev = qPrev.eq("commessa", filters.commessa.trim());

        const { data: rapPrev, error: rapPrevErr } = await qPrev;
        if (rapPrevErr) throw rapPrevErr;

        // 3) INCA (chantier) with legacy fallback
        async function loadInca(): Promise<IncaChantierRow[]> {
          // First try new chantier view; if missing, fallback legacy.
          const r1 = await trySelectView<IncaChantierRow>("direzione_inca_chantier_v1", "*", {
            costr: filters.costr,
            commessa: filters.commessa,
          });

          if (r1.ok) {
            return (r1.data || []).map((r) => {
              const teo = toNumber(r.metri_teo_totali);
              const dis = toNumber(r.metri_dis_totali);
              const ref = toNumber(r.metri_ref_totali) || Math.max(teo, dis);
              return {
                ...r,
                metri_previsti_totali: r.metri_previsti_totali ?? r.metri_teo_totali,
                metri_realizzati: r.metri_realizzati ?? r.metri_dis_totali,
                metri_posati: r.metri_posati ?? r.metri_posati_ref,
                metri_ref_totali: ref,
              };
            });
          }

          const r2 = await trySelectView<any>("direzione_inca_teorico", "*", {
            costr: filters.costr,
            commessa: filters.commessa,
          });

          return (r2.data || []).map((r: any) => {
            const teo = toNumber(r?.metri_previsti_totali);
            const dis = toNumber(r?.metri_realizzati);
            const ref = Math.max(teo, dis);
            return {
              ...r,
              metri_ref_totali: ref,
              metri_teo_totali: teo,
              metri_dis_totali: dis,
              metri_posati_ref: r?.metri_posati,
              pct_ref_both: null,
              pct_ref_none: null,
            } as IncaChantierRow;
          });
        }

        const incaChantier = await loadInca();

        // 4) Produzioni agg by descrizione from rapportino_rows (stable)
        const nowIds = (rapNow || []).map((r: any) => r.id).filter(Boolean);
        const prevIds = (rapPrev || []).map((r: any) => r.id).filter(Boolean);

        async function aggByDescrizione(ids: string[]): Promise<ProduzioniAggRow[]> {
          if (!ids.length) return [];
          try {
            const { data: rows, error: e } = await supabase
              .from("rapportino_rows")
              .select("rapportino_id, descrizione, prodotto")
              .in("rapportino_id", ids);
            if (e) return [];

            const m = new Map<string, { descrizione: string; prodotto_sum: number; righe: number }>();
            (rows || []).forEach((rr: any) => {
              const k = (rr?.descrizione ?? "—").toString().trim() || "—";
              const obj = m.get(k) || { descrizione: k, prodotto_sum: 0, righe: 0 };
              obj.prodotto_sum += toNumber(rr?.prodotto);
              obj.righe += 1;
              m.set(k, obj);
            });

            return Array.from(m.values()).sort((a, b) => b.prodotto_sum - a.prodotto_sum) as ProduzioniAggRow[];
          } catch {
            return [];
          }
        }

        const [produzioniAggCurrent, produzioniAggPrevious] = await Promise.all([
          aggByDescrizione(nowIds),
          aggByDescrizione(prevIds),
        ]);

        // 5) Hours facts (tokenizzati) — v4 -> v1 fallback
        async function loadHoursFacts(rangeFrom: string, rangeTo: string): Promise<HoursFactRow[]> {
          const views = ["direzione_operator_facts_v4", "direzione_operator_facts_v1"];
          let lastMissing = false;

          for (const view of views) {
            try {
              let q = supabase
                .from(view)
                .select(
                  "report_date, manager_id, capo_id, ship_id, costr, commessa, ship_code, ship_name, operator_id, tempo_hours, unit"
                )
                .gte("report_date", rangeFrom)
                .lte("report_date", rangeTo);

              if (filters.costr.trim()) q = q.eq("costr", filters.costr.trim());
              if (filters.commessa.trim()) q = q.eq("commessa", filters.commessa.trim());

              const { data, error: e } = await q;
              if (e) throw e;
              return (data || []) as HoursFactRow[];
            } catch (e) {
              if (isMissingRelation(e)) {
                lastMissing = true;
                continue;
              }
              throw e;
            }
          }

          if (lastMissing) return [];
          return [];
        }

        const [hoursFactsCurrent, hoursFactsPrevious] = await Promise.all([
          loadHoursFacts(filters.dateFrom, filters.dateTo),
          loadHoursFacts(prevWindow.prevFrom, prevWindow.prevTo),
        ]);

        // 6) Prod daily (chantier) with fallbacks
        async function loadProdDaily(rangeFrom: string, rangeTo: string): Promise<ProdDailyRow[]> {
          const views = [
            {
              name: "kpi_chantier_global_day_v1",
              select:
                "report_date, total_previsto_alloc, total_prodotto_alloc, total_hours_indexed, productivity_index, costr, commessa",
            },
            {
              name: "kpi_operator_global_day_v3",
              select: "report_date, total_previsto_eff, total_prodotto_alloc, total_hours_indexed, costr, commessa",
            },
            {
              name: "kpi_operator_global_day_v2",
              select: "report_date, total_previsto_eff, total_prodotto_alloc, total_hours_indexed, costr, commessa",
            },
          ];

          let lastMissing = false;

          for (const v of views) {
            try {
              let q = supabase
                .from(v.name)
                .select(v.select)
                .gte("report_date", rangeFrom)
                .lte("report_date", rangeTo);

              if (filters.costr.trim()) q = q.eq("costr", filters.costr.trim());
              if (filters.commessa.trim()) q = q.eq("commessa", filters.commessa.trim());

              const { data, error: e } = await q;
              if (e) throw e;
              return normalizeProdRows((data as any[]) || []);
            } catch (e) {
              if (isMissingRelation(e)) {
                lastMissing = true;
                continue;
              }
              throw e;
            }
          }

          if (lastMissing) return [];
          return [];
        }

        const [prodDailyCurrent, prodDailyPrevious] = await Promise.all([
          loadProdDaily(filters.dateFrom, filters.dateTo),
          loadProdDaily(prevWindow.prevFrom, prevWindow.prevTo),
        ]);

        // 7) Retards capi J+1 08:30 (planning DAY FROZEN) — manager_plans + plan_capo_slots
        async function loadCapiDelay(
          rangeFrom: string,
          rangeTo: string,
          rapListNow: any[]
        ): Promise<DelayDailyRow[]> {
          const { data: plans, error: pErr } = await supabase
            .from("manager_plans")
            .select("id, manager_id, plan_date, period_type, status, year_iso, week_iso")
            .gte("plan_date", rangeFrom)
            .lte("plan_date", rangeTo)
            .eq("period_type", "DAY")
            .eq("status", "FROZEN");
          if (pErr) throw pErr;

          const planIds = (plans || []).map((p: any) => p.id).filter(Boolean);
          if (!planIds.length) return [];

          const { data: slots, error: sErr } = await supabase
            .from("plan_capo_slots")
            .select("id, plan_id, capo_id")
            .in("plan_id", planIds);
          if (sErr) throw sErr;

          const planById = new Map<string, any>();
          (plans || []).forEach((p: any) => planById.set(p.id, p));

          const expectedByDate = new Map<string, Set<string>>();
          (slots || []).forEach((s: any) => {
            const p = planById.get(s.plan_id);
            if (!p?.plan_date || !s?.capo_id) return;
            const d = String(p.plan_date);
            if (!expectedByDate.has(d)) expectedByDate.set(d, new Set());
            expectedByDate.get(d)!.add(String(s.capo_id));
          });

          // earliest created_at per (day, capo)
          const reportByDayCapo = new Map<string, Date | null>();
          (rapListNow || []).forEach((r: any) => {
            const d = String(r.report_date || "");
            const c = String(r.capo_id || "");
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
            (capiProfiles || []).forEach((p: any) => {
              const label =
                String(p?.display_name || "").trim() ||
                String(p?.full_name || "").trim() ||
                String(p?.email || "").trim() ||
                "CAPO";
              capoNameById.set(String(p.id), label);
            });
          }

          const dates = Array.from(expectedByDate.keys()).sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime()
          );

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
              capi_in_ritardo: Math.max(0, expected.size - inOrario),
              capi_in_ritardo_ids: lateIds,
              capi_in_ritardo_nomi: lateNames,
            };
          });
        }

        const capiDelayDaily = await loadCapiDelay(filters.dateFrom, filters.dateTo, rapNow || []);

        if (!cancelled) {
          setDataset({
            rapportiniCurrent: (rapNow || []) as RapportinoHeaderRow[],
            rapportiniPrevious: (rapPrev || []) as RapportinoHeaderRow[],
            incaChantier,
            produzioniAggCurrent,
            produzioniAggPrevious,
            hoursFactsCurrent,
            hoursFactsPrevious,
            prodDailyCurrent,
            prodDailyPrevious,
            capiDelayDaily,
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[useDirezioneDashboardData] load error", e);
        if (!cancelled) {
          setError("Errore nel caricamento dei dati Direzione. Riprova o contatta l’Ufficio.");
          setDataset(EMPTY_DATASET);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    profilePresent,
    filters.dateFrom,
    filters.dateTo,
    filters.costr,
    filters.commessa,
    prevWindow.prevFrom,
    prevWindow.prevTo,
  ]);

  return { loading, error, dataset, prevWindow };
}