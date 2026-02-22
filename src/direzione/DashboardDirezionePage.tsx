// src/direzione/DashboardDirezionePage.tsx
import { useMemo, useState, type ReactNode } from "react";
import { formatNumberIT } from "../ui/format";
import { useCoreI18n } from "../i18n/coreI18n";
import KpiCard from "../features/kpi/components/KpiCard";
import KpiDetailsModal from "../features/direzione/dashboard/components/KpiDetailsModal";
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
type KpiModel = {
  rapportini?: number | string;
  rapportini_prev?: number | string;
  righe_attivita?: number | string;
  righe_attivita_vs_prev?: string;
  indice_prod?: number;
  indice_prod_sub?: string;
  inca_prev?: number;
  inca_real?: number;
  ritardi_capi?: number | string;
  ritardi_deadline?: string;
  windowLabel?: string;
  trend?: { x?: unknown[]; y?: unknown[]; min?: unknown; max?: unknown } | null;
  inca?: { labels?: unknown[]; previsti?: unknown[]; realizzati?: unknown[]; posati?: unknown[] } | null;
};

type Props = {
  isDark?: boolean;
  kpiModel?: KpiModel;
  onResetFilters?: () => void;
  headerRight?: ReactNode;
};

type KpiKey = "rapportini" | "righe" | "prod_index" | "inca_prev" | "inca_real" | "ritardi";

export default function DashboardDirezionePage({
  isDark = true,
  kpiModel,
  onResetFilters,
  headerRight,
}: Props): JSX.Element {
  const { t } = useCoreI18n();
  const [modalKey, setModalKey] = useState<KpiKey | null>(null);

  const km = kpiModel || {};
  const hint = t("KPI_HINT_CLICK");

  // Payload par KPI pour la modal (tu peux enrichir progressivement)
  const modalPayloadByKey = useMemo(() => {
    return {
      rapportini: {
        summaryPairs: [
          { label: t("KPI_RAPPORTINI"), value: km.rapportini, kind: "number", maxFrac: 0 },
          { label: "Prev.", value: km.rapportini_prev, kind: "number", maxFrac: 0 },
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

  const openModal = (key: KpiKey) => setModalKey(key);
  const closeModal = () => setModalKey(null);

  const strip = (
    <section className="px-3 sm:px-4 mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard
          label={t("KPI_RAPPORTINI")}
          value={km.rapportini ?? "—"}
          sub={km.rapportini_prev != null ? `Prev.: ${km.rapportini_prev}` : "—"}
          tone="neutral"
          onClick={() => openModal("rapportini")}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_RIGHE_ATTIVITA")}
          value={km.righe_attivita ?? "—"}
          sub={km.righe_attivita_vs_prev ?? "—"}
          tone="sky"
          onClick={() => openModal("righe")}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_INDICE_PROD")}
          value={km.indice_prod != null ? formatNumberIT(km.indice_prod, 2) : "—"}
          sub={km.indice_prod_sub ?? "Σrealizzato / Σprevisto_eff"}
          tone="fuchsia"
          onClick={() => openModal("prod_index")}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_INCA_PREV")}
          value={km.inca_prev != null ? formatNumberIT(km.inca_prev, 0) : "—"}
          sub="metri"
          tone="neutral"
          onClick={() => openModal("inca_prev")}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_INCA_REAL")}
          value={km.inca_real != null ? formatNumberIT(km.inca_real, 0) : "—"}
          sub="metri"
          tone="emerald"
          onClick={() => openModal("inca_real")}
          hint={hint}
        />

        <KpiCard
          label={t("KPI_RITARDI_CAPI")}
          value={km.ritardi_capi ?? "—"}
          sub={km.ritardi_deadline ? `deadline ${km.ritardi_deadline}` : "deadline 08:30 (J+1)"}
          tone="rose"
          onClick={() => openModal("ritardi")}
          hint={hint}
        />
      </div>
    </section>
  );

  const topBar = (
    <div className="px-3 sm:px-4 pt-3">
      {/*
        ✅ Layout stabilisé (Apple-grade):
        - Sépare clairement "titre" vs "cluster droite".
        - Évite justify-between + flex-wrap (fragile aux variations i18n).
        - Le switch langue vit au niveau AppShell (global), PAS dans cette page.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
        <div className="min-w-0">
          <div className="kicker">DIREZIONE · CNCS / CORE</div>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1 theme-text">{t("DIR_DASH_TITLE")}</h1>
        </div>

        <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
          <span className="chip chip-status px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]">
            {t("DIR_READONLY")}
          </span>

          {headerRight ? headerRight : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
        <div className="text-xs theme-text-muted">
          {t("DIR_WINDOW")}: <span className="font-semibold theme-text">{km.windowLabel ?? "—"}</span>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          className="justify-self-start sm:justify-self-end min-w-[160px] px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] transition btn-instrument"
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
        kpiKey={modalKey ?? undefined}
        payload={modalKey ? modalPayloadByKey[modalKey] : null}
        isDark={isDark}
      />
    </div>
  );
}
