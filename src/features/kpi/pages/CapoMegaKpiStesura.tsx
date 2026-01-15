// src/features/kpi/pages/CapoMegaKpiStesura.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import MegaKpiCapoStesuraPanel from "../components/MegaKpiCapoStesuraPanel";
import KpiCard from "../components/KpiCard";
import CenterModal from "../../../components/overlay/CenterModal";

import CoreEChart from "../../../components/charts/CoreEChart";
import { CORE_CHART_THEME, coreTooltipStyle, formatCompactNumber } from "../../../components/charts/coreChartTheme";
import { cn } from "../../../ui/cn";
import { supabase } from "../../../lib/supabaseClient";
import { useShip } from "../../../context/ShipContext";

type ShipLike = {
  id: string;
  name?: string | null;
  code?: string | null;
  costr?: string | null;
  commessa?: string | null;
};

type WorktimeDailyRow = {
  date: string;
  hours: number;
  overtime_hours: number;
};

type CapoKpiWorktimeResponse = {
  meta?: {
    date_from?: string;
    date_to?: string;
    scope?: { costr?: string | null; commessa?: string | null };
  };
  headline?: {
    today?: { date?: string; hours?: number; overtime_hours?: number };
    week?: { date_from?: string; date_to?: string; hours?: number; overtime_hours?: number };
  };
  series?: {
    daily?: WorktimeDailyRow[];
  };
  error?: string;
  message?: string;
};

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonthISO(dISO: string): string {
  const [y, m] = dISO.split("-");
  return `${y}-${m}-01`;
}

