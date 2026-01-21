import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { RevealOnScroll } from "./RevealOnScroll";

type T = {
  s2Title: string;
  s2Subtitle: string;
  s2KickerRight: string;

  s2Tabs: {
    identity: string;
    operational: string;
    evidence: string;
    anomalies: string;
  };

  s2Badges: {
    identity: string;
    operational: string;
    evidence: string;
    anomalies: string;
  };

  s2Identity: {
    title: string;
    body: string;
    table: {
      cols: [string, string, string];
      rows: Array<[string, string, string]>;
    };
  };

  s2Operational: {
    title: string;
    body: string;
    chartTitle: string;
    // Three compact “signals” under the chart.
    signals: {
      s1K: string;
      s1V: string;
      s2K: string;
      s2V: string;
      s3K: string;
      s3V: string;
    };
  };

  s2Evidence: {
    title: string;
    body: string;
    table: {
      cols: [string, string, string];
      rows: Array<[string, string, string]>;
    };
  };

  s2Anomalies: {
    title: string;
    body: string;
    table: {
      cols: [string, string, string];
      rows: Array<[string, string, string]>;
    };
  };

  s2FooterLeft: string;
  s2FooterRight: string;
};

type Props = { t: T };

type SlideKey = "identity" | "operational" | "evidence" | "anomalies";

type Slide = {
  key: SlideKey;
  tabLabel: string;
  badge: string;
  title: string;
  body: string;
  kind: "TABLE" | "CHART";
  table?: {
    cols: [string, string, string];
    rows: Array<[string, string, string]>;
  };
};

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function usePrefersReducedMotion(): boolean {
  return useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  }, []);
}

function useIsCoarsePointer(): boolean {
  return useMemo(() => {
    try {
      return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    } catch {
      return false;
    }
  }, []);
}

function buildOperationalChartOption(): Record<string, unknown> {
  // Minimal, deterministic curves that rise and cross.
  // No tooltip, no axes, no animation: “instrument-grade”.
  const x = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"];
  const planned = [12, 18, 26, 34, 42, 50, 58, 66];
  const produced = [8, 16, 28, 38, 46, 52, 56, 60];

  return {
    animation: false,
    grid: { left: 14, right: 14, top: 10, bottom: 6, containLabel: false },
    tooltip: { show: false },
    xAxis: {
      type: "category",
      data: x,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        type: "line",
        data: planned,
        smooth: 0.42,
        symbol: "none",
        lineStyle: { width: 2, color: "rgba(226,232,240,0.62)" },
        emphasis: { disabled: true },
      },
      {
        type: "line",
        data: produced,
        smooth: 0.42,
        symbol: "none",
        lineStyle: { width: 2.2, color: "rgba(56,189,248,0.92)" },
        emphasis: { disabled: true },
      },
    ],
  };
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative shrink-0 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.26em] transition",
        active
          ? "border-sky-500/40 bg-slate-950/60 text-slate-200"
          : "border-slate-800 bg-slate-950/35 text-slate-500 hover:border-slate-700 hover:text-slate-300"
      )}
    >
      {label}
    </button>
  );
}

