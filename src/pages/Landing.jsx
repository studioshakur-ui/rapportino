// src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReactECharts from "echarts-for-react";

import {
  cardSurface,
  corePills,
  headerPill,
  themeIconBg,
  buttonPrimary,
} from "../ui/designSystem";

/* =========================================================
   LANG
   ========================================================= */
const LANGS = ["it", "fr", "en"];

const COPY = {
  it: {
    eyebrow: "Sistema operativo di cantiere",
    title: "CORE",
    subtitle: "controllo operativo nativo.",
    heroLines: ["Un solo dato operativo.", "Validato dall’Ufficio.", "Archiviato come evidenza."],
    accessNote: "Accesso riservato · visibilità per ruoli autorizzati",
    cta: "Accedi al sistema",
    loginShort: "Accedi",

    invariantsTitle: "System invariants",
    invariants: [
      "Dato nativo · nessuna ricostruzione",
      "Tracciabilità end-to-end · ruolo → azione → evidenza",
      "Governance by design · non per procedura",
    ],

    panelTitle: "System signals",
    panelSub: "pipeline / integrity / audit",

    railTitle: "Pipeline",
    locksTitle: "Integrity locks",
    auditTitle: "Audit excerpt",

    closureTitle: "CORE non è un software.",
    closureSub: "È un organo operativo del cantiere.",
    closureText:
      "Non sostituisce le persone. Stabilizza il dato. Rende la decisione leggibile e auditabile.",

    footerLeft: "Accesso riservato a personale e partner autorizzati.",
    footerRight: "CNCS framework · CORE",
    noKpiNote: "Nessun KPI in landing. Solo stati, integrità e audit.",
  },

  fr: {
    eyebrow: "Système opérationnel de chantier",
    title: "CORE",
    subtitle: "contrôle opérationnel natif.",
    heroLines: ["Une seule donnée opérationnelle.", "Validée par le Bureau.", "Archivée comme preuve."],
    accessNote: "Accès réservé · visibilité par rôles autorisés",
    cta: "Accéder au système",
    loginShort: "Accéder",

    invariantsTitle: "System invariants",
    invariants: [
      "Donnée native · aucune reconstruction",
      "Traçabilité end-to-end · rôle → action → preuve",
      "Gouvernance by design · pas par procédure",
    ],

    panelTitle: "System signals",
    panelSub: "pipeline / integrity / audit",

    railTitle: "Pipeline",
    locksTitle: "Integrity locks",
    auditTitle: "Audit excerpt",

    closureTitle: "CORE n’est pas un logiciel.",
    closureSub: "C’est un organe opérationnel du chantier.",
    closureText:
      "Il ne remplace pas les personnes. Il stabilise la donnée. Il rend la décision lisible et auditable.",

    footerLeft: "Accès réservé au personnel et partenaires autorisés.",
    footerRight: "Framework CNCS · CORE",
    noKpiNote: "Aucun KPI sur la landing. Uniquement états, intégrité et audit.",
  },

  en: {
    eyebrow: "Operational shipyard system",
    title: "CORE",
    subtitle: "native operational control.",
    heroLines: ["One operational data.", "Validated by Office.", "Archived as evidence."],
    accessNote: "Restricted access · authorized roles",
    cta: "Access the system",
    loginShort: "Login",

    invariantsTitle: "System invariants",
    invariants: [
      "Native data · no reconstruction",
      "End-to-end traceability · role → action → evidence",
      "Governance by design · not by procedure",
    ],

    panelTitle: "System signals",
    panelSub: "pipeline / integrity / audit",

    railTitle: "Pipeline",
    locksTitle: "Integrity locks",
    auditTitle: "Audit excerpt",

    closureTitle: "CORE is not software.",
    closureSub: "It is an operational organ of the shipyard.",
    closureText:
      "It does not replace people. It stabilizes data. It makes decisions readable and auditable.",

    footerLeft: "Restricted access to internal staff and authorized partners.",
    footerRight: "CNCS framework · CORE",
    noKpiNote: "No KPIs on landing. Only states, integrity and audit.",
  },
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeGetInitialLang() {
  if (typeof window === "undefined") return "it";
  try {
    const l = window.localStorage.getItem("core-lang");
    if (l && LANGS.includes(l)) return l;
  } catch {}
  return "it";
}

/* =========================================================
   PIPELINE RAIL — ECHARTS (NO KPI, NO AXES) + ELECTRIC FLOW
   ========================================================= */
function usePipelineRailChart(activeIndex = 1) {
  return useMemo(() => {
    const nodes = [
      { key: "CAPO", sub: "Raccolta", x: 0, y: 0 },
      { key: "UFFICIO", sub: "Verifica", x: 1, y: 0 },
      { key: "CORE DRIVE", sub: "Sigillo", x: 2, y: 0 },
      { key: "DIREZIONE", sub: "Lettura", x: 3, y: 0 },
    ];

    const active = Math.max(0, Math.min(activeIndex, nodes.length - 1));
    const dotX = nodes[active].x;

    const lineColor = "#38bdf8"; // sky
    const frame = "#334155"; // slate-700
    const textDim = "#94a3b8"; // slate-400

    const flowSegments = [
      { coords: [[0, 0], [1, 0]] },
      { coords: [[1, 0], [2, 0]] },
      { coords: [[2, 0], [3, 0]] },
    ];

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 260,
      animationEasing: "cubicOut",
      grid: { left: 12, right: 12, top: 10, bottom: 10 },

      xAxis: { type: "value", min: -0.2, max: 3.2, show: false },
      yAxis: { type: "value", min: -1, max: 1, show: false },

      series: [
        // Rail base
        {
          type: "line",
          data: [
            [0, 0],
            [3, 0],
          ],
          symbol: "none",
          lineStyle: { width: 2, color: frame },
          silent: true,
          z: 1,
        },

        // Electric flow overlay (very subtle)
        {
          type: "lines",
          coordinateSystem: "cartesian2d",
          data: flowSegments,
          lineStyle: { width: 2, opacity: 0.14, color: lineColor },
          effect: {
            show: true,
            constantSpeed: 70,
            symbol: "circle",
            symbolSize: 4,
            trailLength: 0.32,
            color: "#e2e8f0",
          },
          silent: true,
          z: 2,
        },

        // Progress overlay up to active
        {
          type: "line",
          data: [
            [0, 0],
            [dotX, 0],
          ],
          symbol: "none",
          lineStyle: { width: 2, color: lineColor, opacity: 0.85 },
          silent: true,
          z: 3,
        },

        // Stations
        {
          type: "scatter",
          data: nodes.map((n, i) => ({
            value: [n.x, n.y],
            name: n.key,
            sub: n.sub,
            i,
          })),
          symbolSize: (val, params) => (params.data.i === active ? 12 : 10),
          itemStyle: {
            color: (params) => (params.data.i <= active ? lineColor : frame),
            borderColor: (params) => (params.data.i === active ? "#e2e8f0" : frame),
            borderWidth: (params) => (params.data.i === active ? 2 : 1),
          },
          tooltip: {
            show: true,
            formatter: (p) => {
              const d = p.data;
              return `<div style="font-size:11px;">
                <div style="letter-spacing:.14em; text-transform:uppercase; color:${textDim};">PIPELINE</div>
                <div style="margin-top:6px; font-weight:600; color:#e2e8f0;">${d.name}</div>
                <div style="margin-top:2px; color:${textDim};">${d.sub}</div>
              </div>`;
            },
            backgroundColor: "#020617",
            borderColor: "#334155",
            textStyle: { color: "#e5e7eb" },
          },
          z: 4,
        },

        // Active token
        {
          type: "scatter",
          data: [[dotX, 0]],
          symbolSize: 7,
          itemStyle: { color: "#e2e8f0" },
          silent: true,
          z: 5,
        },
      ],

      graphic: [
        ...nodes.map((n) => ({
          type: "group",
          left: `${(n.x / 3) * 100}%`,
          top: "62%",
          bounding: "raw",
          children: [
            {
              type: "text",
              style: {
                text: n.key,
                fill: n.x <= dotX ? "#e2e8f0" : textDim,
                font: "600 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
                align: "center",
              },
              left: 0,
              top: 0,
            },
            {
              type: "text",
              style: {
                text: n.sub,
                fill: "#64748b",
                font: "400 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
                align: "center",
              },
              left: 0,
              top: 16,
            },
          ],
        })),
      ],
    };
  }, [activeIndex]);
}

