// src/features/direzione/dashboard/selectors.ts

import type {
  DirezioneDashboardDataset,
  KpiSummary,
  TimelinePoint,
  ProdTrendPoint,
  ProduzioniAggRow,
} from "./types";
import { formatDateLabel, toNumber } from "./utils";

export function selectKpiSummary(ds: DirezioneDashboardDataset): KpiSummary {
  const currCount = ds.rapportiniCurrent.length;
  const prevCount = ds.rapportiniPrevious.length;

  const currHours = (ds.hoursFactsCurrent || []).reduce((a, r) => a + toNumber(r.tempo_hours), 0);
  const prevHours = (ds.hoursFactsPrevious || []).reduce((a, r) => a + toNumber(r.tempo_hours), 0);

  const currRighe = (ds.produzioniAggCurrent || []).reduce((a, r) => a + Number(r.righe || 0), 0);
  const prevRighe = (ds.produzioniAggPrevious || []).reduce((a, r) => a + Number(r.righe || 0), 0);

  let incaBaselineRef = 0;
  let incaDisAudit = 0;
  let incaPosatiRef = 0;
  (ds.incaChantier || []).forEach((row) => {
    const teo = toNumber(row.metri_teo_totali ?? row.metri_previsti_totali);
    const dis = toNumber(row.metri_dis_totali ?? row.metri_realizzati);
    const ref = toNumber(row.metri_ref_totali) || Math.max(teo, dis);
    const pos = toNumber(row.metri_posati_ref ?? row.metri_posati);

    incaBaselineRef += ref;
    incaDisAudit += dis;
    incaPosatiRef += pos;
  });

  const sumPrevNow = (ds.prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.previsto_alloc), 0);
  const sumProdNow = (ds.prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.prodotto_alloc), 0);
  const sumHoursIndexedNow = (ds.prodDailyCurrent || []).reduce((a, r) => a + toNumber(r.ore_indexed), 0);
  const productivityIndexNow = sumPrevNow > 0 ? sumProdNow / sumPrevNow : null;

  const totalAttesi = (ds.capiDelayDaily || []).reduce((a, r) => a + Number(r.capi_attesi || 0), 0);
  const totalRitardo = (ds.capiDelayDaily || []).reduce((a, r) => a + Number(r.capi_in_ritardo || 0), 0);

  return {
    currCount,
    prevCount,
    currRighe,
    prevRighe,
    incaBaselineRef,
    incaDisAudit,
    incaPosatiRef,
    currHours,
    prevHours,
    sumPrevNow,
    sumProdNow,
    sumHoursIndexedNow,
    productivityIndexNow,
    totalAttesi,
    totalRitardo,
  };
}

export function selectTimeline(ds: DirezioneDashboardDataset): TimelinePoint[] {
  const map = new Map<string, TimelinePoint>();

  (ds.rapportiniCurrent || []).forEach((r) => {
    const key = String(r.report_date || "");
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { date: key, label: formatDateLabel(key), rapportini: 0, capi_ritardo: 0 });
    }
    map.get(key)!.rapportini += 1;
  });

  (ds.capiDelayDaily || []).forEach((d) => {
    const key = String(d.report_date || d.day_date || "");
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { date: key, label: formatDateLabel(key), rapportini: 0, capi_ritardo: 0 });
    }
    map.get(key)!.capi_ritardo = Number(d.capi_in_ritardo || 0);
  });

  return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function selectProdTrend(ds: DirezioneDashboardDataset): ProdTrendPoint[] {
  const m = new Map<string, { report_date: string; label: string; prev: number; prod: number }>();

  (ds.prodDailyCurrent || []).forEach((r) => {
    const key = String(r.report_date || "");
    if (!key) return;
    const cur = m.get(key) || { report_date: key, label: formatDateLabel(key), prev: 0, prod: 0 };
    cur.prev += toNumber(r.previsto_alloc);
    cur.prod += toNumber(r.prodotto_alloc);
    m.set(key, cur);
  });

  return Array.from(m.values())
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime())
    .map((x) => ({ ...x, indice: x.prev > 0 ? x.prod / x.prev : null }));
}

export function selectTopProduzioni(rows: ProduzioniAggRow[], topN: number = 10): ProduzioniAggRow[] {
  const safe = (rows || []).slice();
  safe.sort((a, b) => (b.prodotto_sum || 0) - (a.prodotto_sum || 0));
  return safe.slice(0, topN);
}
