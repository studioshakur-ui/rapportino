import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { headerPill, themeIconBg, buttonPrimary } from "../ui/designSystem";

import { CoreWordmark } from "../components/landing/CoreWordmark";
import { ElectricFlowPanel } from "../components/landing/ElectricFlowPanel";
import { ControlLayerSection } from "../components/landing/SectionControlLayer";

type Lang = "it" | "fr" | "en";

const LANGS: Lang[] = ["it", "fr", "en"];

const COPY: Record<
  Lang,
  {
    eyebrow: string;
    title: string; // "CORE"
    subtitle: string;
    valueLines: string[];
    accessNote: string;
    ctaPrimary: string;
    ctaSecondary: string;

    spec: string;
    nodes: [string, string, string, string];
    nodeSubs: [string, string, string, string];

    closureTitle: string;
    closureSub: string;
    closureLine: string;

    footerLeft: string;
    footerRight: string;

    s2Title: string;
    s2Subtitle: string;

    // Control Layer (slides + strict i18n)
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
  }
> = {
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

    s2Title: "CORE · Control Layer",
    s2Subtitle: "Controlli automatici. Prove verificabili. Nessuna ricostruzione.",

    s2KickerRight: "Accesso per ruoli · Tracciabilità completa · Export firmato",
    s2Tabs: {
      identity: "Identità",
      operational: "Operativo",
      evidence: "Evidenze",
      anomalies: "Anomalie",
    },
    s2Badges: {
      identity: "ROLE-GATED",
      operational: "LINE-PROVEN",
      evidence: "AUDIT-READY",
      anomalies: "TRACEABLE",
    },
    s2Identity: {
      title: "Identità & ruoli",
      body: "Ogni azione è consentita solo al ruolo corretto. Nessuna ambiguità tra CAPO, UFFICIO e DIREZIONE.",
      table: {
        cols: ["Controllo", "Condizione", "Esito"],
        rows: [
          ["Role gate", "Ruolo non autorizzato", "BLOCK"],
          ["Scope", "Ship non assegnata", "BLOCK"],
          ["Periodo", "Data fuori range", "WARN"],
        ],
      },
    },
    s2Operational: {
      title: "Indice",
      body: "Scostamenti spiegati con ore e attività.",
      chartTitle: "Coerenza (campione)",
      signals: {
        s1K: "Segnale",
        s1V: "Scostamento previsto/prodotto",
        s2K: "Azione",
        s2V: "Spiegazione richiesta",
        s3K: "Esito",
        s3V: "WARN · EXPLAIN",
      },
    },
    s2Evidence: {
      title: "Evidenze",
      body: "Ogni decisione è supportata da prove versionate e documenti congelati, sempre consultabili.",
      table: {
        cols: ["Prova", "Formato", "Garanzia"],
        rows: [
          ["Rapportino", "PDF", "Versioning"],
          ["CORE Drive", "SHA-256", "Integrità"],
          ["Freeze", "Read-only", "Non alterabile"],
        ],
      },
    },
    s2Anomalies: {
      title: "Anomalie & claims",
      body: "Le anomalie generano un flusso tracciato: apertura, verifica, decisione e chiusura.",
      table: {
        cols: ["Evento", "Stato", "Responsabile"],
        rows: [
          ["Anomalia", "Open", "Capo / Ufficio"],
          ["Verifica", "In review", "Manager"],
          ["Decisione", "Closed", "Direzione"],
        ],
      },
    },
    s2FooterLeft: "AUDIT-DEFENSIBLE",
    s2FooterRight: "POLICY-DRIVEN",
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

    s2Title: "CORE · Control Layer",
    s2Subtitle: "Contrôles automatiques. Preuves vérifiables. Aucune reconstruction.",

    s2KickerRight: "Accès par rôles · Traçabilité complète · Export signé",
    s2Tabs: {
      identity: "Identité",
      operational: "Opérationnel",
      evidence: "Preuves",
      anomalies: "Anomalies",
    },
    s2Badges: {
      identity: "ROLE-GATED",
      operational: "LINE-PROVEN",
      evidence: "AUDIT-READY",
      anomalies: "TRACEABLE",
    },
    s2Identity: {
      title: "Identité & rôles",
      body: "Chaque action est autorisée uniquement au bon rôle. Pas d’ambiguïté entre CAPO, UFFICIO et DIREZIONE.",
      table: {
        cols: ["Contrôle", "Condition", "Résultat"],
        rows: [
          ["Accès par rôle", "Rôle non autorisé", "BLOCK"],
          ["Périmètre", "Navire non assigné", "BLOCK"],
          ["Période", "Date hors plage", "WARN"],
        ],
      },
    },
    s2Operational: {
      title: "Indice",
      body: "Écarts expliqués par heures et activités.",
      chartTitle: "Cohérence (échantillon)",
      signals: {
        s1K: "Signal",
        s1V: "Écart prévu/produit",
        s2K: "Action",
        s2V: "Explication requise",
        s3K: "Résultat",
        s3V: "WARN · EXPLAIN",
      },
    },
    s2Evidence: {
      title: "Preuves",
      body: "Chaque décision est appuyée par des preuves versionnées et des documents gelés, toujours consultables.",
      table: {
        cols: ["Preuve", "Format", "Garantie"],
        rows: [
          ["Rapport", "PDF", "Versioning"],
          ["CORE Drive", "SHA-256", "Intégrité"],
          ["Gel", "Lecture seule", "Non modifiable"],
        ],
      },
    },
    s2Anomalies: {
      title: "Anomalies & réclamations",
      body: "Les anomalies déclenchent un flux traçable : ouverture, revue, décision, clôture.",
      table: {
        cols: ["Événement", "Statut", "Responsable"],
        rows: [
          ["Anomalie", "Open", "Capo / Ufficio"],
          ["Revue", "In review", "Manager"],
          ["Décision", "Closed", "Direzione"],
        ],
      },
    },
    s2FooterLeft: "AUDIT-DEFENSIBLE",
    s2FooterRight: "POLICY-DRIVEN",
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

    s2Title: "CORE · Control Layer",
    s2Subtitle: "Automatic controls. Verifiable evidence. No reconstruction.",

    s2KickerRight: "Role access · Full traceability · Signed export",
    s2Tabs: {
      identity: "Identity",
      operational: "Operational",
      evidence: "Evidence",
      anomalies: "Anomalies",
    },
    s2Badges: {
      identity: "ROLE-GATED",
      operational: "LINE-PROVEN",
      evidence: "AUDIT-READY",
      anomalies: "TRACEABLE",
    },
    s2Identity: {
      title: "Identity & roles",
      body: "Every action is allowed only for the correct role. No ambiguity across CAPO, UFFICIO and DIREZIONE.",
      table: {
        cols: ["Control", "Condition", "Outcome"],
        rows: [
          ["Role gate", "Unauthorized role", "BLOCK"],
          ["Scope", "Ship not assigned", "BLOCK"],
          ["Period", "Date out of range", "WARN"],
        ],
      },
    },
    s2Operational: {
      title: "Index",
      body: "Deviations explained with hours and activities.",
      chartTitle: "Consistency (sample)",
      signals: {
        s1K: "Signal",
        s1V: "Planned/produced gap",
        s2K: "Action",
        s2V: "Explanation required",
        s3K: "Outcome",
        s3V: "WARN · EXPLAIN",
      },
    },
    s2Evidence: {
      title: "Evidence",
      body: "Every decision is backed by versioned proofs and frozen documents, always consultable.",
      table: {
        cols: ["Evidence", "Format", "Guarantee"],
        rows: [
          ["Report", "PDF", "Versioning"],
          ["CORE Drive", "SHA-256", "Integrity"],
          ["Freeze", "Read-only", "Tamper-proof"],
        ],
      },
    },
    s2Anomalies: {
      title: "Anomalies & claims",
      body: "Anomalies trigger a traceable flow: open, review, decision, close.",
      table: {
        cols: ["Event", "Status", "Owner"],
        rows: [
          ["Anomaly", "Open", "Capo / Ufficio"],
          ["Review", "In review", "Manager"],
          ["Decision", "Closed", "Direzione"],
        ],
      },
    },
    s2FooterLeft: "AUDIT-DEFENSIBLE",
    s2FooterRight: "POLICY-DRIVEN",
  },
};

