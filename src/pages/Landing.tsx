// src/pages/Landing.tsx
//
// CORE AI Landing (no effects)
// - Industrial, audit-grade, zero distraction
// - IA felt through signals, explainability, and evidence

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Lang = "it" | "fr" | "en";

const LANGS: Lang[] = ["it", "fr", "en"];

type Copy = {
  topNav: {
    product: string;
    security: string;
    demo: string;
    requestAccess: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    bullets: [string, string, string];
    ctaPrimary: string;
    ctaSecondary: string;
    badge: string;
  };
  signals: {
    title: string;
    cards: {
      quality: {
        label: string;
        headline: string;
        value: string;
        detail: string;
        link: string;
      };
      productivity: {
        label: string;
        headline: string;
        value: string;
        detail: string;
        link: string;
      };
      audit: {
        label: string;
        headline: string;
        value: string;
        detail: string;
        link: string;
      };
    };
  };
  explain: {
    title: string;
    leftKpiTitle: string;
    leftKpiValue: string;
    leftKpiMeta: string;
    whyTitle: string;
    causes: [string, string, string];
    evidence: string;
  };
  truthChain: {
    title: string;
    subtitle: string;
    steps: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  adoption: {
    title: string;
    items: [string, string, string];
  };
  security: {
    title: string;
    line: string;
  };
  useCases: {
    title: string;
    cards: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  proof: {
    title: string;
    subtitle: string;
    cta: string;
  };
  finalCta: {
    title: string;
    primary: string;
    secondary: string;
  };
  footer: {
    left: string;
    right: string;
  };
};

const COPY: Record<Lang, Copy> = {
  it: {
    topNav: {
      product: "Prodotto",
      security: "Sicurezza",
      demo: "Demo",
      requestAccess: "Richiedi accesso",
    },
    hero: {
      eyebrow: "Sistema operativo di cantiere",
      title: "CORE AI — Controllo operativo con evidenze.",
      subtitle:
        "Il sistema legge i rapportini, rileva incoerenze e spiega la produttività con prove verificabili.",
      bullets: [
        "Nessun cambio di metodo",
        "Nessuna decisione automatica",
        "Solo controlli, segnali e prove",
      ],
      ctaPrimary: "Vedi la demo",
      ctaSecondary: "Esempio audit (PDF)",
      badge: "AI checked",
    },
    signals: {
      title: "AI Signal Engine",
      cards: {
        quality: {
          label: "Qualità",
          headline: "Incoerenze rilevate",
          value: "2",
          detail: "Previsto = 0 con Prodotto > 0",
          link: "Vedi esempi",
        },
        productivity: {
          label: "Produttività",
          headline: "Indice spiegato",
          value: "0,97",
          detail: "Riduzione dovuta a sotto-allocazione ore",
          link: "Vedi prove",
        },
        audit: {
          label: "Audit",
          headline: "Audit pronto",
          value: "PDF",
          detail: "Firmato · Versionato · Tracciabile",
          link: "Apri esempio",
        },
      },
    },
    explain: {
      title: "Explainability",
      leftKpiTitle: "Indice complessivo",
      leftKpiValue: "0,97",
      leftKpiMeta: "Confidenza: alta · dati completi",
      whyTitle: "Perché l’indice è 0,97?",
      causes: [
        "Attività posa cavi: 2h non allocate",
        "Linee 3 e 7 incomplete",
        "Operatore presente < 8h",
      ],
      evidence: "Prove disponibili: righe 3 · 7 · 11",
    },
    truthChain: {
      title: "Un solo flusso. Una sola verità.",
      subtitle: "Manager pianifica → Capo esegue → CORE traccia → Direzione controlla",
      steps: [
        { title: "Manager", body: "Pianifica squadre e slot." },
        { title: "Capo", body: "Esegue e compila il rapportino." },
        { title: "CORE Drive", body: "Archivia evidenze e versioni." },
        { title: "Direzione", body: "Legge KPI, scostamenti e prove." },
      ],
    },
    adoption: {
      title: "Zero frizione di adozione",
      items: [
        "Nessuna decisione automatica",
        "Ruoli e responsabilità chiari",
        "Sempre pronti per audit",
      ],
    },
    security: {
      title: "Sicurezza e tracciabilità",
      line: "Accesso per ruoli · Tracciabilità completa · Export firmato",
    },
    useCases: {
      title: "Per ruoli. Per il cantiere.",
      cards: [
        { title: "Capo", body: "Compilazione più veloce con controlli automatici." },
        { title: "Manager", body: "Scostamenti atteso vs reale, subito visibili." },
        { title: "Direzione", body: "KPI spiegati con prove verificabili." },
      ],
    },
    proof: {
      title: "Un artefatto concreto",
      subtitle: "Esempio di audit PDF, firmato e versionato.",
      cta: "Apri esempio audit",
    },
    finalCta: {
      title: "Pronto per una demo operativa",
      primary: "Vedi la demo",
      secondary: "Richiedi accesso",
    },
    footer: {
      left: "Accesso riservato a personale e partner autorizzati.",
      right: "CORE · Operazioni di cantiere",
    },
  },

  fr: {
    topNav: {
      product: "Produit",
      security: "Sécurité",
      demo: "Démo",
      requestAccess: "Demander l’accès",
    },
    hero: {
      eyebrow: "Système opérationnel de chantier",
      title: "CORE AI — Contrôle opérationnel avec preuves.",
      subtitle:
        "Le système lit les rapportini, détecte les incohérences et explique la productivité avec des preuves vérifiables.",
      bullets: [
        "Aucun changement de méthode",
        "Aucune décision automatique",
        "Contrôles, signaux et preuves",
      ],
      ctaPrimary: "Voir la démo",
      ctaSecondary: "Exemple d’audit (PDF)",
      badge: "AI checked",
    },
    signals: {
      title: "Moteur de signaux IA",
      cards: {
        quality: {
          label: "Qualité",
          headline: "Incohérences détectées",
          value: "2",
          detail: "Prévu = 0 avec Produit > 0",
          link: "Voir exemples",
        },
        productivity: {
          label: "Productivité",
          headline: "Indice expliqué",
          value: "0,97",
          detail: "Baisse liée à une sous-allocation d’heures",
          link: "Voir preuves",
        },
        audit: {
          label: "Audit",
          headline: "Audit prêt",
          value: "PDF",
          detail: "Signé · Versionné · Traçable",
          link: "Ouvrir exemple",
        },
      },
    },
    explain: {
      title: "Explicabilité",
      leftKpiTitle: "Indice global",
      leftKpiValue: "0,97",
      leftKpiMeta: "Confiance : élevée · données complètes",
      whyTitle: "Pourquoi l’indice est à 0,97 ?",
      causes: [
        "Activité pose câbles : 2h non allouées",
        "Lignes 3 et 7 incomplètes",
        "Opérateur présent < 8h",
      ],
      evidence: "Preuves disponibles : lignes 3 · 7 · 11",
    },
    truthChain: {
      title: "Un seul flux. Une seule vérité.",
      subtitle: "Manager planifie → Capo exécute → CORE trace → Direction contrôle",
      steps: [
        { title: "Manager", body: "Planifie équipes et slots." },
        { title: "Capo", body: "Exécute et saisit le rapportino." },
        { title: "CORE Drive", body: "Archive preuves et versions." },
        { title: "Direction", body: "Lit KPI, écarts et preuves." },
      ],
    },
    adoption: {
      title: "Adoption sans friction",
      items: [
        "Aucune décision automatique",
        "Rôles et responsabilités clairs",
        "Toujours prêt pour l’audit",
      ],
    },
    security: {
      title: "Sécurité et traçabilité",
      line: "Accès par rôle · Traçabilité complète · Exports signés",
    },
    useCases: {
      title: "Par rôle. Pour le chantier.",
      cards: [
        { title: "Capo", body: "Saisie plus rapide avec contrôles automatiques." },
        { title: "Manager", body: "Écarts prévu vs réel, immédiatement visibles." },
        { title: "Direction", body: "KPI expliqués avec preuves vérifiables." },
      ],
    },
    proof: {
      title: "Un artefact concret",
      subtitle: "Exemple d’audit PDF, signé et versionné.",
      cta: "Ouvrir exemple d’audit",
    },
    finalCta: {
      title: "Prêt pour une démo opérationnelle",
      primary: "Voir la démo",
      secondary: "Demander l’accès",
    },
    footer: {
      left: "Accès réservé au personnel et partenaires autorisés.",
      right: "CORE · Opérations de chantier",
    },
  },

  en: {
    topNav: {
      product: "Product",
      security: "Security",
      demo: "Demo",
      requestAccess: "Request access",
    },
    hero: {
      eyebrow: "Operational shipyard system",
      title: "CORE AI — Operational control with evidence.",
      subtitle:
        "The system reads daily reports, detects inconsistencies, and explains productivity with verifiable evidence.",
      bullets: [
        "No workflow change",
        "No automated decisions",
        "Signals, controls, and proof",
      ],
      ctaPrimary: "View demo",
      ctaSecondary: "Audit sample (PDF)",
      badge: "AI checked",
    },
    signals: {
      title: "AI Signal Engine",
      cards: {
        quality: {
          label: "Quality",
          headline: "Inconsistencies detected",
          value: "2",
          detail: "Planned = 0 with Output > 0",
          link: "View examples",
        },
        productivity: {
          label: "Productivity",
          headline: "Index explained",
          value: "0.97",
          detail: "Decrease caused by under-allocated hours",
          link: "View evidence",
        },
        audit: {
          label: "Audit",
          headline: "Audit ready",
          value: "PDF",
          detail: "Signed · Versioned · Traceable",
          link: "Open sample",
        },
      },
    },
    explain: {
      title: "Explainability",
      leftKpiTitle: "Overall index",
      leftKpiValue: "0.97",
      leftKpiMeta: "Confidence: high · complete data",
      whyTitle: "Why is the index 0.97?",
      causes: [
        "Cable laying activity: 2h not allocated",
        "Rows 3 and 7 incomplete",
        "Operator present < 8h",
      ],
      evidence: "Evidence available: rows 3 · 7 · 11",
    },
    truthChain: {
      title: "One workflow. One source of truth.",
      subtitle: "Manager plans → Capo executes → CORE records → Management controls",
      steps: [
        { title: "Manager", body: "Plans teams and slots." },
        { title: "Capo", body: "Executes and fills the daily report." },
        { title: "CORE Drive", body: "Archives evidence and versions." },
        { title: "Management", body: "Reads KPIs, deviations and proof." },
      ],
    },
    adoption: {
      title: "Zero-friction adoption",
      items: [
        "No automated decisions",
        "Clear roles and responsibilities",
        "Always audit-ready",
      ],
    },
    security: {
      title: "Security and traceability",
      line: "Role-based access · Full traceability · Signed exports",
    },
    useCases: {
      title: "By role. For the shipyard.",
      cards: [
        { title: "Capo", body: "Faster reporting with automatic checks." },
        { title: "Manager", body: "Planned vs actual deviations, instantly visible." },
        { title: "Management", body: "KPIs explained with verifiable evidence." },
      ],
    },
    proof: {
      title: "A concrete artifact",
      subtitle: "Signed and versioned audit PDF sample.",
      cta: "Open audit sample",
    },
    finalCta: {
      title: "Ready for an operational demo",
      primary: "View demo",
      secondary: "Request access",
    },
    footer: {
      left: "Restricted access to staff and authorized partners.",
      right: "CORE · Shipyard operations",
    },
  },
};

function safeGetInitialLang(): Lang {
  if (typeof window === "undefined") return "it";
  try {
    const stored = window.localStorage.getItem("core-lang") as Lang | null;
    if (stored && LANGS.includes(stored)) return stored;
  } catch {
    // ignore
  }
  return "it";
}

function setStoredLang(lang: Lang): void {
  try {
    window.localStorage.setItem("core-lang", lang);
  } catch {
    // ignore
  }
}

function sectionIdFromKey(key: "product" | "security" | "demo"): string {
  if (key === "product") return "product";
  if (key === "security") return "security";
  return "demo";
}

function scrollToSection(id: string): void {
  if (typeof window === "undefined") return;
  const el = window.document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

type SignalCardProps = {
  label: string;
  headline: string;
  value: string;
  detail: string;
  linkLabel: string;
  onClick: () => void;
};

function SignalCard(props: SignalCardProps): JSX.Element {
  const { label, headline, value, detail, linkLabel, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group text-left rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] px-5 py-4 transition-all " +
        "hover:border-[var(--gold-200)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-200)]"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--text-500)]">
          {label}
        </div>
        <div className="inline-flex items-center rounded-full border border-[var(--line-600)] bg-[var(--bg-800)] px-2 py-1 text-[11px] font-semibold text-[var(--gold-500)]">
          {headline}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="text-[34px] leading-none font-semibold font-mono text-[var(--gold-500)]">{value}</div>
        <div className="text-right text-[12px] leading-snug text-[var(--text-300)]">{detail}</div>
      </div>

      <div className="mt-3 text-[12px] font-medium text-[var(--text-300)] group-hover:text-[var(--text-100)]">
        {linkLabel} →
      </div>
    </button>
  );
}

function GoldOutlineButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  routerTo?: string;
  asLink?: boolean;
}): JSX.Element {
  const base =
    "inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2 text-[14px] font-semibold " +
    "border border-[var(--gold-500)] text-[var(--gold-500)] hover:border-[var(--gold-600)] hover:text-[var(--gold-600)] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-200)] transition-all";

  if (props.routerTo) {
    return (
      <Link className={base} to={props.routerTo}>
        {props.children}
      </Link>
    );
  }

  if (props.asLink && props.to) {
    return (
      <a className={base} href={props.to}>
        {props.children}
      </a>
    );
  }

  return (
    <button type="button" className={base} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function MutedButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  routerTo?: string;
  asLink?: boolean;
}): JSX.Element {
  const base =
    "inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2 text-[14px] font-semibold " +
    "text-[var(--text-300)] hover:text-[var(--text-100)] border border-transparent " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-200)] transition-all";

  if (props.routerTo) {
    return (
      <Link className={base} to={props.routerTo}>
        {props.children}
      </Link>
    );
  }

  if (props.asLink && props.to) {
    return (
      <a className={base} href={props.to}>
        {props.children}
      </a>
    );
  }

  return (
    <button type="button" className={base} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function LangPill(props: { lang: Lang; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all " +
        (props.active
          ? "border-[var(--gold-200)] text-[var(--gold-500)] bg-[var(--bg-800)]"
          : "border-[var(--line-600)] text-[var(--text-300)] hover:text-[var(--text-100)]")
      }
    >
      {props.lang.toUpperCase()}
    </button>
  );
}