/* =========================================================
   AUDIT EXCERPT (credible format, no marketing adjectives)
   ========================================================= */
function useAuditExcerpt() {
  return useMemo(() => {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const utc = (d) =>
      `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;

    const shortId = (prefix) => {
      // stable-ish per load: not crypto, just to avoid "fake demo phrase"
      const x = Math.random().toString(16).slice(2, 6);
      const y = Math.random().toString(16).slice(2, 6);
      return `${prefix}_${x}${y}…`;
    };

    const t0 = utc(now);
    const t1 = utc(new Date(now.getTime() - 2 * 60 * 1000 - 11 * 1000));
    const t2 = utc(new Date(now.getTime() - 4 * 60 * 1000 - 27 * 1000));
    const t3 = utc(new Date(now.getTime() - 7 * 60 * 1000 - 3 * 1000));

    return [
      { ts: t0, actor: "AUTH", action: "RLS.CHECK", obj: "ok", trace: shortId("req") },
      { ts: t1, actor: "UFFICIO", action: "FLOW.ACK", obj: shortId("flow"), trace: shortId("trace") },
      { ts: t2, actor: "DRIVE", action: "EVIDENCE.SEAL", obj: shortId("f"), trace: shortId("sha") },
      { ts: t3, actor: "CAPO", action: "DATA.INGEST", obj: shortId("pkt"), trace: shortId("trace") },
    ];
  }, []);
}

/* =========================================================
   LANDING
   ========================================================= */
export default function Landing() {
  // Dark-only
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const [lang, setLang] = useState(() => safeGetInitialLang());
  const t = COPY[lang] || COPY.it;

  useEffect(() => {
    try {
      window.localStorage.setItem("core-lang", lang);
    } catch {}
  }, [lang]);

  const activeStageIndex = 1; // demo anchor (UFFICIO)
  const railOption = usePipelineRailChart(activeStageIndex);
  const auditLines = useAuditExcerpt();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* subtle metal haze (reduced vs previous) */}
      <div
        className="pointer-events-none fixed inset-0 opacity-100"
        style={{
          backgroundImage: `
            radial-gradient(1100px 520px at 12% 18%, rgba(56,189,248,0.085), transparent 58%),
            radial-gradient(900px 440px at 78% 22%, rgba(16,185,129,0.055), transparent 62%),
            radial-gradient(900px 520px at 45% 85%, rgba(139,92,246,0.040), transparent 64%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.32))
          `,
        }}
      />

      {/* HEADER (CNCS discrete Option A) */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cx(headerPill(true), "border-slate-700 text-slate-200 bg-slate-900/40")}>
              <span className={themeIconBg(true, "sky")}>●</span>
              <span>CORE</span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              CNCS framework
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={cx("hidden sm:flex items-center gap-2", corePills(true, "neutral"))}>
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cx(
                    "px-2 py-1 rounded-md text-[11px] uppercase tracking-[0.18em] transition",
                    l === lang ? "text-sky-200" : "text-slate-500 hover:text-slate-300"
                  )}
                  aria-label={`Language ${l}`}
                  title={l.toUpperCase()}
                >
                  {l}
                </button>
              ))}
            </div>

            <Link
              to="/login"
              className={cx(
                buttonPrimary(true),
                "h-9 px-4 rounded-full shadow-[0_18px_45px_rgba(56,189,248,0.22)]"
              )}
            >
              {t.loginShort}
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 space-y-20">
          {/* HERO + CONTROL ROOM PANEL */}
          <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Vertical connector line (structure) */}
            <div className="hidden lg:block absolute left-1/2 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-slate-800/60 to-transparent" />

            {/* Hero left */}
            <div className="lg:col-span-6 space-y-7 relative">
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  {t.eyebrow}
                </div>

                <h1 className="text-7xl font-semibold tracking-tight leading-[0.95]">
                  {t.title}
                </h1>

                <div className="text-2xl text-slate-400 tracking-tight">
                  {t.subtitle}
                </div>
              </div>

              <div className="space-y-1.5 text-xl">
                {t.heroLines.map((line, idx) => (
                  <div key={idx} className="text-slate-100">
                    {line}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-4">
                <Link
                  to="/login"
                  className={cx(
                    buttonPrimary(true),
                    "px-6 py-2.5 rounded-xl shadow-[0_18px_50px_rgba(56,189,248,0.22)]"
                  )}
                >
                  {t.cta}
                </Link>
                <span className="text-xs text-slate-500">{t.accessNote}</span>
              </div>

              {/* System invariants (fills without KPI) */}
              <div className="pt-10">
                <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  {t.invariantsTitle}
                </div>
                <div className="mt-3 space-y-2">
                  {t.invariants.map((inv, i) => (
                    <div key={i} className="text-sm text-slate-400 tracking-tight">
                      {inv}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: single monolithic control panel */}
            <div className="lg:col-span-6 relative">
              {/* Reference markers (SpaceX-style) */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Marker label="SYSTEM" value="CORE 1.0" />
                <Marker label="MODE" value="OPERATIONAL" />
                <Marker label="SCOPE" value="SHIPYARD" />
              </div>

              <div
                className={cardSurface(
                  true,
                  "p-6 border-slate-800 bg-slate-950/80 shadow-[0_28px_90px_rgba(2,6,23,0.78)]"
                )}
              >
                {/* Panel header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      {t.panelTitle}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{t.panelSub}</div>
                  </div>

                  <div className={cx(corePills(true, "emerald"), "rounded-full px-3")}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] uppercase tracking-[0.18em]">STABLE</span>
                  </div>
                </div>

                {/* Pipeline */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                      {t.railTitle}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Build CNCS-6555 · 17/12/2025 · 18:29
                    </div>
                  </div>

                  <div className="mt-3">
                    <ReactECharts
                      option={railOption}
                      style={{ height: 160, width: "100%" }}
                      opts={{ renderer: "canvas" }}
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800/70" />

                {/* Integrity locks (replaces matrix) */}
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    {t.locksTitle}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <LockItem tone="sky" title="Access" desc="RBAC + RLS enforced" />
                    <LockItem tone="amber" title="Write" desc="role-gated mutations" />
                    <LockItem tone="violet" title="Evidence" desc="append-only sealing" />
                    <LockItem tone="emerald" title="Freeze" desc="immutable on approval" />
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800/70" />

                {/* Audit excerpt (replaces fake log) */}
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    {t.auditTitle}
                  </div>

                  <div className="mt-3 space-y-2">
                    {auditLines.map((l, idx) => (
                      <div
                        key={idx}
                        className="flex items-baseline gap-3 font-mono text-[12px]"
                      >
                        <span className="text-slate-500 w-[84px] shrink-0">{l.ts}</span>
                        <span className="text-slate-300 w-[70px] shrink-0">{l.actor}</span>
                        <span className="text-slate-200 w-[130px] shrink-0">{l.action}</span>
                        <span className="text-slate-400 flex-1">{l.obj}</span>
                        <span className="text-slate-500 w-[92px] text-right shrink-0">
                          {l.trace}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-600">{t.noKpiNote}</div>
            </div>
          </section>

          {/* CLOSURE */}
          <section className="pt-14 border-t border-slate-800/70">
            <div className="text-5xl font-semibold tracking-tight leading-[1.05]">
              {t.closureTitle}
              <br />
              {t.closureSub}
            </div>
            <div className="mt-4 text-base text-slate-400 max-w-3xl leading-relaxed">
              {t.closureText}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/70">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-[11px] text-slate-500">
          <span>{t.footerLeft}</span>
          <span>{t.footerRight}</span>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS (inline, file-local)
   ========================================================= */

function Marker({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
        {value}
      </span>
    </span>
  );
}

function LockItem({ tone, title, desc }) {
  const pill = corePills(true, tone === "neutral" ? "neutral" : tone);
  const dot =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
      ? "bg-amber-400"
      : tone === "violet"
      ? "bg-violet-400"
      : "bg-sky-400";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-slate-200 font-medium">{title}</div>
        <div className="text-[11px] text-slate-500 truncate">{desc}</div>
      </div>
      <span className={cx(pill, "inline-flex items-center rounded-full px-2.5 py-1")}>
        <span className={cx("h-1.5 w-1.5 rounded-full", dot)} />
        <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-slate-200">
          LOCKED
        </span>
      </span>
    </div>
  );
}
