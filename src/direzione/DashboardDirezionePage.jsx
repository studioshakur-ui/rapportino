// src/direzione/DashboardDirezionePage.jsx
import React, { useMemo, useState } from "react";
import { cn } from "../ui/cn";
import { formatNumberIT } from "../ui/format";
import { useCoreI18n } from "../i18n/coreI18n";
import KpiCard from "../components/kpi/KpiCard";
import KpiDetailsModal from "../components/kpi/KpiDetailsModal";
import DirezioneChartsSection from "../components/charts/DirezioneChartsSection";

/**
 * Dashboard Direzione — Tesla-X (Option A)
 * - KPI strip: TOUT cliquable → modal centrale
 * - Graphes: TOUJOURS sous les KPI (2 cartes max)
 * - Langue: IT par défaut, FR/EN dispo via I18nProvider
 *
 * IMPORTANT:
 * - Cette page est "UI-first": elle attend un "kpiModel" prêt.
 * - Branche ton loader Supabase existant en amont et remplis kpiModel.
 */
export default function DashboardDirezionePage({
  isDark = true,
  kpiModel,
  onResetFilters,
  headerRight,
}) {
  const { lang, setLang, t } = useCoreI18n();
  const [modalKey, setModalKey] = useState(null);

  const km = kpiModel || {};
  const hint = t("KPI_HINT_CLICK");

  // Payload par KPI pour la modal (tu peux enrichir progressivement)
  const modalPayloadByKey = useMemo(() => {
    return {
      rapportini: {
        summaryPairs: [
          { label: t("KPI_RAPPORTINI"), value: km.rapportini, kind: "number", maxFrac: 0 },
          { label: "Prev", value: km.rapportini_prev, kind: "number", maxFrac: 0 },
        ],
        rulesText: "Conteggio rapportini nel range filtrato (COSTR/Commessa).",
      },
      righe: {
        summaryPairs: [
          { label: t("KPI_RIGHE_ATTIVITA"), value: km.righe_attivita, kind: "number", maxFrac: 0 },
          { label: "vs prev", value: km.righe_attivita_vs_prev, kind: "text" },
        ],
        rulesText: "Conteggio righe attività aggregate nel range filtrato.",
      },
      prod_index: {
        summaryPairs: [
          { label: t("KPI_INDICE_PROD"), value: km.indice_prod, kind: "number", maxFrac: 2 },
          { label: "Formula", value: "Σrealizzato_alloc / Σprevisto_eff" },
        ],
        rulesText:
          "Indice canonico: Σ(realizzato_alloc) / Σ(previsto_eff), con previsto_eff = previsto × (ore/8).",
      },
      inca_prev: {
        summaryPairs: [
          { label: t("KPI_INCA_PREV"), value: km.inca_prev, kind: "number", maxFrac: 0 },
          { label: "Unità", value: "metri" },
        ],
        rulesText: "Somma metri previsti INCA (fonte inca_cavi) nel range/filtri.",
      },
      inca_real: {
        summaryPairs: [
          { label: t("KPI_INCA_REAL"), value: km.inca_real, kind: "number", maxFrac: 0 },
          { label: "Unità", value: "metri" },
        ],
        rulesText: "Somma metri realizzati/posati (fonte rapportini/allocazione) nel range/filtri.",
      },
      ritardi: {
        summaryPairs: [
          { label: t("KPI_RITARDI_CAPI"), value: km.ritardi_capi ?? "—" },
          { label: "Deadline", value: km.ritardi_deadline ?? "08:30 (J+1)" },
        ],
        rulesText: "Ritardi derivano dal planning (DAY FROZEN) e dalla deadline 08:30 del giorno successivo.",
      },
    };
  }, [km, t]);

  const openModal = (key) => setModalKey(key);
  const closeModal = () => setModalKey(null);

  const strip = (
    <section className="px-3 sm:px-4 mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard
          label={t("KPI_RAPPORTINI")}
          value={km.rapportini ?? "—"}
          sub={km.rapportini_prev != null ? `Prev: ${km.rapportini_prev}` : "—"}
          tone="neutral"
          onClick={() => openModal("rapportini")}
          isDark={isDark}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_RIGHE_ATTIVITA")}
          value={km.righe_attivita ?? "—"}
          sub={km.righe_attivita_vs_prev ?? "—"}
          tone="sky"
          onClick={() => openModal("righe")}
          isDark={isDark}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_INDICE_PROD")}
          value={km.indice_prod != null ? formatNumberIT(km.indice_prod, 2) : "—"}
          sub={km.indice_prod_sub ?? "Σrealizzato / Σprevisto_eff"}
          tone="fuchsia"
          onClick={() => openModal("prod_index")}
          isDark={isDark}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_INCA_PREV")}
          value={km.inca_prev != null ? formatNumberIT(km.inca_prev, 0) : "—"}
          sub="metri"
          tone="neutral"
          onClick={() => openModal("inca_prev")}
          isDark={isDark}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_INCA_REAL")}
          value={km.inca_real != null ? formatNumberIT(km.inca_real, 0) : "—"}
          sub="metri"
          tone="emerald"
          onClick={() => openModal("inca_real")}
          isDark={isDark}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_RITARDI_CAPI")}
          value={km.ritardi_capi ?? "—"}
          sub={km.ritardi_deadline ? `deadline ${km.ritardi_deadline}` : "deadline 08:30 (J+1)"}
          tone="rose"
          onClick={() => openModal("ritardi")}
          isDark={isDark}
          hint={hint}
        />
      </div>
    </section>
  );

  const topBar = (
    <div className="px-3 sm:px-4 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
            DIREZIONE · CNCS / CORE
          </div>
          <h1 className={cn("text-xl sm:text-2xl font-semibold mt-1", isDark ? "text-slate-50" : "text-slate-900")}>
            {t("DIR_DASH_TITLE")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em]",
              isDark ? "border-emerald-500/35 bg-emerald-950/20 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-800"
            )}
          >
            {t("DIR_READONLY")}
          </span>

          <div className="flex items-center gap-1">
            <LangChip label="IT" active={lang === "it"} onClick={() => setLang("it")} isDark={isDark} />
            <LangChip label="FR" active={lang === "fr"} onClick={() => setLang("fr")} isDark={isDark} />
            <LangChip label="EN" active={lang === "en"} onClick={() => setLang("en")} isDark={isDark} />
          </div>

          {headerRight ? headerRight : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-600")}>
          {t("DIR_WINDOW")}: <span className={cn("font-semibold", isDark ? "text-slate-200" : "text-slate-900")}>{km.windowLabel ?? "—"}</span>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          className={cn(
            "ml-auto px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em] transition",
            isDark ? "border-slate-700/70 bg-slate-950/30 text-slate-200 hover:bg-slate-900/40" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          {t("DIR_RESET_FILTERS")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pb-10">
      {topBar}
      {strip}

      {/* OPTION A: graphes SOUS les KPI */}
      <DirezioneChartsSection isDark={isDark} trend={km.trend} inca={km.inca} />

      {/* Modal */}
      <KpiDetailsModal
        open={!!modalKey}
        onClose={closeModal}
        kpiKey={modalKey}
        payload={modalKey ? modalPayloadByKey[modalKey] : null}
        isDark={isDark}
      />
    </div>
  );
}

function LangChip({ label, active, onClick, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full border text-[11px] uppercase tracking-[0.18em] transition",
        active
          ? isDark
            ? "border-slate-500/70 bg-slate-200/10 text-slate-50"
            : "border-slate-300 bg-slate-100 text-slate-900"
          : isDark
          ? "border-slate-800/70 bg-slate-950/30 text-slate-400 hover:bg-slate-900/35 hover:text-slate-200"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      )}
      aria-pressed={active ? "true" : "false"}
    >
      {label}
    </button>
  );
}