function cx(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function safeGetInitialLang(): Lang {
  if (typeof window === "undefined") return "it";
  try {
    const v = window.localStorage.getItem("core-lang");
    if (v === "it" || v === "fr" || v === "en") return v;
  } catch {
    // ignore
  }
  return "it";
}

export default function Landing(): JSX.Element {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const [lang, setLang] = useState<Lang>(() => safeGetInitialLang());
  const t = COPY[lang];

  useEffect(() => {
    try {
      window.localStorage.setItem("core-lang", lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const accessHref = useMemo(() => {
    const subject = encodeURIComponent("Richiesta accesso CORE");
    const body = encodeURIComponent(
      "Buongiorno,\n\nVorrei richiedere l’accesso a CORE.\n\nNome:\nRuolo:\nCantiere/Sito:\nTelefono:\n\nGrazie."
    );
    return `mailto:info@core.local?subject=${subject}&body=${body}`;
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* BACKDROP (clean, no seasonal modes) */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1200px 620px at 14% 18%, rgba(56,189,248,0.08), transparent 62%),
            radial-gradient(900px 520px at 78% 22%, rgba(16,185,129,0.05), transparent 64%),
            radial-gradient(900px 520px at 48% 86%, rgba(139,92,246,0.035), transparent 66%),
            linear-gradient(to bottom, rgba(2,6,23,0.0), rgba(2,6,23,0.48))
          `,
        }}
      />

      {/* GRAIN (very subtle) */}
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
        }}
      />

      {/* NAV */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5", headerPill)}>
              <span className={cx("inline-flex h-5 w-5 items-center justify-center rounded-full", themeIconBg)}>
                <span className="h-2 w-2 rounded-full bg-sky-400" />
              </span>
              <span className="text-[11px] uppercase tracking-[0.22em] text-slate-300">CORE</span>
            </span>

            <span className="hidden sm:block text-[11px] uppercase tracking-[0.26em] text-slate-500">
              {t.eyebrow}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center rounded-full border border-slate-800 bg-slate-950/45 p-1">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] transition",
                    l === lang ? "bg-slate-900 text-slate-100" : "text-slate-500 hover:text-slate-200"
                  )}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <Link to="/login" className={cx("rounded-full px-5 py-2 text-sm font-semibold", buttonPrimary)}>
              {t.ctaPrimary}
            </Link>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">{t.eyebrow}</div>

            <div className="mt-4">
              <CoreWordmark title={t.title} />
              <div className="mt-3 text-xl text-slate-300">{t.subtitle}</div>
            </div>

            <div className="mt-10 space-y-4 text-2xl text-slate-100">
              {t.valueLines.map((x) => (
                <div key={x}>{x}</div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <Link to="/login" className={cx("rounded-full px-7 py-3 text-sm font-semibold", buttonPrimary)}>
                {t.ctaPrimary}
              </Link>

              <a
                href={accessHref}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-7 py-3 text-sm text-slate-200 hover:bg-slate-950/55 transition"
              >
                {t.ctaSecondary}
              </a>
            </div>

            <div className="mt-4 text-sm text-slate-500">{t.accessNote}</div>
          </div>

          <div className="lg:col-span-7">
          <ElectricFlowPanel t={{ spec: t.spec, nodes: t.nodes, nodeSubs: t.nodeSubs }} />
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTROL LAYER */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <ControlLayerSection t={t} />
      </div>

      {/* CLOSURE */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div className="border-t border-slate-800/70 pt-16">
          <div className="text-5xl md:text-6xl font-semibold tracking-tight leading-tight">
            {t.closureTitle}
            <br />
            {t.closureSub}
          </div>
          <div className="mt-4 text-lg text-slate-500">{t.closureLine}</div>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-slate-800/70 pt-6 text-[12px] text-slate-500">
          <div>{t.footerLeft}</div>
          <div>{t.footerRight}</div>
        </div>
      </div>
    </div>
  );
}