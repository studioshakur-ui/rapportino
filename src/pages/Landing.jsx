// src/pages/Landing.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { headerPill, themeIconBg, buttonPrimary } from "../ui/designSystem";

/* =========================================================
   PERF PROFILE (Landing)
   - Objectif: réduire CPU/GPU + supprimer filtres coûteux
   - Ajuste ici uniquement
   ========================================================= */
const PERF = {
  // Canvas snow
  snow: {
    maxFps: 30,
    countMul: 0.6,
    enableFlakeShadows: false,
    opacity: 0.9,
  },

  // Fireworks canvas (New Year)
  fireworks: {
    maxFps: 30,
    countMul: 0.9,
    opacity: 0.92,
    // Limite hard pour éviter les explosions trop lourdes
    maxSparks: 1100,
  },

  // Accumulation (banquette)
  accumulation: {
    shimmer: false,
  },

  // ElectricFlow SVG dash animation
  flow: {
    enabled: true,
    dashDurationMs: 9000,
    sparkDurationMs: 7800,
  },
};

/* =========================================================
   LANG
   ========================================================= */
const LANGS = ["it", "fr", "en"];

const COPY = {
  it: {
    eyebrow: "Sistema operativo di cantiere",
    title: "CORE",
    subtitle: "controllo operativo del cantiere.",
    valueLines: ["Rapportini validati.", "Evidenze consultabili."],
    accessNote: "Accesso riservato · visibilità per ruoli autorizzati",
    ctaPrimary: "Accedi",
    ctaSecondary: "Richiedi accesso",
    spec: "Un solo flusso · Un solo dato · Nessuna ricostruzione",
    nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
    nodeSubs: ["Inserisce", "Valida", "Archivia", "Legge"],
    closureTitle: "CORE non è un software.",
    closureSub: "È un organo operativo del cantiere.",
    closureLine: "Il sistema si ferma. La decisione inizia.",
    footerLeft: "Accesso riservato a personale e partner autorizzati.",
    footerRight: "CORE · Operazioni di cantiere",
    holidayNote: "Periodo festivo · operatività invariata",
    seasonalBadge: "SEASONAL · HOLIDAY",
    nyBadge: "HAPPY NEW YEAR · 2026",
    nyNote: "Edizione 31/12 · premium · operatività invariata",
    nyCountdownLabel: "Verso 00:00",
    nyWelcome: "BENVENUTO 2026",
  },

  fr: {
    eyebrow: "Système opérationnel de chantier",
    title: "CORE",
    subtitle: "contrôle opérationnel du chantier.",
    valueLines: ["Rapportini validés.", "Preuves consultables."],
    accessNote: "Accès réservé · visibilité par rôles autorisés",
    ctaPrimary: "Accéder",
    ctaSecondary: "Demander l’accès",
    spec: "Un seul flux · Une seule donnée · Aucune reconstruction",
    nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
    nodeSubs: ["Saisit", "Valide", "Archive", "Lit"],
    closureTitle: "CORE n’est pas un logiciel.",
    closureSub: "C’est un organe opérationnel du chantier.",
    closureLine: "Quand le système s’arrête, la décision commence.",
    footerLeft: "Accès réservé au personnel et partenaires autorisés.",
    footerRight: "CORE · Opérations de chantier",
    holidayNote: "Période festive · opérativité inchangée",
    seasonalBadge: "SAISON · FÊTES",
    nyBadge: "HAPPY NEW YEAR · 2026",
    nyNote: "Édition 31/12 · premium · opérativité inchangée",
    nyCountdownLabel: "Vers 00:00",
    nyWelcome: "BIENVENUE 2026",
  },

  en: {
    eyebrow: "Operational shipyard system",
    title: "CORE",
    subtitle: "operational control of the shipyard.",
    valueLines: ["Validated reports.", "Consultable evidence."],
    accessNote: "Restricted access · authorized roles",
    ctaPrimary: "Login",
    ctaSecondary: "Request access",
    spec: "One flow · One data · No reconstruction",
    nodes: ["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"],
    nodeSubs: ["Inputs", "Validates", "Archives", "Reads"],
    closureTitle: "CORE is not software.",
    closureSub: "It is an operational organ of the shipyard.",
    closureLine: "When the system stops, the decision begins.",
    footerLeft: "Restricted access to staff and authorized partners.",
    footerRight: "CORE · Shipyard operations",
    holidayNote: "Holiday season · operations unchanged",
    seasonalBadge: "SEASONAL · HOLIDAY",
    nyBadge: "HAPPY NEW YEAR · 2026",
    nyNote: "31/12 edition · premium · operations unchanged",
    nyCountdownLabel: "To 00:00",
    nyWelcome: "WELCOME 2026",
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
   SEASON FLAGS (Holiday + New Year) — auto + override
   ========================================================= */
function isHolidaySeasonNow() {
  const d = new Date();
  const m = d.getMonth(); // 0-11
  const day = d.getDate();
  return (m === 11 && day >= 15) || (m === 0 && day <= 6);
}

function isNewYearEveNow() {
  const d = new Date();
  return d.getMonth() === 11 && d.getDate() === 31;
}

function getQueryParamsSafe() {
  if (typeof window === "undefined") return new URLSearchParams();
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

function getHolidayOverrideFromQuery() {
  const p = getQueryParamsSafe();
  if (p.has("xmas")) {
    const v = p.get("xmas");
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  }
  return null;
}

function getNewYearOverrideFromQuery() {
  const p = getQueryParamsSafe();
  if (p.has("ny")) {
    const v = p.get("ny");
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  }
  return null;
}

function getSnowIntensityFromQuery() {
  const p = getQueryParamsSafe();
  const raw = (p.get("snow") || "").trim();
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function getFireworksIntensityFromQuery() {
  const p = getQueryParamsSafe();
  const raw = (p.get("fw") || "").trim();
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}

function getAccumulationEnabledFromQuery() {
  const p = getQueryParamsSafe();
  if (!p.has("acc")) return true;
  const v = p.get("acc");
  if (v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  return true;
}

function shouldResetSnowFromQuery() {
  const p = getQueryParamsSafe();
  if (!p.has("snowreset")) return false;
  const v = p.get("snowreset");
  return v === "1" || v === "true";
}

/* =========================================================
   Electric Flow (SVG + WAAPI) — slow, industrial (perf tuned)
   theme: "sky" | "amber" | "gold"
   ========================================================= */
function ElectricFlow({ t, theme = "sky" }) {
  const dashRef = useRef(null);
  const sparkRef = useRef(null);

  const W = 760;
  const H = 200;

  const leftPad = 58;
  const rightPad = 58;
  const y = 104;

  const x0 = leftPad;
  const x3 = W - rightPad;
  const x1 = x0 + (x3 - x0) * 0.33;
  const x2 = x0 + (x3 - x0) * 0.66;

  const d = useMemo(() => {
    const c1y = y - 16;
    const c2y = y + 12;
    return `
      M ${x0} ${y}
      C ${x0 + 84} ${c1y}, ${x1 - 84} ${c1y}, ${x1} ${y}
      S ${x2 - 84} ${c2y}, ${x2} ${y}
      S ${x3 - 84} ${c1y}, ${x3} ${y}
    `
      .replace(/\s+/g, " ")
      .trim();
  }, [x0, x1, x2, x3, y]);

  const colors = useMemo(() => {
    if (theme === "gold") {
      return {
        rail: ["rgba(148,163,184,0.16)", "rgba(148,163,184,0.30)", "rgba(148,163,184,0.16)"],
        current: ["rgba(245,158,11,0.22)", "rgba(255,231,180,0.95)", "rgba(245,158,11,0.22)"],
        glow: "rgba(245,158,11,0.08)",
        nodeStroke: "rgba(245,158,11,0.70)",
      };
    }
    if (theme === "amber") {
      return {
        rail: ["rgba(148,163,184,0.18)", "rgba(148,163,184,0.30)", "rgba(148,163,184,0.18)"],
        current: ["rgba(245,158,11,0.18)", "rgba(245,158,11,0.92)", "rgba(245,158,11,0.18)"],
        glow: "rgba(245,158,11,0.07)",
        nodeStroke: "rgba(245,158,11,0.70)",
      };
    }
    return {
      rail: ["rgba(148,163,184,0.18)", "rgba(148,163,184,0.28)", "rgba(148,163,184,0.18)"],
      current: ["rgba(56,189,248,0.22)", "rgba(56,189,248,0.92)", "rgba(56,189,248,0.22)"],
      glow: "rgba(56,189,248,0.06)",
      nodeStroke: "rgba(56,189,248,0.72)",
    };
  }, [theme]);

  useEffect(() => {
    if (!PERF.flow.enabled) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    const dashEl = dashRef.current;
    const sparkEl = sparkRef.current;
    if (!dashEl || !sparkEl) return;

    const dashAnim = dashEl.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -320 }],
      { duration: PERF.flow.dashDurationMs, iterations: Infinity, easing: "linear" }
    );

    const sparkAnim = sparkEl.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -680 }],
      { duration: PERF.flow.sparkDurationMs, iterations: Infinity, easing: "linear" }
    );

    const onVis = () => {
      const visible = document.visibilityState === "visible";
      if (visible) {
        dashAnim.play();
        sparkAnim.play();
      } else {
        dashAnim.pause();
        sparkAnim.pause();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      dashAnim.cancel();
      sparkAnim.cancel();
    };
  }, []);

  return (
    <div className="relative">
      <style>{`
        .metalPanel {
          position: relative;
          border-radius: 20px;
          background:
            radial-gradient(900px 320px at 18% 18%, rgba(56,189,248,0.08), transparent 58%),
            radial-gradient(720px 260px at 84% 24%, rgba(16,185,129,0.05), transparent 64%),
            linear-gradient(to bottom, rgba(2,6,23,0.52), rgba(2,6,23,0.26));
          border: 1px solid rgba(148,163,184,0.18);
          box-shadow:
            0 28px 90px rgba(2,6,23,0.72),
            inset 0 1px 0 rgba(226,232,240,0.06),
            inset 0 -1px 0 rgba(2,6,23,0.55);
          overflow: hidden;
        }
        .metalPanel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          background:
            linear-gradient(to bottom, rgba(226,232,240,0.06), transparent 18%),
            linear-gradient(to top, rgba(2,6,23,0.55), transparent 22%);
          opacity: 1;
        }
        .metalPanel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 20px;
          background-image:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.016) 0px,
              rgba(255,255,255,0.016) 1px,
              rgba(0,0,0,0.016) 2px,
              rgba(0,0,0,0.016) 3px
            );
          opacity: 0.28;
        }
        /* PERF: supprimer drop-shadows SVG (très coûteux) */
        .softGlow { }
      `}</style>

      <div className="metalPanel p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="min-w-0 text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.spec}</div>

          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-[0.20em] text-slate-400">CORE 1.0</span>
            <span
              className={cx(
                "text-[11px] uppercase tracking-[0.20em]",
                theme === "gold" ? "text-amber-200" : theme === "amber" ? "text-amber-200" : "text-sky-200"
              )}
            >
              LIVE
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px] md:h-[210px]" aria-hidden="true">
          <defs>
            <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.rail[0]} />
              <stop offset="50%" stopColor={colors.rail[1]} />
              <stop offset="100%" stopColor={colors.rail[2]} />
            </linearGradient>

            <linearGradient id="currentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.current[0]} />
              <stop offset="55%" stopColor={colors.current[1]} />
              <stop offset="100%" stopColor={colors.current[2]} />
            </linearGradient>
          </defs>

          <path d={d} fill="none" stroke="url(#railGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
          <path d={d} fill="none" stroke={colors.glow} strokeWidth="12" strokeLinecap="round" opacity="0.62" />
          <path
            ref={dashRef}
            d={d}
            fill="none"
            stroke="url(#currentGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="34 52"
            strokeDashoffset="0"
            opacity="0.95"
          />
          <path
            ref={sparkRef}
            d={d}
            fill="none"
            stroke="rgba(226,232,240,0.88)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="3 180"
            strokeDashoffset="0"
            opacity="0.70"
          />

          <Node x={x0} y={y} label={t.nodes[0]} sub={t.nodeSubs[0]} stroke={colors.nodeStroke} />
          <Node x={x1} y={y} label={t.nodes[1]} sub={t.nodeSubs[1]} stroke={colors.nodeStroke} />
          <Node x={x2} y={y} label={t.nodes[2]} sub={t.nodeSubs[2]} stroke={colors.nodeStroke} />
          <Node x={x3} y={y} label={t.nodes[3]} sub={t.nodeSubs[3]} stroke={colors.nodeStroke} />
        </svg>
      </div>
    </div>
  );
}

