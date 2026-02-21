// src/features/direzione/dashboard/components/DirezioneVerdict.tsx
import React, { useMemo } from "react";

export type DirezioneVerdictTone = "OK" | "WARN" | "BLOCK";

export type DirezioneVerdictModel = {
  tone?: DirezioneVerdictTone;
  score?: number | null;

  // Inputs métier (ex: indice prod, inca coverage, ritardi capi)
  indiceProd?: number | null;
  incaCoverage?: number | null; // 0..1
  ritardiCapi?: number | null;

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
    () => t("DIR_VERDICT_SUB", "Sintesi decisionale (validated / audit-defensible)."),
    [t]
  );

  const reasonsTitle = useMemo(() => t("DIR_REASONS_TITLE", "Driver"), [t]);
  const insightsTitle = useMemo(() => t("DIR_INSIGHTS_TITLE", "Approfondimenti"), [t]);

  const scoreLabel = useMemo(() => t("DIR_SCORE", "Punteggio"), [t]);

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
      ? isDark
        ? "border-emerald-500/35 bg-emerald-950/20 text-emerald-200"
        : "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "BLOCK"
      ? isDark
        ? "border-rose-500/35 bg-rose-950/20 text-rose-200"
        : "border-rose-300 bg-rose-50 text-rose-800"
      : isDark
      ? "border-amber-500/35 bg-amber-950/20 text-amber-200"
      : "border-amber-300 bg-amber-50 text-amber-800";

  return (
    <section className="px-3 sm:px-4 mt-4">
      <div className={["rounded-2xl border", isDark ? "border-slate-800/70 bg-slate-950/20" : "border-slate-200 bg-white"].join(" ")}>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600"].join(" ")}>
                {verdictTitle}
              </div>
              <div className={["mt-1 text-sm", isDark ? "text-slate-200" : "text-slate-900"].join(" ")}>{verdictSub}</div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={["px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em]", toneClasses].join(" ")}>
                {statusLabel}
              </span>

              <div className={["rounded-2xl border px-4 py-3", isDark ? "border-slate-800/70 bg-slate-950/30" : "border-slate-200 bg-white"].join(" ")}>
                <div className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600"].join(" ")}>
                  {scoreLabel}
                </div>
                <div className={["mt-1 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900"].join(" ")}>
                  {score == null ? "—" : String(score)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Reasons */}
            <div className={["rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/10" : "border-slate-200 bg-white"].join(" ")}>
              <div className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600"].join(" ")}>
                {reasonsTitle}
              </div>
              <ul className="mt-3 space-y-2">
                {computedReasons.map((r, idx) => (
                  <li key={idx} className={["flex items-start gap-2 text-sm", isDark ? "text-slate-200" : "text-slate-900"].join(" ")}>
                    <span className={["mt-2 h-1.5 w-1.5 rounded-full", isDark ? "bg-slate-400" : "bg-slate-500"].join(" ")} />
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Insights */}
            <div className={["rounded-2xl border p-4", isDark ? "border-slate-800/70 bg-slate-950/10" : "border-slate-200 bg-white"].join(" ")}>
              <div className={["text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600"].join(" ")}>
                {insightsTitle}
              </div>

              <div className="mt-3 space-y-3">
                {computedInsights.map((ins, idx) => (
                  <div
                    key={idx}
                    className={[
                      "rounded-xl border px-4 py-3 text-sm",
                      isDark ? "border-slate-800/70 bg-slate-950/30 text-slate-200" : "border-slate-200 bg-white text-slate-900",
                    ].join(" ")}
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