function RightPanelTable({
  badge,
  title,
  body,
  table,
}: {
  badge: string;
  title: string;
  body: string;
  table: { cols: [string, string, string]; rows: Array<[string, string, string]> };
}): JSX.Element {
  return (
    <div className="relative z-10">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[56ch]">
          <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">{title}</div>
          <div className="mt-3 text-xl text-slate-100 leading-snug">{body}</div>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{badge}</span>
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/45">
        <div className="grid grid-cols-3 bg-slate-950/60">
          {table.cols.map((c) => (
            <div key={c} className="px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              {c}
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-700/60">
          {table.rows.map((row, i) => (
            <div key={i} className="grid grid-cols-3">
              <div className="px-4 py-3.5 text-[14px] text-slate-100">{row[0]}</div>
              <div className="px-4 py-3.5 text-[14px] text-slate-300">{row[1]}</div>
              <div className="px-4 py-3.5 text-[14px] text-slate-400">{row[2]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RightPanelChart({
  badge,
  title,
  body,
  chartTitle,
  signals,
}: {
  badge: string;
  title: string;
  body: string;
  chartTitle: string;
  signals: {
    s1K: string;
    s1V: string;
    s2K: string;
    s2V: string;
    s3K: string;
    s3V: string;
  };
}): JSX.Element {
  const option = useMemo(() => buildOperationalChartOption(), []);

  return (
    <div className="relative z-10">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[56ch]">
          <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">{title}</div>
          <div className="mt-3 text-xl text-slate-100 leading-snug">{body}</div>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{badge}</span>
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/55 overflow-hidden">
        <div className="px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">{chartTitle}</div>
        <div className="h-[200px]">
          <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{signals.s1K}</div>
          <div className="mt-1 text-sm text-slate-100">{signals.s1V}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{signals.s2K}</div>
          <div className="mt-1 text-sm text-slate-100">{signals.s2V}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{signals.s3K}</div>
          <div className="mt-1 text-sm text-slate-100">{signals.s3V}</div>
        </div>
      </div>
    </div>
  );
}

export function ControlLayerSection({ t }: Props): JSX.Element {
  const reduceMotion = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "identity",
        tabLabel: t.s2Tabs.identity,
        badge: t.s2Badges.identity,
        title: t.s2Identity.title,
        body: t.s2Identity.body,
        kind: "TABLE",
        table: t.s2Identity.table,
      },
      {
        key: "operational",
        tabLabel: t.s2Tabs.operational,
        badge: t.s2Badges.operational,
        title: t.s2Operational.title,
        body: t.s2Operational.body,
        kind: "CHART",
      },
      {
        key: "evidence",
        tabLabel: t.s2Tabs.evidence,
        badge: t.s2Badges.evidence,
        title: t.s2Evidence.title,
        body: t.s2Evidence.body,
        kind: "TABLE",
        table: t.s2Evidence.table,
      },
      {
        key: "anomalies",
        tabLabel: t.s2Tabs.anomalies,
        badge: t.s2Badges.anomalies,
        title: t.s2Anomalies.title,
        body: t.s2Anomalies.body,
        kind: "TABLE",
        table: t.s2Anomalies.table,
      },
    ],
    [t]
  );

  const [active, setActive] = useState(0);
  const hoverLockRef = useRef(false);

  // Auto-advance ONLY on desktop pointer and only if motion is allowed.
  useEffect(() => {
    if (reduceMotion) return;
    if (coarse) return;
    const id = window.setInterval(() => {
      if (hoverLockRef.current) return;
      setActive((a) => (a + 1) % slides.length);
    }, 14000);
    return () => window.clearInterval(id);
  }, [coarse, reduceMotion, slides.length]);

  // Local mouse vars for subtle edge light (section-only), without React re-render.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width)));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / Math.max(1, r.height)));
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        el.style.setProperty("--cl-mx", `${Math.round(x * 100)}%`);
        el.style.setProperty("--cl-my", `${Math.round(y * 100)}%`);
      });
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Mobile slider (scroll-snap). Tabs scroll to the right slide.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const onScrollRaf = useRef<number | null>(null);
  const syncActiveFromScroll = () => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const w = sc.clientWidth || 1;
    const idx = Math.max(0, Math.min(slides.length - 1, Math.round(sc.scrollLeft / w)));
    setActive(idx);
  };

  const scrollToIndex = (idx: number) => {
    const sc = scrollerRef.current;
    if (!sc) {
      setActive(idx);
      return;
    }
    const w = sc.clientWidth || 1;
    sc.scrollTo({ left: idx * w, behavior: reduceMotion ? "auto" : "smooth" });
    setActive(idx);
  };

  const activeSlide = slides[active] ?? slides[0];

  return (
    <RevealOnScroll className="relative">
      <div
        ref={rootRef}
        className="rounded-3xl border border-slate-800/70 bg-slate-950/25 backdrop-blur p-7 md:p-9"
        style={{
          // fallback for edge light
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ["--cl-mx" as unknown as string]: "50%",
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ["--cl-my" as unknown as string]: "35%",
        }}
      >
        {/* Minimal motion: one rare “surge” only (not a continuous dash) */}
        <style>{`
          @keyframes clSurge {
            0% { opacity: 0; }
            7% { opacity: 0.22; }
            16% { opacity: 0; }
            100% { opacity: 0; }
          }
          @keyframes clSurgeMove {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -620; }
          }
        `}</style>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-100">{t.s2Title}</div>
            <div className="mt-2 text-base text-slate-400 max-w-2xl">{t.s2Subtitle}</div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{t.s2KickerRight}</div>
        </div>

        {/* Tabs (works both mobile + desktop) */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
          {slides.map((s, idx) => (
            <TabButton key={s.key} label={s.tabLabel} active={idx === active} onClick={() => scrollToIndex(idx)} />
          ))}
        </div>

        {/* Desktop: instrument panel */}
        <div className="mt-6 hidden lg:grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-3">
            {slides.map((s, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={s.key}
                  type="button"
                  onPointerEnter={() => {
                    hoverLockRef.current = true;
                    setActive(idx);
                  }}
                  onPointerLeave={() => {
                    hoverLockRef.current = false;
                  }}
                  onClick={() => setActive(idx)}
                  className={cx(
                    "relative w-full text-left rounded-2xl border px-5 py-4 transition overflow-hidden",
                    isActive ? "border-sky-500/28 bg-slate-950/55" : "border-slate-800 bg-slate-950/38 hover:border-slate-700"
                  )}
                >
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="text-[12px] uppercase tracking-[0.24em] text-slate-400">{s.title}</div>
                    <span className="shrink-0 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{s.badge}</span>
                    </span>
                  </div>
                  <div className="relative z-10 mt-2 text-sm text-slate-300 leading-relaxed">{s.body}</div>
                </button>
              );
            })}
          </div>

          <div className="col-span-8">
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950/35 backdrop-blur p-6 shadow-[0_28px_90px_rgba(2,6,23,0.62)]">
              {/* Ultra subtle edge light */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-2xl"
                style={{
                  padding: 1,
                  background:
                    "radial-gradient(220px 160px at var(--cl-mx,50%) var(--cl-my,35%), rgba(56,189,248,0.16), transparent 72%)",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  opacity: 0.16,
                }}
              />

              {/* Rare surge line */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d="M 6 14 H 94"
                  fill="none"
                  stroke="rgba(226,232,240,0.78)"
                  strokeWidth="0.9"
                  strokeDasharray="5 34"
                  style={{
                    animation: reduceMotion ? "none" : "clSurgeMove 24s linear infinite, clSurge 30s linear infinite",
                    opacity: 0,
                  }}
                />
              </svg>

              {activeSlide.kind === "CHART" ? (
                <RightPanelChart
                  badge={activeSlide.badge}
                  title={activeSlide.title}
                  body={activeSlide.body}
                  chartTitle={t.s2Operational.chartTitle}
                  signals={t.s2Operational.signals}
                />
              ) : (
                <RightPanelTable
                  badge={activeSlide.badge}
                  title={activeSlide.title}
                  body={activeSlide.body}
                  table={activeSlide.table ?? { cols: ["—", "—", "—"], rows: [] }}
                />
              )}

              <div className="relative z-10 mt-5 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.s2FooterLeft}</span>
                <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.s2FooterRight}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: true slides (scroll-snap) */}
        <div className="mt-6 lg:hidden">
          <div
            ref={scrollerRef}
            className={cx(
              "overflow-x-auto snap-x snap-mandatory",
              "-mx-7 px-7" // align with section padding
            )}
            onScroll={() => {
              if (onScrollRaf.current != null) return;
              onScrollRaf.current = requestAnimationFrame(() => {
                onScrollRaf.current = null;
                syncActiveFromScroll();
              });
            }}
          >
            <div className="flex gap-4">
              {slides.map((s) => (
                <div key={s.key} className="min-w-full snap-start">
                  <div className="relative rounded-2xl border border-slate-800 bg-slate-950/35 backdrop-blur p-6 shadow-[0_28px_90px_rgba(2,6,23,0.62)]">
                    {/* Subtle edge light */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-px rounded-2xl"
                      style={{
                        padding: 1,
                        background:
                          "radial-gradient(220px 160px at var(--cl-mx,50%) var(--cl-my,35%), rgba(56,189,248,0.14), transparent 72%)",
                        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                        opacity: 0.14,
                      }}
                    />

                    {/* Rare surge only if motion allowed */}
                    {!reduceMotion && (
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-2xl"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M 6 14 H 94"
                          fill="none"
                          stroke="rgba(226,232,240,0.72)"
                          strokeWidth="0.9"
                          strokeDasharray="5 34"
                          style={{
                            animation: "clSurgeMove 26s linear infinite, clSurge 34s linear infinite",
                            opacity: 0,
                          }}
                        />
                      </svg>
                    )}

                    {s.kind === "CHART" ? (
                      <RightPanelChart
                        badge={s.badge}
                        title={s.title}
                        body={s.body}
                        chartTitle={t.s2Operational.chartTitle}
                        signals={t.s2Operational.signals}
                      />
                    ) : (
                      <RightPanelTable
                        badge={s.badge}
                        title={s.title}
                        body={s.body}
                        table={s.table ?? { cols: ["—", "—", "—"], rows: [] }}
                      />
                    )}

                    <div className="relative z-10 mt-5 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.s2FooterLeft}</span>
                      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.s2FooterRight}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* tiny pagination hint */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                className={cx(
                  "h-1.5 rounded-full transition",
                  idx === active ? "w-8 bg-slate-200/60" : "w-3 bg-slate-700/60"
                )}
                onClick={() => scrollToIndex(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}