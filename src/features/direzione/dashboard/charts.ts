// src/features/direzione/dashboard/charts.ts

import { CORE_CHART_THEME } from "../../../components/charts";
import type { IncaChantierRow } from "./types";
import { toNumber } from "./utils";

export type EChartsOption = Record<string, any>;

export function buildIncaOption(incaChantier: IncaChantierRow[]): EChartsOption {
  const hasRows = (incaChantier || []).length > 0;

  if (!hasRows) {
    return {
      title: { text: "INCA · nessun dato", textStyle: { color: CORE_CHART_THEME.subtext, fontSize: 12 } },
      grid: CORE_CHART_THEME.grid,
      xAxis: { type: "category", data: [] },
      yAxis: { type: "value" },
      series: [],
    };
  }

  const sorted = [...incaChantier].sort((a, b) => {
    const aRef =
      toNumber(a.metri_ref_totali) ||
      Math.max(toNumber(a.metri_teo_totali ?? a.metri_previsti_totali), toNumber(a.metri_dis_totali ?? a.metri_realizzati));
    const bRef =
      toNumber(b.metri_ref_totali) ||
      Math.max(toNumber(b.metri_teo_totali ?? b.metri_previsti_totali), toNumber(b.metri_dis_totali ?? b.metri_realizzati));
    return bRef - aRef;
  });

  const top = sorted.slice(0, 12);

  const labels = top.map((row) => {
    const file = (row.nome_file || "").toString();
    if (file) return file.length > 26 ? `${file.slice(0, 26)}…` : file;
    if (row.commessa) return `${(row.costr || "").toString().trim()} · ${(row.commessa || "").toString().trim()}`.trim();
    if (row.costr) return (row.costr || "").toString().trim();
    return "";
  });

  const baselineRef = top.map((r) => {
    const teo = toNumber(r.metri_teo_totali ?? r.metri_previsti_totali);
    const dis = toNumber(r.metri_dis_totali ?? r.metri_realizzati);
    const ref = toNumber(r.metri_ref_totali) || Math.max(teo, dis);
    return ref;
  });
  const disAudit = top.map((r) => toNumber(r.metri_dis_totali ?? r.metri_realizzati));
  const posatiRef = top.map((r) => toNumber(r.metri_posati_ref ?? r.metri_posati));

  return {
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Baseline (ref)", "Dis (audit)", "Posati (ref)"],
      textStyle: { color: CORE_CHART_THEME.text, fontSize: 11 },
    },
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
      { name: "Baseline (ref)", type: "bar", data: baselineRef, emphasis: { focus: "series" } },
      { name: "Dis (audit)", type: "bar", data: disAudit, emphasis: { focus: "series" } },
      { name: "Posati (ref)", type: "line", data: posatiRef, smooth: true },
    ],
    color: [CORE_CHART_THEME.info, CORE_CHART_THEME.positive, CORE_CHART_THEME.warning],
  };
}
