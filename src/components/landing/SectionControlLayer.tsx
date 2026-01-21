import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

import { RevealOnScroll } from "./RevealOnScroll";

type T = {
  s2Title: string;
  s2Subtitle: string;
  s2Cards: {
    c1Title: string;
    c1Body: string;
    c1Example: string;
    c1Cta: string;

    c2Title: string;
    c2Body: string;
    c2Example: string;
    c2Cta: string;

    c3Title: string;
    c3Body: string;
    c3Example: string;
    c3Cta: string;
  };
};

type Props = { t: T };

type Lang = "it" | "fr" | "en";

type Slide = {
  key: "identity" | "operational" | "evidence" | "anomaly";
  title: string;
  badge: string;
  body: string;
  rightKind: "TABLE" | "CHART";
  table?: {
    cols: [string, string, string];
    rows: Array<[string, string, string]>;
  };
};

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function detectLang(t: T): Lang {
  const s = `${t.s2Title} ${t.s2Subtitle}`.toLowerCase();
  if (s.includes("contrô") || s.includes("preuves") || s.includes("reconstruction")) return "fr";
  if (s.includes("automatic") || s.includes("evidence") || s.includes("reconstruction")) return "en";
  return "it";
}

function buildOperationalChartOption(lang: Lang): Record<string, unknown> {
  // Deterministic, premium, minimal: two curves that rise and cross.
  // No tooltip noise, no heavy axes, no long drawing animation.
  const x = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"];

  // Curve A rises steadily.
  const planned = [12, 18, 26, 34, 42, 50, 58, 66];
  // Curve B rises faster and crosses around L3/L4, then diverges slightly.
  const produced = [8, 16, 28, 38, 46, 52, 56, 60];

  const legendA = lang === "fr" ? "Prévu" : lang === "en" ? "Planned" : "Previsto";
  const legendB = lang === "fr" ? "Produit" : lang === "en" ? "Produced" : "Prodotto";

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
        name: legendA,
        type: "line",
        data: planned,
        smooth: 0.42,
        symbol: "none",
        lineStyle: { width: 2, color: "rgba(226,232,240,0.62)" },
        emphasis: { disabled: true },
      },
      {
        name: legendB,
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

export function ControlLayerSection({ t }: Props): JSX.Element {
  const lang = useMemo(() => detectLang(t), [t]);

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    } catch {
      return false;
    }
  }, []);

  // Local mouse vars (section-only) for a very subtle edge light, without re-render.
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

  const anomalyTitle =
    lang === "fr" ? "Anomalies & réclamations" : lang === "en" ? "Anomalies & claims" : "Anomalie & claims";
  const anomalyBody =
    lang === "fr"
      ? "Les anomalies déclenchent un flux traçable : ouverture, revue, décision, clôture."
      : lang === "en"
        ? "Anomalies trigger a traceable flow: open, review, decision, close."
        : "Le anomalie generano un flusso tracciato: apertura, verifica, decisione e chiusura.";

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "identity",
        title: lang === "fr" ? "Identité & rôles" : lang === "en" ? "Identity & roles" : "Identity & roles",
        badge: "ROLE-GATED",
        body:
          lang === "fr"
            ? "Chaque action est autorisée uniquement au bon rôle. Pas d’ambiguïté CAPO / UFFICIO / DIREZIONE."
            : lang === "en"
              ? "Every action is allowed only for the correct role. No ambiguity across CAPO / UFFICIO / DIREZIONE."
              : "Ogni azione è consentita solo al ruolo corretto. Nessuna ambiguità tra CAPO, UFFICIO e DIREZIONE.",
        rightKind: "TABLE",
        table: {
          cols:
            lang === "fr"
              ? ["Contrôle", "Condition", "Résultat"]
              : lang === "en"
                ? ["Control", "Condition", "Outcome"]
                : ["Controllo", "Condizione", "Esito"],
          rows:
            lang === "fr"
              ? [
                  ["Accès par rôle", "Rôle non autorisé", "BLOCK"],
                  ["Périmètre", "Navire non assigné", "BLOCK"],
                  ["Période", "Date hors plage", "WARN"],
                ]
              : lang === "en"
                ? [
                    ["Role gate", "Unauthorized role", "BLOCK"],
                    ["Scope", "Ship not assigned", "BLOCK"],
                    ["Period", "Date out of range", "WARN"],
                  ]
                : [
                    ["Role gate", "Ruolo non autorizzato", "BLOCK"],
                    ["Scope", "Ship non assegnata", "BLOCK"],
                    ["Periodo", "Data fuori range", "WARN"],
                  ],
        },
      },
      {
        key: "operational",
        title: t.s2Cards.c2Title,
        badge: "LINE-PROVEN",
        body: t.s2Cards.c2Body,
        rightKind: "CHART",
      },
      {
        key: "evidence",
        title: t.s2Cards.c3Title,
        badge: "AUDIT-READY",
        body: t.s2Cards.c3Body,
        rightKind: "TABLE",
        table: {
          cols:
            lang === "fr"
              ? ["Preuve", "Format", "Garantie"]
              : lang === "en"
                ? ["Evidence", "Format", "Guarantee"]
                : ["Prova", "Formato", "Garanzia"],
          rows:
            lang === "fr"
              ? [
                  ["Rapport", "PDF", "Versioning"],
                  ["CORE Drive", "SHA-256", "Intégrité"],
                  ["Gel", "Read-only", "Non modifiable"],
                ]
              : lang === "en"
                ? [
                    ["Report", "PDF", "Versioning"],
                    ["CORE Drive", "SHA-256", "Integrity"],
                    ["Freeze", "Read-only", "Tamper-proof"],
                  ]
                : [
                    ["Rapportino", "PDF", "Versioning"],
                    ["CORE Drive", "SHA-256", "Integrità"],
                    ["Freeze", "Read-only", "Non alterabile"],
                  ],
        },
      },
      {
        key: "anomaly",
        title: anomalyTitle,
        badge: "TRACEABLE",
        body: anomalyBody,
        rightKind: "TABLE",
        table: {
          cols:
            lang === "fr"
              ? ["Événement", "Statut", "Responsable"]
              : lang === "en"
                ? ["Event", "Status", "Owner"]
                : ["Evento", "Stato", "Responsabile"],
          rows:
            lang === "fr"
              ? [
                  ["Anomalie", "Open", "Capo / Ufficio"],
                  ["Revue", "In review", "Manager"],
                  ["Décision", "Closed", "Direzione"],
                ]
              : lang === "en"
                ? [
                    ["Anomaly", "Open", "Capo / Ufficio"],
                    ["Review", "In review", "Manager"],
                    ["Decision", "Closed", "Direzione"],
                  ]
                : [
                    ["Anomalia", "Open", "Capo / Ufficio"],
                    ["Verifica", "In review", "Manager"],
                    ["Decisione", "Closed", "Direzione"],
                  ],
        },
      },
    ],
    [anomalyBody, anomalyTitle, lang, t]
  );

  const [active, setActive] = useState(0);
  const hoverLockRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      if (hoverLockRef.current) return;
      setActive((a) => (a + 1) % slides.length);
    }, 13000);
    return () => window.clearInterval(id);
  }, [reduceMotion, slides.length]);

  const s = slides[active];
  const chartOption = useMemo(() => buildOperationalChartOption(lang), [lang]);

  return (
    <RevealOnScroll className="relative">
      <div
        ref={rootRef}
        className="rounded-3xl border border-slate-800/70 bg-slate-950/25 backdrop-blur p-7 md:p-9"
        style={{
          // fallback for edge light
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ["--cl-mx" as unknown as string]: "50%",
          ["--cl-my" as unknown as string]: "35%",
        }}
      >
        {/* Minimal: single rare surge + ultra subtle edge light */}
        <style>{`
          @keyframes clSurge {
            0% { opacity: 0; }
            7% { opacity: 0.26; }
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

          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">UN SOLO FLUSSO · UNA SOLA VERITÀ</div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left stack */}
          <div className="lg:col-span-4 space-y-3">
            {slides.map((m, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={m.key}
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
                    <div className="text-[12px] uppercase tracking-[0.24em] text-slate-400">{m.title}</div>
                    <span className="shrink-0 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{m.badge}</span>
                    </span>
                  </div>
                  <div className="relative z-10 mt-2 text-sm text-slate-300 leading-relaxed">{m.body}</div>
                </button>
              );
            })}
          </div>

          {/* Right panel: readable, calm */}
          <div className="lg:col-span-8">
            <div className="relative rounded-2xl border border-slate-800 bg-slate-950/35 backdrop-blur p-6 shadow-[0_28px_90px_rgba(2,6,23,0.62)]">
              {/* Edge light (ultra subtle) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-2xl"
                style={{
                  padding: 1,
                  background:
                    "radial-gradient(220px 160px at var(--cl-mx,50%) var(--cl-my,35%), rgba(56,189,248,0.18), transparent 72%)",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  opacity: 0.18,
                }}
              />

              {/* Single rare surge line (subtle) */}
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

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="max-w-[56ch]">
                  <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">{s.title}</div>
                  <div className="mt-3 text-xl text-slate-100 leading-snug">{s.body}</div>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{s.badge}</span>
                </span>
              </div>

              {/* Right content */}
              {s.rightKind === "CHART" ? (
                <div className="relative z-10 mt-6">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/55 overflow-hidden">
                    <div className="px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      {lang === "fr"
                        ? "Cohérence (échantillon)"
                        : lang === "en"
                          ? "Consistency (sample)"
                          : "Coerenza (campione)"}
                    </div>
                    <div className="h-[200px]">
                      <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {lang === "fr" ? "Signal" : lang === "en" ? "Signal" : "Segnale"}
                      </div>
                      <div className="mt-1 text-sm text-slate-100">
                        {lang === "fr" ? "Écart prévu/produit" : lang === "en" ? "Planned/produced gap" : "Scostamento previsto/prodotto"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {lang === "fr" ? "Action" : lang === "en" ? "Action" : "Azione"}
                      </div>
                      <div className="mt-1 text-sm text-slate-100">
                        {lang === "fr" ? "Explication requise" : lang === "en" ? "Explanation required" : "Spiegazione richiesta"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {lang === "fr" ? "Esito" : lang === "en" ? "Outcome" : "Esito"}
                      </div>
                      <div className="mt-1 text-sm text-slate-100">WARN · EXPLAIN</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/45">
                  <div className="grid grid-cols-3 bg-slate-950/60">
                    {(s.table?.cols ?? ["—", "—", "—"]).map((c) => (
                      <div key={c} className="px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {c}
                      </div>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-700/60">
                    {(s.table?.rows ?? []).map((row, i) => (
                      <div key={i} className="grid grid-cols-3">
                        <div className="px-4 py-3.5 text-[14px] text-slate-100">{row[0]}</div>
                        <div className="px-4 py-3.5 text-[14px] text-slate-300">{row[1]}</div>
                        <div className="px-4 py-3.5 text-[14px] text-slate-400">{row[2]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative z-10 mt-5 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">AUDIT-DEFENSIBLE</span>
                <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">POLICY-DRIVEN</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}