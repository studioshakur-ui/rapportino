import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import { AppBar, EmptyState, Screen, Section, StatCard } from "../../../components/command-ui";
import ECharts from "../../../components/charts/ECharts";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";

export default function GraficiPage(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  const charts = data?.charts ?? null;

  const systemChart = buildSystemClosureOption(charts?.system_closures ?? []);
  const zoneChart = buildBlockedZoneOption(charts?.blocked_by_zone ?? []);
  const telegramChart = buildTelegramTrendOption(charts?.telegram_trend ?? []);
  const incaChart = buildIncaDistributionOption(charts?.inca_distribution ?? []);

  return (
    <Screen className="max-w-7xl space-y-6">
      <AppBar
        title="Grafici"
        subtitle="Solo grafici métier: chiusure per sistema, bloccati per zona, trend Telegram e distribuzione INCA."
      />

      {!isLoading && !charts ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Non ci sono ancora dati sufficienti per costruire i grafici di chiusura."
          icon="📊"
        />
      ) : null}

      {charts ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Sistemi" value={charts.system_closures.length} tone="neutral" />
            <StatCard label="Zone" value={charts.blocked_by_zone.length} tone="amber" />
            <StatCard label="Telegram" value={charts.telegram_trend.length} tone="sky" />
            <StatCard label="Stati INCA" value={charts.inca_distribution.length} tone="violet" />
          </div>

          <section className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Chiusure per sistema" eyebrow="Sistema" option={systemChart} />
            <ChartCard title="Apparati bloccati per zona" eyebrow="Zona" option={zoneChart} />
            <ChartCard title="Trend prove Telegram" eyebrow="Messaggi" option={telegramChart} />
            <ChartCard title="Distribuzione situazione INCA" eyebrow="Stato" option={incaChart} />
          </section>
        </>
      ) : null}
    </Screen>
  );
}

function ChartCard({
  title,
  eyebrow,
  option,
}: {
  title: string;
  eyebrow: string;
  option: EChartsOption;
}): JSX.Element {
  return (
    <Section title={title} eyebrow={eyebrow} className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <ECharts option={option} style={{ height: 300, width: "100%" }} isDark={false} />
    </Section>
  );
}

function buildSystemClosureOption(
  rows: Array<{ system: string; closed_equipments: number; open_equipments: number; blocked_equipments: number }>
): EChartsOption {
  return {
    grid: { left: 56, right: 20, top: 20, bottom: 30, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rows.map((row) => row.system), axisLabel: { width: 120, overflow: "truncate" } },
    series: [
      { name: "Chiusi", type: "bar", stack: "total", data: rows.map((row) => row.closed_equipments), itemStyle: { color: "#16a34a" } },
      { name: "Aperti", type: "bar", stack: "total", data: rows.map((row) => row.open_equipments), itemStyle: { color: "#f59e0b" } },
      { name: "Bloccati", type: "bar", stack: "total", data: rows.map((row) => row.blocked_equipments), itemStyle: { color: "#dc2626" } },
    ],
  };
}

function buildBlockedZoneOption(
  rows: Array<{ zone: string; blocked_equipments: number; open_equipments: number; closed_equipments: number }>
): EChartsOption {
  return {
    grid: { left: 42, right: 20, top: 20, bottom: 48, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: rows.map((row) => row.zone), axisLabel: { interval: 0, rotate: 20 } },
    yAxis: { type: "value" },
    series: [
      { name: "Bloccati", type: "bar", data: rows.map((row) => row.blocked_equipments), itemStyle: { color: "#dc2626" } },
      { name: "Aperti", type: "bar", data: rows.map((row) => row.open_equipments), itemStyle: { color: "#f59e0b" } },
      { name: "Chiusi", type: "bar", data: rows.map((row) => row.closed_equipments), itemStyle: { color: "#16a34a" } },
    ],
  };
}

function buildTelegramTrendOption(
  rows: Array<{ label: string; total_messages: number; with_cables: number; blocking: number }>
): EChartsOption {
  return {
    grid: { left: 42, right: 20, top: 20, bottom: 42, containLabel: true },
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    xAxis: { type: "category", data: rows.map((row) => row.label) },
    yAxis: { type: "value" },
    series: [
      { name: "Messaggi", type: "line", smooth: true, data: rows.map((row) => row.total_messages), itemStyle: { color: "#0284c7" }, lineStyle: { color: "#0284c7" } },
      { name: "Con cavi", type: "line", smooth: true, data: rows.map((row) => row.with_cables), itemStyle: { color: "#16a34a" }, lineStyle: { color: "#16a34a" } },
    ],
  };
}

function buildIncaDistributionOption(
  rows: Array<{ label: string; count: number }>
): EChartsOption {
  return {
    grid: { left: 18, right: 18, top: 24, bottom: 24, containLabel: true },
    tooltip: { trigger: "item" },
    legend: { orient: "vertical", left: "left" },
    series: [
      {
        name: "Situazione INCA",
        type: "pie",
        radius: "65%",
        center: ["58%", "55%"],
        data: rows.map((row) => ({ name: row.label, value: row.count })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.12)" } },
      },
    ],
  };
}