function ElectricFlow(props: { nodes: string[]; nodeSubs: string[] }): JSX.Element {
  // Simple, sober "flow panel" (no seasonal effects). Keeps the system feeling.
  const { nodes, nodeSubs } = props;
  const pairs = useMemo(() => nodes.map((n, i) => ({ n, s: nodeSubs[i] || "" })), [nodes, nodeSubs]);

  return (
    <div
      className={
        "rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-5 " +
        "shadow-[0_0_40px_rgba(0,0,0,0.45)]"
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--text-500)]">
          CNCS FLOW
        </div>
        <div className="text-[11px] font-semibold text-[var(--gold-500)]">AI checked</div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {pairs.map((p, idx) => (
          <div
            key={p.n}
            className={
              "relative rounded-[var(--radius-md)] border border-[var(--line-600)] bg-[var(--bg-800)] px-4 py-3"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text-100)]">{p.n}</div>
                <div className="text-[12px] text-[var(--text-300)]">{p.s}</div>
              </div>
              <div className="font-mono text-[12px] text-[var(--gold-500)]">
                {String(idx + 1).padStart(2, "0")}
              </div>
            </div>

            {idx < pairs.length - 1 ? (
              <div className="absolute left-1/2 -bottom-3 h-3 w-px bg-[var(--gold-200)]" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing(): JSX.Element {
  const [lang, setLang] = useState<Lang>(safeGetInitialLang());
  const c = COPY[lang];

  const onSetLang = (next: Lang): void => {
    setLang(next);
    setStoredLang(next);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-900)] text-[var(--text-100)]">
      {/* Topbar */}
      <div className="sticky top-0 z-30 border-b border-[var(--line-600)] bg-[var(--bg-900)]/80 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-[13px] font-semibold tracking-[0.18em] uppercase text-[var(--text-300)]">
                CORE
              </div>

              <nav className="hidden md:flex items-center gap-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => scrollToSection(sectionIdFromKey("product"))}
                  className="text-[var(--text-300)] hover:text-[var(--text-100)]"
                >
                  {c.topNav.product}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(sectionIdFromKey("security"))}
                  className="text-[var(--text-300)] hover:text-[var(--text-100)]"
                >
                  {c.topNav.security}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(sectionIdFromKey("demo"))}
                  className="text-[var(--text-300)] hover:text-[var(--text-100)]"
                >
                  {c.topNav.demo}
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1">
                {LANGS.map((l) => (
                  <LangPill key={l} lang={l} active={l === lang} onClick={() => onSetLang(l)} />
                ))}
              </div>
              <GoldOutlineButton asLink to="mailto:info@core.cncs.systems">
                {c.topNav.requestAccess}
              </GoldOutlineButton>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-4 pt-12 pb-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-600)] bg-[var(--bg-800)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--text-300)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold-500)]" />
              {c.hero.eyebrow}
            </div>

            <h1 className="mt-4 text-[40px] leading-[1.08] font-semibold tracking-tight">{c.hero.title}</h1>

            <p className="mt-4 text-[16px] leading-relaxed text-[var(--text-300)]">{c.hero.subtitle}</p>

            <ul className="mt-6 space-y-2 text-[13px] text-[var(--text-300)]">
              {c.hero.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold-200)]" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <GoldOutlineButton onClick={() => scrollToSection("demo")}>{c.hero.ctaPrimary}</GoldOutlineButton>
              <MutedButton onClick={() => scrollToSection("proof")}>{c.hero.ctaSecondary}</MutedButton>
              <div className="ml-0 md:ml-2 inline-flex items-center rounded-full border border-[var(--line-600)] bg-[var(--bg-800)] px-2.5 py-1 text-[11px] font-semibold text-[var(--gold-500)]">
                {c.hero.badge}
              </div>
            </div>

            <div className="mt-8 text-[12px] text-[var(--text-500)]">
              <span className="text-[var(--gold-200)]">●</span> {c.footer.left}
            </div>
          </div>

          <div>
            <ElectricFlow
              nodes={["CAPO", "UFFICIO", "CORE DRIVE", "DIREZIONE"]}
              nodeSubs={c.truthChain.steps.map((s) => s.body)}
            />
          </div>
        </div>
      </section>

      {/* AI Signal Engine */}
      <section id="product" className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[22px] font-semibold tracking-tight">{c.signals.title}</h2>
          <div className="text-[12px] text-[var(--text-500)]">{c.hero.badge}</div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SignalCard
            label={c.signals.cards.quality.label}
            headline={c.signals.cards.quality.headline}
            value={c.signals.cards.quality.value}
            detail={c.signals.cards.quality.detail}
            linkLabel={c.signals.cards.quality.link}
            onClick={() => scrollToSection("demo")}
          />
          <SignalCard
            label={c.signals.cards.productivity.label}
            headline={c.signals.cards.productivity.headline}
            value={c.signals.cards.productivity.value}
            detail={c.signals.cards.productivity.detail}
            linkLabel={c.signals.cards.productivity.link}
            onClick={() => scrollToSection("demo")}
          />
          <SignalCard
            label={c.signals.cards.audit.label}
            headline={c.signals.cards.audit.headline}
            value={c.signals.cards.audit.value}
            detail={c.signals.cards.audit.detail}
            linkLabel={c.signals.cards.audit.link}
            onClick={() => scrollToSection("proof")}
          />
        </div>
      </section>

      {/* Explainability */}
      <section className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[22px] font-semibold tracking-tight">{c.explain.title}</h2>
          <div className="text-[12px] text-[var(--text-500)]">{c.security.line}</div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-5">
            <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[var(--text-500)]">
              {c.explain.leftKpiTitle}
            </div>
            <div className="mt-4 text-[46px] leading-none font-semibold font-mono text-[var(--gold-500)]">
              {c.explain.leftKpiValue}
            </div>
            <div className="mt-2 text-[12px] text-[var(--text-300)]">{c.explain.leftKpiMeta}</div>
            <div className="mt-5 h-px w-full bg-[var(--line-600)]" />
            <div className="mt-4 text-[12px] text-[var(--text-500)]">{c.explain.evidence}</div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-5">
            <div className="text-[14px] font-semibold text-[var(--text-100)]">{c.explain.whyTitle}</div>
            <ul className="mt-4 space-y-2 text-[13px] text-[var(--text-300)]">
              {c.explain.causes.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold-200)]" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--line-600)] bg-[var(--bg-800)] px-3 py-2 text-[12px] text-[var(--text-300)]">
              {c.explain.evidence}
            </div>
          </div>
        </div>
      </section>

      {/* Truth chain */}
      <section className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-800)] p-6">
          <div className="text-[20px] font-semibold tracking-tight">{c.truthChain.title}</div>
          <div className="mt-2 text-[13px] text-[var(--text-300)]">{c.truthChain.subtitle}</div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            {c.truthChain.steps.map((s) => (
              <div
                key={s.title}
                className="rounded-[var(--radius-md)] border border-[var(--line-600)] bg-[var(--bg-700)] p-4"
              >
                <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[var(--gold-200)]">
                  {s.title}
                </div>
                <div className="mt-2 text-[13px] text-[var(--text-300)]">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Adoption + Security */}
      <section id="security" className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-5">
            <div className="text-[20px] font-semibold tracking-tight">{c.adoption.title}</div>
            <ul className="mt-4 space-y-2 text-[13px] text-[var(--text-300)]">
              {c.adoption.items.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold-200)]" />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-5">
            <div className="text-[20px] font-semibold tracking-tight">{c.security.title}</div>
            <div className="mt-4 text-[13px] text-[var(--text-300)]">{c.security.line}</div>
            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--line-600)] bg-[var(--bg-800)] px-3 py-2 text-[12px] text-[var(--text-500)]">
              RLS · Audit log · Versioning
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[22px] font-semibold tracking-tight">{c.useCases.title}</h2>
          <div className="text-[12px] text-[var(--text-500)]">{c.footer.right}</div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {c.useCases.cards.map((card) => (
            <div
              key={card.title}
              className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-5"
            >
              <div className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[var(--gold-200)]">
                {card.title}
              </div>
              <div className="mt-3 text-[13px] text-[var(--text-300)]">{card.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Proof asset */}
      <section id="proof" className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-800)] p-6">
          <div className="text-[20px] font-semibold tracking-tight">{c.proof.title}</div>
          <div className="mt-2 text-[13px] text-[var(--text-300)]">{c.proof.subtitle}</div>
          <div className="mt-5">
            <GoldOutlineButton onClick={() => scrollToSection("demo")}>{c.proof.cta}</GoldOutlineButton>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="demo" className="mx-auto max-w-[1200px] px-4 pb-16">
        <div className="rounded-[var(--radius-lg)] border border-[var(--line-600)] bg-[var(--bg-700)] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[20px] font-semibold tracking-tight">{c.finalCta.title}</div>
              <div className="mt-2 text-[13px] text-[var(--text-300)]">{c.hero.subtitle}</div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <GoldOutlineButton routerTo="/login">{c.finalCta.primary}</GoldOutlineButton>
              <MutedButton asLink to="mailto:info@core.cncs.systems">{c.finalCta.secondary}</MutedButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line-600)] bg-[var(--bg-900)]">
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-[12px] text-[var(--text-500)]">{c.footer.left}</div>
            <div className="text-[12px] text-[var(--text-500)]">{c.footer.right}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