function shiftDaysISO(dISO: string, deltaDays: number): string {
  const [y, m, d] = dISO.split("-").map((x) => Number(x));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateIt(dISO: string): string {
  const [y, m, d] = String(dISO).split("-");
  return `${d}/${m}/${y}`;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type WorktimeMode = "OGGI" | "7J" | "MTD";

function buildWorktimeOption(data: CapoKpiWorktimeResponse | undefined): unknown {
  const theme = CORE_CHART_THEME;

  const daily = Array.isArray(data?.series?.daily) ? data!.series!.daily! : [];
  const x = daily.map((r) => r.date);
  const yHours = daily.map((r) => safeNum(r.hours));
  const yOT = daily.map((r) => safeNum(r.overtime_hours));

  return {
    backgroundColor: "transparent",
    animation: true,
    animationDuration: 900,
    animationEasing: "cubicOut",
    grid: { left: 10, right: 10, top: 18, bottom: 34, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      confine: true,
      backgroundColor: coreTooltipStyle(theme).backgroundColor,
      borderColor: coreTooltipStyle(theme).border,
      borderWidth: 1,
      extraCssText: [
        "border-radius: 12px",
        "box-shadow: 0 12px 32px rgba(0,0,0,0.35)",
        "padding: 10px 12px",
        "color: #e5e7eb",
        "font-size: 12px",
      ].join(";"),
      formatter: (params: Array<{ dataIndex?: number }>) => {
        const p0 = Array.isArray(params) ? params[0] : null;
        const idx = (p0?.dataIndex ?? 0) as number;
        const row = daily[idx] as WorktimeDailyRow | undefined;
        if (!row) return "";

        const s: string[] = [];
        s.push(`<div style="font-weight:700;margin-bottom:6px">${row.date}</div>`);
        s.push(`<div><span style="color:#94a3b8">Ore</span>: <b>${formatCompactNumber(safeNum(row.hours))}</b> h</div>`);
        s.push(
          `<div><span style="color:#94a3b8">Straordinario</span>: <b>${formatCompactNumber(
            safeNum(row.overtime_hours)
          )}</b> h</div>`
        );
        return s.join("");
      },
    },
    xAxis: {
      type: "category",
      data: x,
      axisLabel: { color: theme.subtext, fontSize: 11 },
      axisLine: { lineStyle: { color: theme.axisLine } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: theme.subtext, fontSize: 11 },
      splitLine: { lineStyle: { color: theme.gridLine } },
    },
    series: [
      {
        name: "Ore",
        type: "bar",
        data: yHours,
        barMaxWidth: 22,
        itemStyle: { opacity: 0.85 },
      },
      {
        name: "Straordinario",
        type: "bar",
        data: yOT,
        barMaxWidth: 22,
        itemStyle: { opacity: 0.55 },
      },
    ],
    legend: {
      top: 0,
      textStyle: { color: theme.subtext, fontSize: 11 },
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 18,
        bottom: 8,
        borderColor: "transparent",
        backgroundColor: "rgba(15,23,42,0.35)",
        fillerColor: "rgba(56,189,248,0.12)",
        handleStyle: { color: "rgba(56,189,248,0.35)", borderColor: "rgba(56,189,248,0.55)" },
        textStyle: { color: theme.subtext },
      },
    ],
  };
}

export default function CapoMegaKpiStesura({ isDark = true }: { isDark?: boolean }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const { currentShip, ships, loadingShips, setCurrentShip, refreshShips } = useShip();

  const resolvedShip: ShipLike | null = useMemo(() => {
    if ((currentShip as ShipLike | null)?.id) return currentShip as ShipLike;

    const sid = (location as unknown as { state?: { shipId?: string } })?.state?.shipId;
    if (sid && Array.isArray(ships)) {
      const found = (ships as ShipLike[]).find((s) => String(s.id) === String(sid));
      if (found) return found;
    }

    if (Array.isArray(ships) && ships.length > 0) return ships[0] as ShipLike;
    return null;
  }, [currentShip, ships, location]);

  // Hooks must be unconditional.
  const todayISO = useMemo(() => getTodayISO(), []);
  const [worktimeOpen, setWorktimeOpen] = useState(false);
  const [worktimeMode, setWorktimeMode] = useState<WorktimeMode>("MTD");

  const costr = resolvedShip?.costr ?? resolvedShip?.code ?? null;
  const commessa = resolvedShip?.commessa ?? null;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!Array.isArray(ships) || ships.length === 0) {
        await refreshShips();
      }
      if (!alive) return;
      if (resolvedShip && (!currentShip || (currentShip as ShipLike).id !== resolvedShip.id)) {
        setCurrentShip(resolvedShip as unknown as any);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedShip?.id]);

  // ===== KPI 4: Worktime (week card + cockpit) =====
  const weekQuery = useQuery<CapoKpiWorktimeResponse>({
    queryKey: ["capo-kpi-worktime-week-v1", String(costr || ""), String(commessa || "")],
    enabled: Boolean(costr),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("capo_kpi_worktime_v1", {
        p_costr: costr ?? null,
        p_commessa: commessa ?? null,
        // backend defaults week range if null
        p_date_from: null,
        p_date_to: null,
      });
      if (error) throw error;
      return data as CapoKpiWorktimeResponse;
    },
  });

  const rangeForMode = useMemo(() => {
    if (worktimeMode === "OGGI") {
      return { from: todayISO, to: todayISO };
    }
    if (worktimeMode === "7J") {
      return { from: shiftDaysISO(todayISO, -6), to: todayISO };
    }
    return { from: startOfMonthISO(todayISO), to: todayISO };
  }, [worktimeMode, todayISO]);

  const worktimeQuery = useQuery<CapoKpiWorktimeResponse>({
    queryKey: ["capo-kpi-worktime-v1", String(costr || ""), String(commessa || ""), worktimeMode, rangeForMode.from, rangeForMode.to],
    enabled: Boolean(costr) && worktimeOpen,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("capo_kpi_worktime_v1", {
        p_costr: costr ?? null,
        p_commessa: commessa ?? null,
        p_date_from: rangeForMode.from,
        p_date_to: rangeForMode.to,
      });
      if (error) throw error;
      return data as CapoKpiWorktimeResponse;
    },
  });

  const weekHours = safeNum(weekQuery.data?.headline?.week?.hours);
  const weekOT = safeNum(weekQuery.data?.headline?.week?.overtime_hours);

  const worktimeOption = useMemo(() => buildWorktimeOption(worktimeQuery.data), [worktimeQuery.data]);
  const worktimeEmpty = useMemo(() => {
    const daily = worktimeQuery.data?.series?.daily;
    return !Array.isArray(daily) || daily.length === 0;
  }, [worktimeQuery.data]);

  if (loadingShips && !resolvedShip) {
    return (
      <div className="p-4 sm:p-6">
        <div className={cn("rounded-2xl border px-4 py-4", isDark ? "border-slate-800 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-white text-slate-800")}>
          <div className="text-[11px] uppercase tracking-[0.20em] mb-1 text-slate-400">CNCS · Capo</div>
          <div className="text-lg font-semibold mb-1 text-slate-50">Mega KPI · Posa cavi</div>
          <div className="text-sm text-slate-400">Caricamento nave…</div>
        </div>
      </div>
    );
  }

  if (!resolvedShip) {
    return (
      <div className="p-4 sm:p-6">
        <div className={cn("rounded-2xl border px-4 py-4", isDark ? "border-slate-800 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-white text-slate-800")}>
          <div className="text-[11px] uppercase tracking-[0.20em] mb-1 text-slate-400">CNCS · Capo</div>
          <div className="text-lg font-semibold mb-1 text-slate-50">Mega KPI · Posa cavi</div>
          <div className="text-sm text-slate-400 mb-3">Nessuna nave disponibile o nave non selezionata.</div>
          <button
            type="button"
            onClick={() => navigate("/app/ship-selector")}
            className={cn("rounded-xl px-3 py-2 text-sm font-semibold", isDark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-900 text-white")}
          >
            Seleziona nave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className={cn("rounded-2xl border px-4 py-4", isDark ? "border-slate-800 bg-slate-950/60 text-slate-200" : "border-slate-200 bg-white text-slate-800")}>
        <div className="text-[11px] uppercase tracking-[0.20em] mb-1 text-slate-400">CNCS · Capo</div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <div className="text-lg font-semibold text-slate-50">Mega KPI · Posa cavi</div>
            <div className="text-sm text-slate-400">
              Curva cumulata basata su INCA (scope) + rapportini (stesura + ripresa). Fascettatura esclusa.
            </div>
          </div>

          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Nave:</span>{" "}
            <span className="font-semibold text-slate-100">{resolvedShip.name || resolvedShip.code || resolvedShip.id}</span>
            {costr ? (
              <>
                {" "}
                <span className="text-slate-500">· costr:</span> <span className="font-mono text-slate-200">{String(costr)}</span>
              </>
            ) : null}
            {commessa ? (
              <>
                {" "}
                <span className="text-slate-500">· commessa:</span> <span className="font-mono text-slate-200">{String(commessa)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* KPI Hub (V1): KPI #4 enabled now (worktime). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          isDark={isDark}
          tone="sky"
          label="Ore settimana (Lun–Ven)"
          value={`${formatCompactNumber(weekHours)} h`}
          sub={weekOT > 0 ? `Straordinario: ${formatCompactNumber(weekOT)} h` : "Straordinario: —"}
          hint="Apri cockpit"
          onClick={() => {
            setWorktimeMode("MTD");
            setWorktimeOpen(true);
          }}
        />
      </div>

      <MegaKpiCapoStesuraPanel isDark={isDark} costr={costr} commessa={commessa} />

      <CenterModal
        open={worktimeOpen}
        onClose={() => setWorktimeOpen(false)}
        isDark={isDark}
        widthClass="max-w-6xl"
        title="Ore · Cockpit"
        subtitle="Perimetro: rapportini firmati dal Capo. Toggle rapido: Oggi / 7j / MTD."
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
            Range: <span className={cn("font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>{formatDateIt(rangeForMode.from)}</span> →{" "}
            <span className={cn("font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>{formatDateIt(rangeForMode.to)}</span>
          </div>

          <div className="flex items-center gap-2">
            {(["OGGI", "7J", "MTD"] as WorktimeMode[]).map((m) => {
              const active = worktimeMode === m;
              const label = m === "OGGI" ? "Oggi" : m === "7J" ? "7j" : "MTD";
              return (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold shadow-soft",
                    active ? "border-sky-500/30 bg-sky-500/10 text-sky-200" : "border-border/30 bg-white/5 text-foreground hover:bg-white/10",
                    worktimeQuery.isFetching ? "opacity-70" : ""
                  )}
                  onClick={() => setWorktimeMode(m)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className={cn("rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>Sintesi</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>Ore</div>
                <div className={cn("text-sm font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                  {formatCompactNumber(safeNum(worktimeQuery.data?.series?.daily?.reduce((a, r) => a + safeNum(r.hours), 0) ?? 0))} h
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>Straordinario</div>
                <div className={cn("text-sm font-semibold", isDark ? "text-slate-100" : "text-slate-900")}>
                  {formatCompactNumber(safeNum(worktimeQuery.data?.series?.daily?.reduce((a, r) => a + safeNum(r.overtime_hours), 0) ?? 0))} h
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-600")}>
                  Regola straordinario: max(ore_giorno − 8, 0) (Lun–Ven).
                </div>
              </div>
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4 lg:col-span-2", isDark ? "border-slate-800/70 bg-slate-950/35" : "border-slate-200 bg-white")}>
            <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>Curva ore</div>
            <div className="mt-3">
              <CoreEChart
                option={worktimeOption as any}
                height={360}
                loading={worktimeQuery.isFetching}
                empty={worktimeEmpty}
                emptyLabel="Nessun dato ore"
                emptyHint="Verifica di avere rapportini firmati con tempo (ore) valorizzato sugli operatori."
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      </CenterModal>
    </div>
  );
}
