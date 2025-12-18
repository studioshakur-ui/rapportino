// src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";

/* =========================================================
   COPY (IT default + FR/EN available)
   ========================================================= */
const COPY = {
  it: {
    eyebrow: "Sistema operativo di cantiere",
    title: "CORE",
    subtitle: "controllo operativo nativo.",
    heroLines: ["Un solo dato operativo.", "Validato dall’ufficio.", "Archiviato come evidenza."],
    accessNote: "Accesso riservato · ruoli autorizzati",
    cta: "Accedi al sistema",
    loginShort: "Accedi",

    panelTitle: "Segnali di sistema",
    panelSub: "pipeline · integrità · audit",

    railTitle: "Pipeline",
    railNodes: [
      { key: "CAPO", sub: "Raccolta" },
      { key: "UFFICIO", sub: "Verifica" },
      { key: "CORE DRIVE", sub: "Sigillo" },
      { key: "DIREZIONE", sub: "Lettura" },
    ],
    matrixTitle: "Integrità",
    eventsTitle: "Registro eventi",

    closureTitle: "CORE non è un software.",
    closureSub: "È un organo operativo del cantiere.",
    closureText: "Il sistema si ferma. La decisione inizia.",

    footerLeft: "Accesso riservato a personale e partner autorizzati.",
    footerRight: "CNCS framework · CORE",
    noKpiNote: "",
  },

  fr: {
    eyebrow: "Système opérationnel de chantier",
    title: "CORE",
    subtitle: "contrôle opérationnel natif.",
    heroLines: ["Une seule donnée opérationnelle.", "Contrôlée par l’office.", "Archivée comme preuve."],
    accessNote: "Accès réservé · rôles autorisés",
    cta: "Accéder au système",
    loginShort: "Accéder",

    panelTitle: "Signaux système",
    panelSub: "pipeline · intégrité · audit",

    railTitle: "Pipeline",
    railNodes: [
      { key: "CAPO", sub: "Saisie" },
      { key: "UFFICIO", sub: "Contrôle" },
      { key: "CORE DRIVE", sub: "Scellé" },
      { key: "DIREZIONE", sub: "Lecture" },
    ],
    matrixTitle: "Intégrité",
    eventsTitle: "Journal",

    closureTitle: "CORE n’est pas un logiciel.",
    closureSub: "C’est un organe opérationnel du chantier.",
    closureText: "Le système s’arrête. La décision commence.",

    footerLeft: "Accès réservé au personnel et partenaires autorisés.",
    footerRight: "Framework CNCS · CORE",
    noKpiNote: "",
  },

  en: {
    eyebrow: "Operational shipyard system",
    title: "CORE",
    subtitle: "native operational control.",
    heroLines: ["One operational datum.", "Verified by office.", "Archived as evidence."],
    accessNote: "Restricted access · authorized roles",
    cta: "Access system",
    loginShort: "Access",

    panelTitle: "System signals",
    panelSub: "pipeline · integrity · audit",

    railTitle: "Pipeline",
    railNodes: [
      { key: "CAPO", sub: "Capture" },
      { key: "UFFICIO", sub: "Verify" },
      { key: "CORE DRIVE", sub: "Seal" },
      { key: "DIREZIONE", sub: "Read" },
    ],
    matrixTitle: "Integrity",
    eventsTitle: "Event log",

    closureTitle: "CORE is not software.",
    closureSub: "It is the shipyard’s operational organ.",
    closureText: "The system stops. The decision begins.",

    footerLeft: "Restricted to authorized staff and partners.",
    footerRight: "CNCS framework · CORE",
    noKpiNote: "",
  },
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeGetInitialLang() {
  try {
    const v = window.localStorage.getItem("core-lang");
    if (v === "it" || v === "fr" || v === "en") return v;
  } catch {}
  return "it";
}

/* =========================================================
   PIPELINE RAIL — ECHARTS (NO KPI, NO AXES) + ELECTRIC FLOW
   ========================================================= */
function usePipelineRailChart(activeIndex = 1, nodesInput) {
  return useMemo(() => {
    const base =
      Array.isArray(nodesInput) && nodesInput.length
        ? nodesInput
        : [
            { key: "CAPO", sub: "Origine" },
            { key: "UFFICIO", sub: "Controllo" },
            { key: "CORE DRIVE", sub: "Certifica" },
            { key: "DIREZIONE", sub: "Sintesi" },
          ];

    const nodes = base.map((n, i) => ({ ...n, x: i, y: 0 }));

    const active = Math.max(0, Math.min(activeIndex, nodes.length - 1));
    const lineColor = "#38bdf8"; // sky
    const frame = "#334155"; // slate

    const flowSegments = Array.from({ length: Math.max(0, nodes.length - 1) }).map((_, i) => ({
      coords: [[i, 0], [i + 1, 0]],
    }));

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 260,
      animationEasing: "cubicOut",
      grid: { left: 12, right: 12, top: 10, bottom: 10 },

      xAxis: { type: "value", min: -0.2, max: Math.max(0.2, nodes.length - 1) + 0.2, show: false },
      yAxis: { type: "value", min: -1, max: 1, show: false },

      series: [
        // Rail base
        {
          type: "line",
          data: [
            [0, 0],
            [Math.max(0, nodes.length - 1), 0],
          ],
          symbol: "none",
          lineStyle: { width: 2, color: frame },
          silent: true,
          z: 1,
        },

        // Electric flow overlay (slow + deliberate)
        {
          type: "lines",
          coordinateSystem: "cartesian2d",
          polyline: false,
          data: flowSegments,
          lineStyle: {
            width: 2,
            opacity: 0.14,
            color: lineColor,
          },
          effect: {
            show: true,
            constantSpeed: 18, // slow, deliberate "electric pulse" (premium)
            symbol: "circle",
            symbolSize: 3,
            trailLength: 0.55, // longer trail, slower perception
            color: "#e2e8f0",
          },
          silent: true,
          z: 2,
        },

        // Progress highlight up to active stage
        {
          type: "line",
          data: [
            [0, 0],
            [active, 0],
          ],
          symbol: "none",
          lineStyle: { width: 3, color: lineColor, opacity: 0.85 },
          silent: true,
          z: 3,
        },

        // Stage nodes
        {
          type: "scatter",
          data: nodes.map((n, i) => ({
            value: [n.x, n.y],
            label: n.key,
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
                <div style="letter-spacing:.14em; text-transform:uppercase; color:#cbd5e1; font-weight:700;">${d.label}</div>
                <div style="color:#94a3b8; margin-top:2px;">${d.sub || ""}</div>
              </div>`;
            },
          },
          z: 4,
        },
      ],
    };
  }, [activeIndex, nodesInput]);
}

/* =========================================================
   UI TOKENS (Subtle, Tesla/SpaceX vibes)
   ========================================================= */
const coreLayout = {
  glass:
    "bg-slate-950/60 border border-slate-800/80 backdrop-blur rounded-2xl shadow-[0_0_0_1px_rgba(15,23,42,0.3),0_20px_60px_rgba(0,0,0,0.45)]",
  card:
    "rounded-2xl border border-slate-800/80 bg-slate-950/55 backdrop-blur shadow-[0_0_0_1px_rgba(15,23,42,0.25),0_18px_48px_rgba(0,0,0,0.40)]",
  pill:
    "inline-flex items-center gap-2 rounded-full border border-slate-800/80 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200",
  btn:
    "inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.25)] hover:bg-sky-400 transition",
  btnGhost:
    "inline-flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900/60 transition",
};

function corePills(small = true, tone = "sky") {
  const base =
    "inline-flex items-center justify-center rounded-full border bg-slate-950/55 backdrop-blur font-semibold tracking-wide";
  const size = small ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5";
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 text-emerald-100"
      : tone === "violet"
      ? "border-violet-500/30 text-violet-100"
      : tone === "amber"
      ? "border-amber-500/30 text-amber-100"
      : tone === "neutral"
      ? "border-slate-700/70 text-slate-200"
      : "border-sky-500/30 text-sky-100";
  return cx(base, size, toneClass);
}

/* =========================================================
   MAIN PAGE
   ========================================================= */
export default function Landing() {
  const nav = useNavigate();

  useEffect(() => {
    // Force dark mode for landing (per requirement)
    document.documentElement.classList.add("dark");
  }, []);

  const [lang, setLang] = useState(() => safeGetInitialLang());
  const t = COPY[lang] || COPY.it;

  useEffect(() => {
    try {
      window.localStorage.setItem("core-lang", lang);
    } catch {}
  }, [lang]);

  // Demo: active stage (later bind to real system)
  const activeStageIndex = 1; // 0=CAPO, 1=UFFICIO, 2=DRIVE, 3=DIREZIONE
  const railOption = usePipelineRailChart(activeStageIndex, t.railNodes);

  const integrityRows = useMemo(
    () => [
      { role: "CAPO", RBAC: "ENFORCED", RLS: "ENFORCED", AUDIT: "ENABLED", LOCK: "EDIT" },
      { role: "UFFICIO", RBAC: "ENFORCED", RLS: "ENFORCED", AUDIT: "ENABLED", LOCK: "LOCK" },
      { role: "DRIVE", RBAC: "ENFORCED", RLS: "ENFORCED", AUDIT: "ENABLED", LOCK: "IMMUTABLE" },
      { role: "DIREZIONE", RBAC: "ENFORCED", RLS: "ENFORCED", AUDIT: "ENABLED", LOCK: "READ" },
    ],
    []
  );

  const events = useMemo(
    () => [
      { t: "18:29", m: "DATA LINK OK · pipeline stabile" },
      { t: "18:26", m: "VERIFY OK · UFFICIO · 0 anomalie" },
      { t: "18:24", m: "ARCHIVE SEALED · CORE DRIVE · hash registrato" },
      { t: "18:21", m: "INGEST OK · CAPO · dato operativo inviato" },
      { t: "18:20", m: "READ ACCESS · DIREZIONE · audit trail integro" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP */}
      <div
        className="pointer-events-none fixed inset-0 opacity-100"
        style={{
          backgroundImage: `
            radial-gradient(1100px 520px at 12% 18%, rgba(56,189,248,0.10), transparent 55%),
            radial-gradient(900px 440px at 78% 22%, rgba(16,185,129,0.07), transparent 60%),
            radial-gradient(900px 520px at 45% 85%, rgba(139,92,246,0.05), transparent 60%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.35))
          `,
        }}
      />

      {/* HEADER (CNCS discrete Option A) */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cx(coreLayout.pill, "px-3 py-1.5")}>
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]" />
              <span className="text-[11px] tracking-[0.18em] uppercase text-slate-200">CORE</span>
            </div>
            <div className="text-[11px] tracking-[0.18em] uppercase text-slate-500">CNCS framework</div>
          </div>

          <div className="flex items-center gap-3">
            {/* Lang switch */}
            <div className="flex items-center rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
              {["it", "fr", "en"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLang(k)}
                  className={cx(
                    "px-3 py-2 text-xs font-semibold tracking-wide transition",
                    lang === k ? "bg-slate-900/70 text-slate-100" : "text-slate-400 hover:text-slate-200"
                  )}
                  aria-label={`lang-${k}`}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>

            <button type="button" className={coreLayout.btnGhost} onClick={() => nav("/login")}>
              {t.loginShort}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <section className="grid lg:grid-cols-2 gap-10 items-start">
            {/* Left */}
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.eyebrow}</div>

              <h1 className="mt-5 text-6xl font-semibold tracking-tight leading-none">
                {t.title}
              </h1>
              <div className="mt-3 text-xl text-slate-400">{t.subtitle}</div>

              <div className="mt-8 space-y-2 text-lg text-slate-200">
                {t.heroLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>

              <div className="mt-10 flex items-center gap-4">
                <button type="button" className={coreLayout.btn} onClick={() => nav("/login")}>
                  {t.cta}
                </button>
                <div className="text-xs text-slate-500">{t.accessNote}</div>
              </div>
            </div>

            {/* Right panel */}
            <div className={cx(coreLayout.card, "p-6")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{t.panelTitle}</div>
                  <div className="mt-1 text-sm text-slate-400">{t.panelSub}</div>
                </div>
                <div className={cx(corePills(true, "emerald"), "px-3 py-1.5")}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  STABLE
                </div>
              </div>

              <div className="mt-6">
                {/* Pipeline */}
                <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{t.railTitle}</div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>pipeline</span>
                    <span className="text-slate-600">Build CNCS-6555 · 17/12/2025 · 18:29</span>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
                    <ReactECharts
                      option={railOption}
                      style={{ height: 120, width: "100%" }}
                      opts={{ renderer: "canvas" }}
                      notMerge
                      lazyUpdate
                    />
                    <div className="px-4 pb-4 pt-1">
                      <div className="grid grid-cols-4 gap-3 text-[11px] text-slate-400">
                        {(t.railNodes || []).map((n) => (
                          <div key={n.key}>
                            <div className="text-slate-200 font-semibold tracking-wide">{n.key}</div>
                            <div className="text-slate-500">{n.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integrity */}
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{t.matrixTitle}</div>

                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/60">
                    <div className="grid grid-cols-5 text-[10px] uppercase tracking-[0.18em] text-slate-500 border-b border-slate-800/80">
                      <div className="px-3 py-2">ROLE</div>
                      <div className="px-3 py-2">RBAC</div>
                      <div className="px-3 py-2">RLS</div>
                      <div className="px-3 py-2">AUDIT</div>
                      <div className="px-3 py-2">LOCK</div>
                    </div>

                    {integrityRows.map((r) => (
                      <div
                        key={r.role}
                        className="grid grid-cols-5 text-xs border-b border-slate-800/60 last:border-b-0"
                      >
                        <div className="px-3 py-2 text-slate-200 font-medium">{r.role}</div>
                        <Cell value={r.RBAC} tone="sky" />
                        <Cell value={r.RLS} tone="sky" />
                        <Cell value={r.AUDIT} tone="violet" />
                        <Cell
                          value={r.LOCK}
                          tone={
                            r.LOCK === "EDIT"
                              ? "amber"
                              : r.LOCK === "READ"
                              ? "emerald"
                              : "neutral"
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800/70" />

                {/* Event log */}
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{t.eventsTitle}</div>

                  <div className="mt-3 space-y-2">
                    {events.slice(0, 4).map((e, idx) => (
                      <div key={idx} className="flex items-baseline gap-3">
                        <span className="text-[11px] text-slate-500 w-12">{e.t}</span>
                        <span className="text-sm text-slate-300">{e.m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CLOSURE */}
          <section className="pt-14 border-t border-slate-800/70">
            <div className="text-4xl font-semibold tracking-tight leading-[1.08]">
              {t.closureTitle}
              <span className="text-slate-400"> {t.closureSub}</span>
            </div>
            {t.closureText ? (
              <div className="mt-4 text-base text-slate-400 max-w-3xl leading-relaxed">{t.closureText}</div>
            ) : null}
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
   MATRIX CELL (de-noised: ENFORCED/ENABLED -> dot only)
   ========================================================= */
function Cell({ value, tone }) {
  const isOk = value === "ENFORCED" || value === "ENABLED";
  const pill = corePills(true, tone === "neutral" ? "neutral" : tone);

  const text =
    tone === "neutral"
      ? "text-slate-300"
      : tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
      ? "text-amber-200"
      : tone === "violet"
      ? "text-violet-200"
      : "text-sky-200";

  return (
    <div className="px-3 py-2">
      {isOk ? (
        <span
          className={cx(pill, "inline-flex items-center justify-center rounded-full w-7 h-7", text)}
          aria-label={value}
          title={value}
        >
          <span className="text-lg leading-none">•</span>
          <span className="sr-only">{value}</span>
        </span>
      ) : (
        <span className={cx(pill, "inline-flex rounded-full px-2.5 py-1", text)}>{value}</span>
      )}
    </div>
  );
}