function Node({ x, y, label, sub, stroke }) {
  return (
    <>
      <circle cx={x} cy={y} r="9.5" fill="rgba(2,6,23,0.92)" stroke={stroke} strokeWidth="2" />
      <circle cx={x} cy={y} r="5" fill="rgba(2,6,23,0.98)" stroke="rgba(226,232,240,0.22)" strokeWidth="1" />
      <circle cx={x} cy={y} r="2.6" fill="rgba(226,232,240,0.92)" />
      <circle cx={x} cy={y} r="6.5" fill="rgba(56,189,248,0.06)" />

      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        fontSize="12"
        fill="rgba(226,232,240,0.95)"
        style={{ fontWeight: 700, letterSpacing: "0.10em" }}
      >
        {label}
      </text>
      <text x={x} y={y + 48} textAnchor="middle" fontSize="11" fill="rgba(148,163,184,0.92)">
        {sub}
      </text>
    </>
  );
}

/* =========================================================
   SNOW (Canvas) — falling + wind (perf tuned)
   intensity: 1|2|3
   ========================================================= */
function SnowCanvas({ enabled, intensity = 2 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const particlesRef = useRef([]);
  const lastRef = useRef(0);
  const visPauseRef = useRef(false);
  const accRef = useRef(0); // for FPS limiting

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const config = (() => {
      const baseCountRaw = intensity === 3 ? 260 : intensity === 2 ? 200 : 150;
      const baseCount = Math.max(80, Math.round(baseCountRaw * PERF.snow.countMul));

      const wind = intensity === 3 ? 0.24 : intensity === 2 ? 0.20 : 0.14;
      const gust = intensity === 3 ? 0.12 : intensity === 2 ? 0.09 : 0.06;
      const speedBoost = intensity === 3 ? 1.2 : intensity === 2 ? 1.05 : 0.95;

      return { baseCount, wind, gust, speedBoost };
    })();

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function makeParticle(w, h) {
      const depthRoll = Math.random();
      let r, speed, alpha;

      if (depthRoll < 0.38) {
        r = rand(0.8, 1.5);
        speed = rand(18, 48);
        alpha = rand(0.16, 0.30);
      } else if (depthRoll < 0.82) {
        r = rand(1.4, 2.5);
        speed = rand(45, 92);
        alpha = rand(0.22, 0.40);
      } else {
        r = rand(2.2, 3.6);
        speed = rand(72, 135);
        alpha = rand(0.26, 0.52);
      }

      return {
        x: rand(0, w),
        y: rand(-h, 0),
        r,
        vy: speed * config.speedBoost,
        vx: rand(-7, 7),
        drift: rand(-1, 1),
        alpha,
        phase: rand(0, Math.PI * 2),
      };
    }

    function seedParticles() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const arr = [];
      for (let i = 0; i < config.baseCount; i++) arr.push(makeParticle(w, h));
      particlesRef.current = arr;
    }

    function step(ts) {
      rafRef.current = requestAnimationFrame(step);
      if (visPauseRef.current) return;

      const targetFrameMs = 1000 / Math.max(10, PERF.snow.maxFps);
      const lastTick = accRef.current || ts;
      if (ts - lastTick < targetFrameMs) return;
      accRef.current = ts;

      const w = window.innerWidth;
      const h = window.innerHeight;

      const last = lastRef.current || ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      lastRef.current = ts;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      const windBase = config.wind;
      const windGust = config.gust * Math.sin(ts / 1400);
      const wind = windBase + windGust;

      const ps = particlesRef.current;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        p.phase += dt * 1.1;
        const sway = Math.sin(p.phase) * (0.30 + p.r * 0.05);

        p.x += (p.vx + wind * 110 + p.drift * 14 + sway * 20) * dt;
        p.y += p.vy * dt;

        if (p.y > h + 10) {
          p.y = rand(-140, -18);
          p.x = rand(0, w);
        }
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;

        ctx.beginPath();
        ctx.globalAlpha = p.alpha;

        if (PERF.snow.enableFlakeShadows && p.r >= 3.0) {
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.shadowColor = "rgba(255,255,255,0.12)";
          ctx.shadowBlur = 7;
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.shadowColor = "rgba(255,255,255,0.0)";
          ctx.shadowBlur = 0;
        }

        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    function onVis() {
      visPauseRef.current = document.visibilityState !== "visible";
    }

    resize();
    seedParticles();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, intensity, reduceMotion]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 70,
        opacity: PERF.snow.opacity,
      }}
    />
  );
}

