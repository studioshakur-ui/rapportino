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
    // Limite FPS du canvas (30 = nettement plus fluide côté perf)
    maxFps: 30,
    // Réduction globale du nombre de particules (multiplie le baseCount)
    countMul: 0.6,
    // Désactive shadows (coûteux) sur les flocons "proches"
    enableFlakeShadows: false,
    // Opacité globale du canvas
    opacity: 0.9,
  },

  // Accumulation (banquette)
  accumulation: {
    // Désactive shimmer (animation + mix-blend), coûteux
    shimmer: false,
  },

  // ElectricFlow SVG dash animation
  flow: {
    enabled: true,
    // ralentit un peu (moins de frames perçues)
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
   HOLIDAY (Noël) — flag auto + override
   ========================================================= */
function isHolidaySeasonNow() {
  const d = new Date();
  const m = d.getMonth(); // 0-11
  const day = d.getDate();
  return (m === 11 && day >= 15) || (m === 0 && day <= 6);
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

function getSnowIntensityFromQuery() {
  const p = getQueryParamsSafe();
  const raw = (p.get("snow") || "").trim();
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
   ========================================================= */
function ElectricFlow({ t }) {
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
          <div className="min-w-0 text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {t.spec}
          </div>

          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/55 px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-[0.20em] text-slate-400">
              CORE 1.0
            </span>
            <span className="text-[11px] uppercase tracking-[0.20em] text-sky-200">
              LIVE
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px] md:h-[210px]" aria-hidden="true">
          <defs>
            <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(148,163,184,0.18)" />
              <stop offset="50%" stopColor="rgba(148,163,184,0.28)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.18)" />
            </linearGradient>
            <linearGradient id="currentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
              <stop offset="55%" stopColor="rgba(56,189,248,0.92)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.22)" />
            </linearGradient>
          </defs>

          <path d={d} fill="none" stroke="url(#railGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
          <path
            d={d}
            fill="none"
            stroke="rgba(56,189,248,0.09)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.52"
          />
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

          <Node x={x0} y={y} label={t.nodes[0]} sub={t.nodeSubs[0]} />
          <Node x={x1} y={y} label={t.nodes[1]} sub={t.nodeSubs[1]} />
          <Node x={x2} y={y} label={t.nodes[2]} sub={t.nodeSubs[2]} />
          <Node x={x3} y={y} label={t.nodes[3]} sub={t.nodeSubs[3]} />
        </svg>
      </div>
    </div>
  );
}

function Node({ x, y, label, sub }) {
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r="9.5"
        fill="rgba(2,6,23,0.92)"
        stroke="rgba(56,189,248,0.72)"
        strokeWidth="2"
      />
      <circle
        cx={x}
        cy={y}
        r="5"
        fill="rgba(2,6,23,0.98)"
        stroke="rgba(226,232,240,0.22)"
        strokeWidth="1"
      />
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
      // baseCount réduit + multiplicateur global PERF.countMul
      const baseCountRaw = intensity === 3 ? 260 : intensity === 2 ? 200 : 150;
      const baseCount = Math.max(80, Math.round(baseCountRaw * PERF.snow.countMul));

      const wind = intensity === 3 ? 0.24 : intensity === 2 ? 0.20 : 0.14;
      const gust = intensity === 3 ? 0.12 : intensity === 2 ? 0.09 : 0.06;
      const speedBoost = intensity === 3 ? 1.20 : intensity === 2 ? 1.05 : 0.95;

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

      // FPS limiter
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

      // PERF: éviter globalCompositeOperation "lighter" (coûteux sur certains GPU)
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

        // PERF: pas de shadowBlur (désactivable)
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
          // PERF: évite blur lourd
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
          // PERF: blur réduit fortement
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

  const holiday = useMemo(() => {
    const override = getHolidayOverrideFromQuery();
    if (override !== null) return override;
    return isHolidaySeasonNow();
  }, []);

  const snowIntensity = useMemo(() => getSnowIntensityFromQuery(), []);
  const snowAccEnabled = useMemo(() => getAccumulationEnabledFromQuery(), []);

  const accessHref = useMemo(() => {
    const subject = encodeURIComponent("Richiesta accesso CORE");
    const body = encodeURIComponent(
      "Buongiorno,\n\nVorrei richiedere l’accesso a CORE.\n\nNome:\nRuolo:\nCantiere/Sito:\nTelefono:\n\nGrazie."
    );
    return `mailto:info@core.local?subject=${subject}&body=${body}`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 620px at 14% 18%, rgba(56,189,248,0.08), transparent 62%),
            radial-gradient(900px 520px at 78% 22%, ${holiday ? "rgba(234,179,8,0.10)" : "rgba(16,185,129,0.05)"}, transparent 64%),
            radial-gradient(900px 520px at 48% 86%, ${holiday ? "rgba(245,158,11,0.08)" : "rgba(139,92,246,0.035)"}, transparent 66%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.48))
          `,
        }}
      />
      {/* PERF: réduire grain (moins d’opacité) */}
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
                  <span className={themeIconBg(true, holiday ? "amber" : "sky")}>●</span>
                  <span>CORE</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">
                  {t.eyebrow}
                </div>
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
                        l === lang ? (holiday ? "text-amber-200" : "text-sky-200") : "text-slate-500 hover:text-slate-300"
                      )}
                      aria-label={`Language ${l}`}
                      title={l.toUpperCase()}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {holiday ? (
                  <span
                    className="hidden md:inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/12 px-3 py-1.5"
                    style={{
                      boxShadow: "0 12px 34px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                    title="Seasonal mode — snow=1|2|3 — reset snowreset=1"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-200/80" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-amber-200">
                      {t.seasonalBadge}
                    </span>
                  </span>
                ) : null}

                <Link
                  to="/login"
                  className={cx(
                    buttonPrimary(true),
                    "h-9 px-4 rounded-xl shadow-[0_18px_45px_rgba(56,189,248,0.14)]"
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
                <div className="text-[12px] uppercase tracking-[0.30em] text-slate-500">{t.eyebrow}</div>

                <h1 className="text-7xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
                  {t.title}
                </h1>

                <div className="text-2xl text-slate-300 tracking-tight">{t.subtitle}</div>
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
                    holiday
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
                    holiday ? "text-amber-100 hover:bg-amber-500/8 hover:border-amber-400/25" : "text-slate-200 hover:bg-slate-950/70",
                    "transition"
                  )}
                >
                  {t.ctaSecondary}
                </a>

                <span className={cx("text-sm", holiday ? "text-amber-200/70" : "text-slate-500")}>
                  {holiday ? t.holidayNote : t.accessNote}
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <ElectricFlow t={t} />
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
