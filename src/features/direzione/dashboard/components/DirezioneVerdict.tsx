// src/features/direzione/dashboard/components/DirezioneVerdict.tsx
import { useMemo } from "react";

export type DirezioneVerdictTone = "OK" | "WARN" | "BLOCK";

export type DirezioneVerdictModel = {
  tone?: DirezioneVerdictTone;
  score?: number | null;
  scoreFormatted?: string;
  scoreFormula?: string | null;
  scoreInclusion?: string | null;
  scoreStats?: string | null;

  // Inputs métier (ex: indice prod, inca coverage, ritardi capi)
  indiceProd?: number | null;
  incaCoverage?: number | null; // 0..1
  ritardiCapi?: number | null;

  reliability?: "HIGH" | "MEDIUM" | "LOW";
  missingMetrics?: string[] | null;

  // Free-form reasons/insights (si tu as déjà un moteur)
  reasons?: string[] | null;
  insights?: string[] | null;
};

export type DirezioneVerdictProps = {
  isDark?: boolean;
  model?: DirezioneVerdictModel;
  t: (key: string, fallback: string) => string;
};

function fmt2(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function fmtPct01(x: number): string {
  if (!Number.isFinite(x)) return "—";
  const v = Math.round(x * 100);
  return `${v}%`;
}

/**
 * Micro interpolation "{v}" only (CNCS-grade simple).
 * Keeps it deterministic and safe.
 */
function i18nFmt(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, v);
  }
  return out;
}

export default function DirezioneVerdict({ isDark = true, model, t }: DirezioneVerdictProps) {
  void isDark;
  const m: DirezioneVerdictModel = model || {};

  const tone: DirezioneVerdictTone = m.tone || "WARN";
  const score = m.score ?? null;

  const statusLabel = useMemo(() => {
    if (tone === "OK") return t("DIR_STATUS_OK", "OK");
    if (tone === "BLOCK") return t("DIR_STATUS_BLOCK", "BLOCCO");
    return t("DIR_STATUS_WARN", "ATTENZIONE");
  }, [tone, t]);

  const verdictTitle = useMemo(() => t("DIR_VERDICT_TITLE", "Verdetto cantiere"), [t]);
  const verdictSub = useMemo(
    () => t("DIR_VERDICT_SUB", "Sintesi executive e audit‑ready sullo stato del cantiere."),
    [t]
  );

  const reasonsTitle = useMemo(() => t("DIR_REASONS_TITLE", "Driver"), [t]);
  const insightsTitle = useMemo(() => t("DIR_INSIGHTS_TITLE", "Approfondimenti"), [t]);

  const scoreLabel = useMemo(() => t("DIR_SCORE", "Punteggio"), [t]);
  const reliabilityLabel = useMemo(() => t("DIR_RELIABILITY", "Affidabilità"), [t]);
  const reliabilityValue = useMemo(() => {
    if (m.reliability === "HIGH") return t("DIR_RELIABILITY_HIGH", "Alta");
    if (m.reliability === "LOW") return t("DIR_RELIABILITY_LOW", "Bassa");
    return t("DIR_RELIABILITY_MEDIUM", "Media");
  }, [m.reliability, t]);
  const missingLabel = useMemo(() => t("DIR_DATA_INCOMPLETE", "Dati incompleti"), [t]);

  const computedReasons = useMemo(() => {
    if (Array.isArray(m.reasons) && m.reasons.length) return m.reasons;

    const items: string[] = [];

    // Indice prod
    if (m.indiceProd == null) {
      items.push(t("DIR_REASON_INDICE_NA", "Indice prod non disponibile"));
    } else {
      const tpl = t("DIR_REASON_INDICE_FMT", "Indice prod = {v}");
      items.push(i18nFmt(tpl, { v: fmt2(m.indiceProd) }));
    }

    // Ritardi capi
    if (m.ritardiCapi == null) {
      items.push(t("DIR_REASON_RITARDI_NA", "Ritardi capi non disponibili"));
    } else {
      const tpl = t("DIR_REASON_RITARDI_FMT", "Ritardi capi = {v}");
      items.push(i18nFmt(tpl, { v: String(m.ritardiCapi) }));
    }

    // INCA coverage
    if (m.incaCoverage == null) {
      items.push(t("DIR_REASON_INCA_NA", "INCA non disponibile"));
    } else {
      const tpl = t("DIR_REASON_INCA_FMT", "INCA coverage = {v}");
      items.push(i18nFmt(tpl, { v: fmtPct01(m.incaCoverage) }));
    }

    return items;
  }, [m.reasons, m.indiceProd, m.ritardiCapi, m.incaCoverage, t]);

  const computedInsights = useMemo(() => {
    if (Array.isArray(m.insights) && m.insights.length) return m.insights;

    // Defaults i18n (fallbacks)
    return [
      t("DIR_INSIGHT_1", "Priorità: stabilizzare l’indice prod e trattare i blocchi."),
      t("DIR_INSIGHT_2", "Monitorare i ritardi capi (planning DAY_FROZEN + deadline)."),
      t("DIR_INSIGHT_3", "Se la baseline INCA cambia → audit import/version (rischio)."),
    ];
  }, [m.insights, t]);

  const toneClasses =
    tone === "OK"
      ? "chip chip-success"
      : tone === "BLOCK"
      ? "chip chip-danger"
      : "chip chip-alert";

  return (
    <section className="px-3 sm:px-4 mt-4">
      <div className="theme-panel rounded-2xl">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                {verdictTitle}
              </div>
              <div className="mt-1 text-sm theme-text">{verdictSub}</div>
              {m.missingMetrics && m.missingMetrics.length ? (
                <div className="mt-2 text-[11px] theme-text-muted">
                  {missingLabel}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={toneClasses}>{statusLabel}</span>

              <div className="theme-panel-2 rounded-2xl px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                  {scoreLabel}
                </div>
                <div className="mt-1 text-2xl font-semibold theme-text">
                  {m.scoreFormatted ?? (score == null ? "—" : String(score))}
                </div>
                {m.scoreFormula ? (
                  <div className="mt-1 text-[11px] theme-text-muted">
                    {m.scoreFormula}
                  </div>
                ) : null}
                {m.scoreInclusion ? (
                  <div className="mt-1 text-[11px] theme-text-muted">
                    {m.scoreInclusion}
                  </div>
                ) : null}
                {m.scoreStats ? (
                  <div className="mt-1 text-[11px] theme-text-muted">
                    {m.scoreStats}
                  </div>
                ) : null}
              </div>

              <div className="theme-panel-2 rounded-2xl px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                  {reliabilityLabel}
                </div>
                <div className="mt-1 text-sm font-semibold theme-text">
                  {reliabilityValue}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Reasons */}
            <div className="theme-panel-2 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                {reasonsTitle}
              </div>
              <ul className="mt-3 space-y-2">
                {computedReasons.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm theme-text">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--borderStrong)]" />
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Insights */}
            <div className="theme-panel-2 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
                {insightsTitle}
              </div>

              <div className="mt-3 space-y-3">
                {computedInsights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="theme-panel-2 rounded-xl px-4 py-3 text-sm theme-text"
                  >
                    {ins}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optional footer slot later */}
        </div>
      </div>
    </section>
  );
}