/* =========================================================
   Snow Accumulation — growing snowbank at bottom (perf tuned)
   - shimmer désactivé par défaut (PERF.accumulation.shimmer)
   ========================================================= */
function SnowAccumulation({ enabled, intensity = 2 }) {
  const KEY = "core_snow_acc_v1";
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch {
      return false;
    }
  }, []);

  const [px, setPx] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const reset = shouldResetSnowFromQuery();
      if (reset) {
        window.localStorage.removeItem(KEY);
        return 0;
      }
      const raw = window.localStorage.getItem(KEY);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? Math.max(0, Math.min(160, n)) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!enabled) return;

    const growthPerSec = intensity === 3 ? 7.0 : intensity === 2 ? 5.2 : 3.8;
    const maxPx = intensity === 3 ? 140 : 110;

    function tick(ts) {
      rafRef.current = requestAnimationFrame(tick);
      if (reduceMotion) return;

      const last = lastRef.current || ts;
      const dt = Math.min(0.06, Math.max(0.001, (ts - last) / 1000));
      lastRef.current = ts;

      setPx((cur) => {
        const next = Math.min(maxPx, cur + growthPerSec * dt);
        try {
          window.localStorage.setItem(KEY, String(next));
        } catch {}
        return next;
      });
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, intensity, reduceMotion]);

  if (!enabled) return null;

  const h = Math.round(px);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 right-0 bottom-0"
        style={{
          zIndex: 75,
          height: `${Math.max(18, h)}px`,
          background: `
            linear-gradient(to top,
              rgba(255,255,255,0.44),
              rgba(255,255,255,0.20) 38%,
              rgba(255,255,255,0.08) 70%,
              rgba(255,255,255,0.00)
            )
          `,
          filter: "none",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 right-0 bottom-0"
        style={{
          zIndex: 76,
          height: `${Math.max(26, h + 28)}px`,
          backgroundImage: `
            radial-gradient(120px 26px at 8% 70%, rgba(255,255,255,0.20), transparent 65%),
            radial-gradient(140px 28px at 22% 76%, rgba(255,255,255,0.18), transparent 66%),
            radial-gradient(160px 30px at 38% 72%, rgba(255,255,255,0.16), transparent 66%),
            radial-gradient(150px 28px at 54% 78%, rgba(255,255,255,0.18), transparent 66%),
            radial-gradient(170px 30px at 70% 74%, rgba(255,255,255,0.16), transparent 66%),
            radial-gradient(140px 26px at 86% 78%, rgba(255,255,255,0.18), transparent 66%)
          `,
          opacity: 0.9,
          filter: "blur(0.6px)",
        }}
      />

      {PERF.accumulation.shimmer ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 right-0 bottom-0"
          style={{
            zIndex: 77,
            height: `${Math.max(34, h + 40)}px`,
            backgroundImage: `
              linear-gradient(90deg,
                rgba(255,255,255,0.00) 0%,
                rgba(255,255,255,0.08) 22%,
                rgba(255,255,255,0.00) 45%,
                rgba(255,255,255,0.06) 62%,
                rgba(255,255,255,0.00) 100%
              )
            `,
            mixBlendMode: "screen",
            filter: "blur(0.8px)",
          }}
        />
      ) : null}
    </>
  );
}

