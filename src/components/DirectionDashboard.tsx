// src/components/DirectionDashboard.tsx
import React, { useCallback, useMemo } from "react";
import { useCoreI18n } from "../i18n/coreI18n";

import DirezioneVerdict from "../features/direzione/dashboard/components/DirezioneVerdict";

// NOTE: adapte ces imports si ton projet a des chemins différents
import DirectionFiltersBar from "../features/direzione/dashboard/components/DirezioneFilters";
import DirectionKpisStrip from "../features/direzione/dashboard/components/DirezioneKpiStrip";

export type DirectionDashboardProps = {
  // Ton modèle existant : adapte si besoin
  isDark?: boolean;
  kpiModel?: any;
  verdictModel?: any;

  // Filtres
  costr?: string;
  commessa?: string;
  windowFrom?: string; // ISO date ou string UI
  windowTo?: string;

  // Handlers
  onResetFilters?: () => void;
  onChangeCostr?: (v: string) => void;
  onChangeCommessa?: (v: string) => void;
  onChangeWindowFrom?: (v: string) => void;
  onChangeWindowTo?: (v: string) => void;

  // header right slot (ex: readonly badge / misc)
  headerRight?: React.ReactNode;
};

function isMeaningfulTranslatedValue(v: unknown, key: string): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;

  // Si le provider “prettify” la clé, on peut détecter ce cas (ex: "Dir Score")
  // MAIS : on ne dépend plus de ce test (le provider gère fallback).
  // On garde juste pour debug éventuel.
  const normalized = s.replace(/\s+/g, " ").toLowerCase();
  const keyPretty = key
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  // Si on obtient exactement une “humanisation” de la clé, ce n’est pas un vrai texte produit.
  if (normalized === keyPretty) return false;

  return true;
}

export default function DirectionDashboard(props: DirectionDashboardProps) {
  const {
    isDark = true,
    kpiModel,
    verdictModel,

    costr,
    commessa,
    windowFrom,
    windowTo,

    onResetFilters,
    onChangeCostr,
    onChangeCommessa,
    onChangeWindowFrom,
    onChangeWindowTo,

    headerRight,
  } = props;

  const i18n = useCoreI18n();

  /**
   * ✅ Correctif critique:
   * On n’enveloppe PLUS `tRaw(key)` avec une logique qui laisse passer “prettifyKey”.
   * On appelle directement `i18n.t(key, fallback)` (fallback supporté par I18nProvider patché).
   */
  const t = useCallback(
    (key: string, fallback: string) => {
      const v = i18n.t(key, fallback);

      // Sécurité supplémentaire: si on reçoit une pseudo-trad “prettify” (rare),
      // on force le fallback.
      if (!isMeaningfulTranslatedValue(v, key)) return fallback;

      return v;
    },
    [i18n]
  );

  const headerKicker = useMemo(() => t("DIR_KICKER", "Direzione · CNCS / CORE"), [t]);
  const title = useMemo(() => t("DIR_DASH_TITLE", "Dashboard Direzione"), [t]);

  const windowLabel = useMemo(() => {
    const labelKey = "DIR_WINDOW";
    const label = t(labelKey, "Finestra");
    const a = windowFrom ? String(windowFrom) : "—";
    const b = windowTo ? String(windowTo) : "—";
    return `${label}: ${a} → ${b}`;
  }, [t, windowFrom, windowTo]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-3 sm:px-4 pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{headerKicker}</div>
            <h1 className="text-xl sm:text-2xl font-semibold mt-1 text-slate-50">{title}</h1>
          </div>

          <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
            {/* Slot externe (ex: Sola lettura / badges) */}
            {headerRight ?? null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="text-xs text-slate-400">{windowLabel}</div>

          <button
            type="button"
            onClick={onResetFilters}
            className={[
              "justify-self-start sm:justify-self-end min-w-[160px] px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em] transition",
              isDark
                ? "border-slate-700/70 bg-slate-950/30 text-slate-200 hover:bg-slate-900/40"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {t("DIR_RESET_FILTERS", "Reset filtri")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <DirectionFiltersBar
        isDark={isDark}
        costr={costr}
        commessa={commessa}
        windowFrom={windowFrom}
        windowTo={windowTo}
        onChangeCostr={onChangeCostr}
        onChangeCommessa={onChangeCommessa}
        onChangeWindowFrom={onChangeWindowFrom}
        onChangeWindowTo={onChangeWindowTo}
        t={t}
      />

      {/* KPI strip */}
      <DirectionKpisStrip isDark={isDark} model={kpiModel} t={t} />

      {/* Verdict */}
      <DirezioneVerdict isDark={isDark} model={verdictModel} t={t} />
    </div>
  );
}