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

    invariantsTitle: "Invarianti di sistema",
    invariants: [
      "Dato nativo · nessuna ricostruzione",
      "Tracciabilità end-to-end · ruolo → azione → evidenza",
      "Governance by design · non per procedura",
    ],

    // Right panel
    markers: { system: "Sistema", mode: "Modalità", scope: "Ambito" },
    markerValues: { system: "CORE 1.0", mode: "Operativo", scope: "Cantiere" },

    panelTitle: "Segnali di sistema",
    panelSub: "pipeline / integrità / audit",

    pipelineTitle: "Pipeline",
    integrityTitle: "Integrità",
    integrityCenterTop: "INTEGRITÀ",
    integrityCenterBottom: "BLOCCATA",
    integrityLegends: [
      { k: "Accesso", d: "RBAC + RLS applicati" },
      { k: "Scrittura", d: "mutazioni per ruolo" },
      { k: "Evidenza", d: "sigillo append-only" },
      { k: "Freeze", d: "immutabile su approvazione" },
    ],

    auditTitle: "Audit (estratto)",
    auditHint: "Fatti tecnici. Nessun KPI.",
    auditEvents: [
      { actor: "AUTH", action: "RLS.CHECK", label: "Controllo accesso" },
      { actor: "CAPO", action: "DATA.INGEST", label: "Invio dato" },
      { actor: "UFFICIO", action: "FLOW.ACK", label: "Validazione" },
      { actor: "DRIVE", action: "EVIDENCE.SEAL", label: "Sigillo evidenza" },
      { actor: "DIREZIONE", action: "READ.SNAPSHOT", label: "Lettura" },
    ],

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

    invariantsTitle: "Invariants système",
    invariants: [
      "Donnée native · aucune reconstruction",
      "Traçabilité end-to-end · rôle → action → preuve",
      "Gouvernance by design · pas par procédure",
    ],

    markers: { system: "Système", mode: "Mode", scope: "Périmètre" },
    markerValues: { system: "CORE 1.0", mode: "Opérationnel", scope: "Chantier" },

    panelTitle: "Signaux système",
    panelSub: "pipeline / intégrité / audit",

    pipelineTitle: "Pipeline",
    integrityTitle: "Intégrité",
    integrityCenterTop: "INTÉGRITÉ",
    integrityCenterBottom: "VERROUILLÉE",
    integrityLegends: [
      { k: "Accès", d: "RBAC + RLS appliqués" },
      { k: "Écriture", d: "mutations par rôle" },
      { k: "Preuve", d: "scellé append-only" },
      { k: "Freeze", d: "immuable à l’approbation" },
    ],

    auditTitle: "Audit (extrait)",
    auditHint: "Faits techniques. Aucun KPI.",
    auditEvents: [
      { actor: "AUTH", action: "RLS.CHECK", label: "Contrôle accès" },
      { actor: "CAPO", action: "DATA.INGEST", label: "Envoi donnée" },
      { actor: "UFFICIO", action: "FLOW.ACK", label: "Validation" },
      { actor: "DRIVE", action: "EVIDENCE.SEAL", label: "Scellé preuve" },
      { actor: "DIREZIONE", action: "READ.SNAPSHOT", label: "Lecture" },
    ],

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

    markers: { system: "System", mode: "Mode", scope: "Scope" },
    markerValues: { system: "CORE 1.0", mode: "Operational", scope: "Shipyard" },

    panelTitle: "System signals",
    panelSub: "pipeline / integrity / audit",

    pipelineTitle: "Pipeline",
    integrityTitle: "Integrity",
    integrityCenterTop: "INTEGRITY",
    integrityCenterBottom: "LOCKED",
    integrityLegends: [
      { k: "Access", d: "RBAC + RLS enforced" },
      { k: "Write", d: "role-gated mutations" },
      { k: "Evidence", d: "append-only seal" },
      { k: "Freeze", d: "immutable on approval" },
    ],

    auditTitle: "Audit (excerpt)",
    auditHint: "Technical facts. No KPIs.",
    auditEvents: [
      { actor: "AUTH", action: "RLS.CHECK", label: "Access check" },
      { actor: "CAPO", action: "DATA.INGEST", label: "Data ingest" },
      { actor: "UFFICIO", action: "FLOW.ACK", label: "Validation" },
      { actor: "DRIVE", action: "EVIDENCE.SEAL", label: "Evidence seal" },
      { actor: "DIREZIONE", action: "READ.SNAPSHOT", label: "Read" },
    ],

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
function usePipelineRailChart(activeIndex = 1, lang = "it") {
  return useMemo(() => {
    const labelsByLang = {
      it: [
        { key: "CAPO", sub: "Raccolta" },
        { key: "UFFICIO", sub: "Verifica" },
        { key: "CORE DRIVE", sub: "Sigillo" },
        { key: "DIREZIONE", sub: "Lettura" },
      ],
      fr: [
        { key: "CAPO", sub: "Collecte" },
        { key: "UFFICIO", sub: "Contrôle" },
        { key: "CORE DRIVE", sub: "Scellé" },
        { key: "DIREZIONE", sub: "Lecture" },
      ],
      en: [
        { key: "CAPO", sub: "Ingest" },
        { key: "UFFICIO", sub: "Verify" },
        { key: "CORE DRIVE", sub: "Seal" },
        { key: "DIREZIONE", sub: "Read" },
      ],
    };

    const L = labelsByLang[lang] || labelsByLang.it;

    const nodes = [
      { ...L[0], x: 0, y: 0 },
      { ...L[1], x: 1, y: 0 },
      { ...L[2], x: 2, y: 0 },
      { ...L[3], x: 3, y: 0 },
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
      animationDuration: 240,
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

        // Electric pulse (subtle)
        {
          type: "lines",
          coordinateSystem: "cartesian2d",
          data: flowSegments,
          lineStyle: { width: 2, opacity: 0.12, color: lineColor },
          effect: {
            show: true,
            constantSpeed: 68,
            symbol: "circle",
            symbolSize: 4,
            trailLength: 0.28,
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
              return `<div style="font-size:12px;">
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

      // Labels under stations (graphic, no axis)
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
                font: "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
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
                font: "400 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
                align: "center",
              },
              left: 0,
              top: 18,
            },
          ],
        })),
      ],
    };
  }, [activeIndex, lang]);
}

/* =========================================================
   INTEGRITY — ECHARTS (LOCK RING, NO KPI)
   ========================================================= */
function useIntegrityRingChart(t) {
  return useMemo(() => {
    const ring = [
      { name: t.integrityLegends[0].k, value: 1 },
      { name: t.integrityLegends[1].k, value: 1 },
      { name: t.integrityLegends[2].k, value: 1 },
      { name: t.integrityLegends[3].k, value: 1 },
    ];

    // Premium neutrals + single accent. No rainbow.
    const baseFill = "rgba(148, 163, 184, 0.10)";
    const stroke = "rgba(148, 163, 184, 0.30)";
    const accent = "#38bdf8";

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 240,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        backgroundColor: "#020617",
        borderColor: "#334155",
        textStyle: { color: "#e5e7eb" },
        formatter: (p) => {
          const name = p.name;
          const found = t.integrityLegends.find((x) => x.k === name);
          const desc = found ? found.d : "";
          return `<div style="font-size:12px;">
            <div style="letter-spacing:.14em; text-transform:uppercase; color:#94a3b8;">${t.integrityTitle}</div>
            <div style="margin-top:6px; font-weight:600; color:#e2e8f0;">${name}</div>
            <div style="margin-top:2px; color:#94a3b8;">${desc}</div>
          </div>`;
        },
      },
      series: [
        {
          type: "pie",
          radius: ["62%", "78%"],
          center: ["30%", "50%"],
          avoidLabelOverlap: true,
          hoverAnimation: false,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            color: baseFill,
            borderColor: stroke,
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              color: "rgba(56,189,248,0.14)",
              borderColor: accent,
              borderWidth: 1.5,
            },
          },
          data: ring,
        },
      ],
      graphic: [
        {
          type: "text",
          left: "30%",
          top: "43%",
          style: {
            text: t.integrityCenterTop,
            fill: "#e2e8f0",
            font: "700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
            align: "center",
          },
        },
        {
          type: "text",
          left: "30%",
          top: "52%",
          style: {
            text: t.integrityCenterBottom,
            fill: "#38bdf8",
            font: "800 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
            align: "center",
            letterSpacing: 1,
          },
        },
        // right-side “legend” rendered in HTML, so chart stays instrument-only
      ],
    };
  }, [t]);
}

/* =========================================================
   AUDIT — ECHARTS (TIMELINE, NO AXES)
   ========================================================= */
function useAuditTimelineChart(t) {
  return useMemo(() => {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const ts = (d) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;

    const short = (prefix) => {
      const x = Math.random().toString(16).slice(2, 6).toUpperCase();
      const y = Math.random().toString(16).slice(2, 6).toUpperCase();
      return `${prefix}:${x}${y}…`;
    };

    const events = t.auditEvents.slice(0, 5).map((e, idx) => {
      const d = new Date(now.getTime() - (4 - idx) * 75 * 1000);
      return {
        idx,
        time: ts(d),
        actor: e.actor,
        action: e.action,
        label: e.label,
        trace: short("TRACE"),
      };
    });

    const lineColor = "#38bdf8";
    const frame = "rgba(148,163,184,0.28)";
    const textDim = "#94a3b8";

    return {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 240,
      animationEasing: "cubicOut",
      grid: { left: 12, right: 12, top: 10, bottom: 16 },
      xAxis: {
        type: "category",
        data: events.map((e) => e.idx),
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
      },
      yAxis: { type: "value", min: -1, max: 1, show: false },
      tooltip: {
        trigger: "item",
        backgroundColor: "#020617",
        borderColor: "#334155",
        textStyle: { color: "#e5e7eb" },
        formatter: (p) => {
          const e = events[p.dataIndex];
          return `<div style="font-size:12px;">
            <div style="letter-spacing:.14em; text-transform:uppercase; color:${textDim};">${t.auditTitle}</div>
            <div style="margin-top:6px; font-weight:700; color:#e2e8f0;">${e.actor} · ${e.action}</div>
            <div style="margin-top:3px; color:${textDim};">${e.label}</div>
            <div style="margin-top:8px; color:${textDim}; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
              ${e.time} · ${e.trace}
            </div>
          </div>`;
        },
      },
      series: [
        // baseline
        {
          type: "line",
          data: events.map(() => [0]),
          // category index mapped automatically; we just need a visual stroke
          lineStyle: { width: 1, color: frame },
          symbol: "none",
          silent: true,
          z: 1,
        },
        // points
        {
          type: "line",
          data: events.map(() => 0),
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 2, color: lineColor, opacity: 0.35 },
          itemStyle: { color: "#e2e8f0", borderColor: lineColor, borderWidth: 2 },
          z: 2,
        },
      ],
      graphic: events.map((e) => ({
        type: "group",
        // place under points by percentage
        left: `${(e.idx / (events.length - 1 || 1)) * 100}%`,
        top: "62%",
        bounding: "raw",
        children: [
          {
            type: "text",
            style: {
              text: e.actor,
              fill: "#e2e8f0",
              font: "700 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
              align: "center",
            },
            left: 0,
            top: 0,
          },
          {
            type: "text",
            style: {
              text: e.label,
              fill: "#94a3b8",
              font: "400 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
              align: "center",
            },
            left: 0,
            top: 16,
          },
        ],
      })),
    };
  }, [t]);
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

  // Demo anchor (Ufficio)
  const activeStageIndex = 1;

  const railOption = usePipelineRailChart(activeStageIndex, lang);
  const integrityOption = useIntegrityRingChart(t);
  const auditOption = useAuditTimelineChart(t);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* metal haze (premium, restrained) */}
      <div
        className="pointer-events-none fixed inset-0 opacity-100"
        style={{
          backgroundImage: `
            radial-gradient(1100px 520px at 12% 18%, rgba(56,189,248,0.075), transparent 60%),
            radial-gradient(900px 440px at 78% 22%, rgba(16,185,129,0.045), transparent 64%),
            radial-gradient(900px 520px at 45% 85%, rgba(139,92,246,0.030), transparent 66%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.30))
          `,
        }}
      />

      {/* HEADER */}
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
                    "px-2.5 py-1.5 rounded-md text-[11px] uppercase tracking-[0.18em] transition",
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
                "h-9 px-4 rounded-full shadow-[0_18px_45px_rgba(56,189,248,0.20)]"
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
          <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* subtle vertical structure */}
            <div className="hidden lg:block absolute left-1/2 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-slate-800/60 to-transparent" />

            {/* LEFT / HERO */}
            <div className="lg:col-span-6 space-y-8 relative">
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

              <div className="space-y-2 text-[20px] leading-relaxed">
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
                    "px-7 py-3 rounded-xl shadow-[0_18px_50px_rgba(56,189,248,0.18)]"
                  )}
                >
                  {t.cta}
                </Link>
                <span className="text-sm text-slate-500">{t.accessNote}</span>
              </div>

              {/* Invariants (bigger, premium) */}
              <div className="pt-10">
                <div className="text-[12px] uppercase tracking-[0.28em] text-slate-500">
                  {t.invariantsTitle}
                </div>
                <div className="mt-4 space-y-3">
                  {t.invariants.map((inv, i) => (
                    <div key={i} className="text-[15px] text-slate-300 tracking-tight">
                      {inv}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT / CONTROL PANEL */}
            <div className="lg:col-span-6 relative">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Marker label={t.markers.system} value={t.markerValues.system} />
                <Marker label={t.markers.mode} value={t.markerValues.mode} />
                <Marker label={t.markers.scope} value={t.markerValues.scope} />
              </div>

              <div
                className={cardSurface(
                  true,
                  "p-7 border-slate-800 bg-slate-950/80 shadow-[0_28px_90px_rgba(2,6,23,0.78)]"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.28em] text-slate-500">
                      {t.panelTitle}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">{t.panelSub}</div>
                  </div>

                  <div className={cx(corePills(true, "emerald"), "rounded-full px-3 py-1.5")}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] uppercase tracking-[0.18em]">STABLE</span>
                  </div>
                </div>

                {/* PIPELINE */}
                <div className="mt-7">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">
                      {t.pipelineTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Build CNCS-6555 · 17/12/2025 · 18:29
                    </div>
                  </div>

                  <div className="mt-3">
                    <ReactECharts
                      option={railOption}
                      style={{ height: 170, width: "100%" }}
                      opts={{ renderer: "canvas" }}
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-800/70" />

                {/* INTEGRITY (ECharts instrument + clean legends) */}
                <div className="mt-5">
                  <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">
                    {t.integrityTitle}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5">
                      <ReactECharts
                        option={integrityOption}
                        style={{ height: 160, width: "100%" }}
                        opts={{ renderer: "canvas" }}
                      />
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      {t.integrityLegends.map((x, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400/90" />
                          <div className="min-w-0">
                            <div className="text-[14px] text-slate-200 font-semibold">
                              {x.k}
                            </div>
                            <div className="text-[13px] text-slate-400">
                              {x.d}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-800/70" />

                {/* AUDIT TIMELINE (ECharts) */}
                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-[12px] uppercase tracking-[0.24em] text-slate-500">
                      {t.auditTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t.auditHint}
                    </div>
                  </div>

                  <div className="mt-3">
                    <ReactECharts
                      option={auditOption}
                      style={{ height: 150, width: "100%" }}
                      opts={{ renderer: "canvas" }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[12px] text-slate-600">{t.noKpiNote}</div>
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
   Small UI bits (premium markers)
   ========================================================= */
function Marker({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
        {value}
      </span>
    </span>
  );
}