/* =========================================================
   NEW YEAR — Fireworks Canvas (perf tuned)
   intensity: 1|2|3 (fw=1|2|3)
   ========================================================= */
function FireworksCanvas({ enabled, intensity = 2 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const accRef = useRef(0);
  const visPauseRef = useRef(false);

  const rocketsRef = useRef([]);
  const sparksRef = useRef([]);
  const spawnAccRef = useRef(0);

  const reduceMotion = useMemo(() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const config = (() => {
      // Intensité = densité + fréquence (mais plafonnée)
      const spawnPerSec = intensity === 3 ? 2.0 : intensity === 2 ? 1.35 : 0.9;
      const rocketSpeed = intensity === 3 ? 980 : intensity === 2 ? 860 : 760;
      const sparkCount = intensity === 3 ? 120 : intensity === 2 ? 96 : 78;
      const sparkLife = intensity === 3 ? 1.65 : intensity === 2 ? 1.45 : 1.25;
      return { spawnPerSec, rocketSpeed, sparkCount, sparkLife };
    })();

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    function makeRocket(w, h) {
      const x = rand(w * 0.08, w * 0.92);
      const y = h + rand(18, 80);
      // cible haute (explosion)
      const targetY = rand(h * 0.18, h * 0.45);
      // léger drift horizontal
      const vx = rand(-46, 46);
      const vy = -rand(config.rocketSpeed * 0.78, config.rocketSpeed * 1.0);
      return {
        x,
        y,
        vx,
        vy,
        targetY,
        t: 0,
        // couleur "champagne"
        hue: rand(38, 52), // zone or/ambre
        bright: rand(0.82, 0.98),
      };
    }

    function explode(rocket) {
      const w = window.innerWidth;
      const h = window.innerHeight;

      const cx0 = clamp(rocket.x, 8, w - 8);
      const cy0 = clamp(rocket.y, 8, h - 8);

      const base = config.sparkCount;
      const count = Math.round(base * PERF.fireworks.countMul);

      // ring + burst
      const ringCount = Math.round(count * 0.25);
      const burstCount = count - ringCount;

      const sparks = sparksRef.current;

      const maxAllow = PERF.fireworks.maxSparks;
      if (sparks.length > maxAllow) {
        sparks.splice(0, sparks.length - Math.floor(maxAllow * 0.8));
      }

      // anneau
      const ringR = rand(160, 260);
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        const speed = ringR * rand(1.9, 2.4);
        sparks.push({
          x: cx0,
          y: cy0,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: config.sparkLife * rand(0.85, 1.15),
          age: 0,
          r: rand(0.9, 1.8),
          alpha: rand(0.55, 0.95),
          hue: rocket.hue + rand(-6, 6),
          white: Math.random() < 0.16,
        });
      }

      // burst
      for (let i = 0; i < burstCount; i++) {
        const a = rand(0, Math.PI * 2);
        const speed = rand(220, 680);
        sparks.push({
          x: cx0,
          y: cy0,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: config.sparkLife * rand(0.75, 1.25),
          age: 0,
          r: rand(0.8, 1.9),
          alpha: rand(0.45, 0.92),
          hue: rocket.hue + rand(-8, 8),
          white: Math.random() < 0.12,
        });
      }

      // flash (très léger)
      sparks.push({
        x: cx0,
        y: cy0,
        vx: 0,
        vy: 0,
        life: 0.18,
        age: 0,
        r: rand(10, 18),
        alpha: 0.18,
        hue: rocket.hue,
        white: true,
        isFlash: true,
      });
    }

    function step(ts) {
      rafRef.current = requestAnimationFrame(step);
      if (visPauseRef.current) return;

      const targetFrameMs = 1000 / Math.max(10, PERF.fireworks.maxFps);
      const lastTick = accRef.current || ts;
      if (ts - lastTick < targetFrameMs) return;
      accRef.current = ts;

      const w = window.innerWidth;
      const h = window.innerHeight;

      const last = lastRef.current || ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      lastRef.current = ts;

      // fade (trails) — via clear + alpha overlay
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2,6,23,0.22)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // spawn rockets
      spawnAccRef.current += dt * config.spawnPerSec;
      const rockets = rocketsRef.current;
      while (spawnAccRef.current >= 1) {
        spawnAccRef.current -= 1;
        rockets.push(makeRocket(w, h));
      }

      // update rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t += dt;
        // simple physics
        r.x += r.vx * dt;
        r.y += r.vy * dt;

        // slight gravity
        r.vy += 220 * dt;

        // draw rocket head (tiny)
        const a = clamp(0.22 + r.bright * 0.55, 0.18, 0.92);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,231,180,0.95)";
        ctx.arc(r.x, r.y, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // explode condition
        if (r.y <= r.targetY || r.t > 1.6) {
          explode(r);
          rockets.splice(i, 1);
        }

        // out-of-bounds cleanup
        if (r.y < -120 || r.x < -120 || r.x > w + 120) {
          rockets.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;

      // update sparks
      const sparks = sparksRef.current;

      // PERF: pas de lighter constant (GPU), on reste source-over
      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age >= s.life) {
          sparks.splice(i, 1);
          continue;
        }

        const k = 1 - s.age / s.life;

        // physics
        if (!s.isFlash) {
          s.vy += 300 * dt; // gravity
          s.vx *= 0.985; // air drag
          s.vy *= 0.985;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }

        const alpha = s.alpha * Math.pow(k, 0.9);
        ctx.globalAlpha = alpha;

        if (s.isFlash) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.arc(s.x, s.y, s.r * (0.55 + 0.9 * k), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // champagne/gold particle
          const hue = Math.round(s.hue);
          const col = s.white ? "rgba(255,255,255,0.92)" : `hsla(${hue}, 92%, 70%, 0.95)`;

          ctx.beginPath();
          ctx.fillStyle = col;
          ctx.arc(s.x, s.y, s.r * (0.85 + 0.35 * k), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function onVis() {
      visPauseRef.current = document.visibilityState !== "visible";
    }

    resize();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);

    // seed first rockets for instant wow
    rocketsRef.current = [];
    sparksRef.current = [];
    spawnAccRef.current = 0.6;

    // initial clear
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, intensity, reduceMotion]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 70,
        opacity: PERF.fireworks.opacity,
      }}
    />
  );
}

