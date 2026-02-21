// src/features/direzione/dashboard/components/DirezioneVerdict.tsx

import { cn } from "../../../../ui/cn";
import { formatNumberByLang } from "../../../../ui/format";
import type { KpiSummary, ProdTrendPoint } from "../types";

type VerdictLevel = "OK" | "WARN" | "BLOCK";

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function computeVerdict(summary: KpiSummary, prodTrend: ProdTrendPoint[]): { level: VerdictLevel; score: number; reasons: string[] } {
  const idx = Number(summary.productivityIndexNow ?? NaN);
  const hasIdx = Number.isFinite(idx);

  const attesi = Number(summary.totalAttesi ?? 0);
  const ritardo = Number(summary.totalRitardo ?? 0);
  const ritRatio = attesi > 0 ? ritardo / attesi : 0;

  const baseline = Number(summary.incaBaselineRef ?? NaN);
  const real = Number(summary.incaDisAudit ?? NaN);
  const hasInca = Number.isFinite(baseline) && baseline > 0 && Number.isFinite(real);

  const coverage = hasInca ? real / baseline : 0;

  // Trend: average of last 3 points (if exists)
  const last3 = (prodTrend || []).slice(-3);
  const trendAvg =
    last3.length > 0
      ? last3
          .map((p) => Number((p as any).indice ?? NaN))
          .filter((n) => Number.isFinite(n))
          .reduce((a, b) => a + b, 0) / Math.max(1, last3.length)
      : NaN;

  // Score model (simple + audit-defensible)
  // - Productivity dominates
  // - Ritardi penalize
  // - INCA coverage provides additional signal (optional)
  let score = 80;

  if (hasIdx) {
    // 1.00 => +10, 0.80 => 0, 0.70 => -15, 0.60 => -30
    score += (idx - 0.8) * 75;
  } else {
    score -= 10;
  }

  // Ritardi: 0% => 0, 25% => -15, 50% => -30
  score -= ritRatio * 60;

  // INCA coverage: <70% penalize a bit (only if we have it)
  if (hasInca) {
    if (coverage < 0.7) score -= 12;
    else if (coverage < 0.8) score -= 6;
    else score += 3;
  }

  // Trend: if falling (avg < current - 0.08) penalize
  if (hasIdx && Number.isFinite(trendAvg) && trendAvg < idx - 0.08) score -= 8;

  score = clamp(Math.round(score), 0, 100);

  // Level thresholds
  let level: VerdictLevel = "OK";
  if ((hasIdx && idx < 0.7) || ritRatio >= 0.4) level = "BLOCK";
  else if ((hasIdx && idx < 0.8) || ritRatio >= 0.25 || (hasInca && coverage < 0.7)) level = "WARN";

  const reasons: string[] = [];

  if (hasIdx) reasons.push(`Indice prod = ${idx.toFixed(2)}`);
  else reasons.push("Indice prod non disponibile");

  if (attesi > 0) reasons.push(`Ritardi capi = ${ritardo}/${attesi}`);
  else reasons.push("Ritardi capi non disponibili");

  if (hasInca) reasons.push(`INCA coverage = ${(coverage * 100).toFixed(0)}%`);
  else reasons.push("INCA non disponibile");

  return { level, score, reasons: reasons.slice(0, 3) };
}

function badgeClass(level: VerdictLevel, isDark: boolean): string {
  const base = "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em] font-semibold";
  if (level === "OK") {
    return cn(base, isDark ? "border-emerald-400/50 bg-emerald-950/25 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-800");
  }
  if (level === "WARN") {
    return cn(base, isDark ? "border-amber-400/50 bg-amber-950/20 text-amber-200" : "border-amber-300 bg-amber-50 text-amber-900");
  }
  return cn(base, isDark ? "border-rose-400/50 bg-rose-950/25 text-rose-200" : "border-rose-300 bg-rose-50 text-rose-900");
}

export type DirezioneVerdictProps = {
  isDark: boolean;
  lang: string;
  loading: boolean;
  summary: KpiSummary;
  prodTrend: ProdTrendPoint[];
  t: (k: string, fallback?: string) => string;
};

export default function DirezioneVerdict({
  isDark,
  lang,
  loading,
  summary,
  prodTrend,
  t,
}: DirezioneVerdictProps): JSX.Element {
  const v = computeVerdict(summary, prodTrend);

  const title = t("DIR_VERDICT_TITLE", "Verdict Chantier");
  const subtitle = t("DIR_VERDICT_SUB", "Synthèse décisionnelle (validated / audit-defensible).");
  const ok = t("DIR_STATUS_OK", "OK");
  const warn = t("DIR_STATUS_WARN", "WARN");
  const block = t("DIR_STATUS_BLOCK", "BLOCK");

  const statusLabel = v.level === "OK" ? ok : v.level === "WARN" ? warn : block;

  const insightsTitle = t("DIR_INSIGHTS_TITLE", "Insights");
  const scoreLabel = t("DIR_SCORE", "Score");

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={cn("text-[11px] uppercase tracking-[0.22em]", isDark ? "text-slate-500" : "text-slate-600")}>
            {title}
          </div>
          <div className={cn("mt-1 text-sm", isDark ? "text-slate-300" : "text-slate-700")}>{subtitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={badgeClass(v.level, isDark)}>{statusLabel}</span>
          <div className={cn("rounded-2xl border px-3 py-2", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
            <div className={cn("text-[10px] uppercase tracking-[0.22em]", isDark ? "text-slate-500" : "text-slate-600")}>{scoreLabel}</div>
            <div className={cn("text-lg font-semibold tabular-nums", isDark ? "text-slate-100" : "text-slate-900")}>
              {loading ? "—" : formatNumberByLang(lang, v.score, 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className={cn("rounded-2xl border p-3", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
          <div className={cn("text-[11px] uppercase tracking-[0.22em]", isDark ? "text-slate-500" : "text-slate-600")}>
            {t("DIR_REASONS_TITLE", "Drivers")}
          </div>
          <ul className="mt-2 space-y-1 text-[12px] text-slate-300">
            {v.reasons.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                <span className="text-slate-200">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn("rounded-2xl border p-3", isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white")}>
          <div className={cn("text-[11px] uppercase tracking-[0.22em]", isDark ? "text-slate-500" : "text-slate-600")}>
            {insightsTitle}
          </div>

          <div className="mt-2 space-y-2 text-[12px]">
            {loading ? (
              <div className="text-slate-400">—</div>
            ) : (
              <>
                <InsightLine isDark={isDark} text={t("DIR_INSIGHT_1", "Priorité: stabiliser l’indice prod et traiter les blocages." )} />
                <InsightLine isDark={isDark} text={t("DIR_INSIGHT_2", "Surveiller les retards capi (planning DAY_FROZEN + deadline).")} />
                <InsightLine isDark={isDark} text={t("DIR_INSIGHT_3", "Si baseline INCA change → audit import/version (danger).")} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function InsightLine({ isDark, text }: { isDark: boolean; text: string }): JSX.Element {
  return (
    <div className={cn("rounded-xl border px-3 py-2", isDark ? "border-slate-800 bg-slate-950/30 text-slate-200" : "border-slate-200 bg-white text-slate-800")}>
      {text}
    </div>
  );
}