/* =========================================================
   New Year Countdown (lightweight)
   ========================================================= */
function NewYearCountdown({ enabled, t }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const tickMs = reduce ? 1000 : 500;
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const y = now.getFullYear();
  const target = new Date(y + 1, 0, 1, 0, 0, 0, 0); // next Jan 1
  const ms = target.getTime() - now.getTime();

  const done = ms <= 0;

  function pad2(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;

  return (
    <div className="mt-5">
      <div
        className={cx(
          "inline-flex items-center gap-3 rounded-2xl border px-4 py-3",
          "bg-slate-950/40 backdrop-blur",
          "border-amber-400/30"
        )}
        style={{
          boxShadow: "0 18px 55px rgba(245,158,11,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-200/80" />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.26em] text-amber-200/80">
            {done ? "NEW YEAR" : t.nyCountdownLabel}
          </div>
          <div className={cx("font-semibold tracking-tight", done ? "text-amber-100" : "text-slate-100")}>
            {done ? t.nyWelcome : `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LANDING — Démo-grade (perf tuned)
   ========================================================= */
export default function Landing() {
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

  // Determine season mode with strict priority:
  // 1) ny override
  // 2) new year eve (31/12)
  // 3) xmas override
  // 4) holiday season auto
  const seasonMode = useMemo(() => {
    const nyOverride = getNewYearOverrideFromQuery();
    if (nyOverride !== null) return nyOverride ? "ny" : "none";

    if (isNewYearEveNow()) return "ny";

    const holidayOverride = getHolidayOverrideFromQuery();
    if (holidayOverride !== null) return holidayOverride ? "holiday" : "none";

    return isHolidaySeasonNow() ? "holiday" : "none";
  }, []);

  const holiday = seasonMode === "holiday";
  const ny = seasonMode === "ny";

  const snowIntensity = useMemo(() => getSnowIntensityFromQuery(), []);
  const snowAccEnabled = useMemo(() => getAccumulationEnabledFromQuery(), []);
  const fwIntensity = useMemo(() => getFireworksIntensityFromQuery(), []);

  const accessHref = useMemo(() => {
    const subject = encodeURIComponent("Richiesta accesso CORE");
    const body = encodeURIComponent(
      "Buongiorno,\n\nVorrei richiedere l’accesso a CORE.\n\nNome:\nRuolo:\nCantiere/Sito:\nTelefono:\n\nGrazie."
    );
    return `mailto:info@core.local?subject=${subject}&body=${body}`;
  }, []);

  const heroTitleStyle = useMemo(() => {
    if (!ny) return null;
    return {
      backgroundImage:
        "linear-gradient(90deg, rgba(255,231,180,1), rgba(245,158,11,1), rgba(255,231,180,1))",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    };
  }, [ny]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: ny
            ? `
              radial-gradient(1200px 680px at 14% 18%, rgba(255,231,180,0.10), transparent 62%),
              radial-gradient(900px 560px at 78% 22%, rgba(245,158,11,0.14), transparent 64%),
              radial-gradient(900px 560px at 52% 86%, rgba(16,185,129,0.05), transparent 66%),
              radial-gradient(1100px 520px at 46% 40%, rgba(255,255,255,0.03), transparent 70%),
              linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.62))
            `
            : `
              radial-gradient(1200px 620px at 14% 18%, rgba(56,189,248,0.08), transparent 62%),
              radial-gradient(900px 520px at 78% 22%, ${
                holiday ? "rgba(234,179,8,0.10)" : "rgba(16,185,129,0.05)"
              }, transparent 64%),
              radial-gradient(900px 520px at 48% 86%, ${
                holiday ? "rgba(245,158,11,0.08)" : "rgba(139,92,246,0.035)"
              }, transparent 66%),
              linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.48))
            `,
        }}
      />

      {/* GRAIN (reduced opacity) */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.20) 0px,
              rgba(255,255,255,0.20) 1px,
              rgba(0,0,0,0.20) 2px,
              rgba(0,0,0,0.20) 3px
            )
          `,
          mixBlendMode: "overlay",
        }}
      />

      {/* NEW YEAR — gold foil overlay (subtle) */}
      {ny ? (
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            zIndex: 65,
            backgroundImage: `
              conic-gradient(
                from 180deg at 50% 35%,
                rgba(245,158,11,0.00),
                rgba(255,231,180,0.07),
                rgba(245,158,11,0.00),
                rgba(255,255,255,0.04),
                rgba(245,158,11,0.00)
              )
            `,
            mixBlendMode: "screen",
            opacity: 0.85,
          }}
          aria-hidden="true"
        />
      ) : null}

      {/* CANVAS LAYERS */}
      <FireworksCanvas enabled={ny} intensity={fwIntensity} />

      {/* SNOW: falling + accumulation (holiday only) */}
      <SnowCanvas enabled={holiday} intensity={snowIntensity} />
      <SnowAccumulation enabled={holiday && snowAccEnabled} intensity={snowIntensity} />

      {/* HEADER */}
      <header className="relative z-20 px-3 pt-3">
        <div className="mx-auto max-w-7xl">
          <div className="no-print sticky top-0 z-30 rounded-2xl border border-slate-800 bg-[#050910]/70 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className={cx(headerPill(true), "border-slate-700 text-slate-200 bg-slate-900/40")}>
                  <span className={themeIconBg(true, ny || holiday ? "amber" : "sky")}>●</span>
                  <span>CORE</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">{t.eyebrow}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/45 px-2 py-1">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      className={cx(
                        "px-2.5 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.18em] transition",
                        l === lang
                          ? ny || holiday
                            ? "text-amber-200"
                            : "text-sky-200"
                          : "text-slate-500 hover:text-slate-300"
                      )}
                      aria-label={`Language ${l}`}
                      title={l.toUpperCase()}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {(ny || holiday) && !ny ? (
                  <span
                    className="hidden md:inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/12 px-3 py-1.5"
                    style={{
                      boxShadow: "0 12px 34px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    title="Seasonal mode — snow=1|2|3 — reset snowreset=1"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-200/80" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-amber-200">{t.seasonalBadge}</span>
                  </span>
                ) : null}

                {ny ? (
                  <span
                    className="hidden md:inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-500/10 px-3 py-1.5"
                    style={{
                      boxShadow: "0 12px 38px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    title="New Year mode — fw=1|2|3"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-200/85" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-amber-200">NEW YEAR · 31/12</span>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">LIMITED</span>
                  </span>
                ) : null}

                <Link
                  to="/login"
                  className={cx(
                    buttonPrimary(true),
                    "h-9 px-4 rounded-xl",
                    ny
                      ? "shadow-[0_18px_52px_rgba(245,158,11,0.16)]"
                      : "shadow-[0_18px_45px_rgba(56,189,248,0.14)]"
                  )}
                >
                  {t.ctaPrimary}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-6 space-y-9">
              <div className="space-y-3">
                {ny ? (
                  <div
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-slate-950/40 px-4 py-2 backdrop-blur"
                    style={{
                      boxShadow: "0 18px 60px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-200/80" />
                    <span className="text-[11px] uppercase tracking-[0.22em] text-amber-200">{t.nyBadge}</span>
                  </div>
                ) : null}

                <div className="text-[12px] uppercase tracking-[0.30em] text-slate-500">{t.eyebrow}</div>

                <h1 className="text-7xl md:text-7xl font-semibold tracking-tight leading-[0.95]" style={heroTitleStyle || undefined}>
                  {t.title}
                </h1>

                <div className="text-2xl text-slate-300 tracking-tight">{t.subtitle}</div>

                {ny ? <NewYearCountdown enabled={ny} t={t} /> : null}
              </div>

              <div className="space-y-2 text-[22px] leading-relaxed">
                {t.valueLines.map((line, idx) => (
                  <div key={idx} className="text-slate-100">
                    {line}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className={cx(
                    buttonPrimary(true),
                    ny
                      ? "px-7 py-3 rounded-xl shadow-[0_20px_60px_rgba(245,158,11,0.18)]"
                      : holiday
                      ? "px-7 py-3 rounded-xl shadow-[0_18px_52px_rgba(245,158,11,0.10)]"
                      : "px-7 py-3 rounded-xl shadow-[0_18px_50px_rgba(56,189,248,0.14)]"
                  )}
                >
                  {t.ctaPrimary}
                </Link>

                <a
                  href={accessHref}
                  className={cx(
                    "inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/45 px-7 py-3",
                    ny
                      ? "text-amber-100 hover:bg-amber-500/8 hover:border-amber-300/25"
                      : holiday
                      ? "text-amber-100 hover:bg-amber-500/8 hover:border-amber-400/25"
                      : "text-slate-200 hover:bg-slate-950/70",
                    "transition"
                  )}
                >
                  {t.ctaSecondary}
                </a>

                <span className={cx("text-sm", ny ? "text-amber-200/75" : holiday ? "text-amber-200/70" : "text-slate-500")}>
                  {ny ? t.nyNote : holiday ? t.holidayNote : t.accessNote}
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <ElectricFlow t={t} theme={ny ? "gold" : holiday ? "amber" : "sky"} />
            </div>
          </section>

          <section className="pt-16 mt-16 border-t border-slate-800/70">
            <div className="text-5xl font-semibold tracking-tight leading-[1.05]">
              {t.closureTitle}
              <br />
              {t.closureSub}
            </div>
            <div className="mt-4 text-base text-slate-400 max-w-3xl leading-relaxed">{t.closureLine}</div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-800/70">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-[11px] text-slate-500">
          <span>{t.footerLeft}</span>
          <span>{t.footerRight}</span>
        </div>
      </footer>
    </div>
  );
}
