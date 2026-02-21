// src/features/direzione/dashboard/components/DirezioneCharts.tsx

import {
  CoreBarLineCombo,
  CoreChartCard,
  CoreEChart,
  CoreLineChart,
  CORE_CHART_THEME,
} from "../../../../components/charts";

import { formatNumberByLang } from "../../../../ui/format";
import type { ProduzioniAggRow, ProdTrendPoint, TimelinePoint } from "../types";

export type DirezioneChartsProps = {
  isDark: boolean;
  lang: string;
  loading: boolean;

  t: (k: string, fallback?: string) => string;

  timelineData: TimelinePoint[];
  incaOption: Record<string, any>;
  hasIncaData: boolean;

  prodTrend: ProdTrendPoint[];
  topProduzioni: ProduzioniAggRow[];
};

export default function DirezioneCharts({
  isDark,
  lang,
  loading,
  t,
  timelineData,
  incaOption,
  hasIncaData,
  prodTrend,
  topProduzioni,
}: DirezioneChartsProps): JSX.Element {
  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)] gap-4">
        <CoreChartCard
          isDark={isDark}
          title={t("DIR_TIMELINE_TITLE", "Timeline")}
          subtitle={t("DIR_TIMELINE_SUB", "Bar: Ritardi Capi · Line: Rapportini")}
        >
          <CoreBarLineCombo
            loading={loading}
            data={timelineData}
            height={260}
            xKey="label"
            barKey="capi_ritardo"
            barName={t("DIR_TIMELINE_BAR", "Ritardi Capi")}
            barColor={CORE_CHART_THEME.danger}
            lineKey="rapportini"
            lineName={t("KPI_RAPPORTINI", "Rapportini")}
            lineColor={CORE_CHART_THEME.positive}
            emptyHint={t("DIR_TIMELINE_EMPTY", "Nessun piano DAY FROZEN o nessun rapporto nella finestra.")}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            {t(
              "DIR_TIMELINE_NOTE",
              "Nota: “Ritardi Capi” deriva dal planning (DAY FROZEN) e dalla deadline 08:30 del giorno successivo."
            )}
          </div>
        </CoreChartCard>

        <CoreChartCard
          isDark={isDark}
          title={t("CHART_INCA_TITLE", "INCA")}
          subtitle={t("CHART_INCA_SUB", "Chantier baseline + audit dis.")}
        >
          <CoreEChart
            loading={loading}
            option={incaOption}
            height={260}
            empty={!!(!loading && !hasIncaData)}
            emptyHint={t("DIR_INCA_EMPTY", "Import INCA assente o non filtrabile con COSTR/Commessa.")}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            {t(
              "DIR_INCA_NOTE",
              "Baseline chantier = Σ metri_ref (greatest teo/dis). \"Dis\" è audit. \"Posati(ref)\" usa situazione='P'."
            )}
          </div>
        </CoreChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CoreChartCard
          isDark={isDark}
          title={t("CHART_TREND_TITLE", "Trend · Produttività giornaliera")}
          subtitle={t("CHART_TREND_SUB", "Evidenzia deriva o miglioramento (indice su previsto).")}
        >
          <CoreLineChart
            loading={loading}
            data={prodTrend}
            height={280}
            xKey="label"
            yLines={[{ key: "indice", name: t("KPI_INDICE_PROD", "Indice"), stroke: CORE_CHART_THEME.warning }]}
            emptyHint={t("DIR_TREND_EMPTY", "Nessun dato produttività nella finestra.")}
          />
          <div className="mt-2 text-[11px] text-slate-500">
            {t("DIR_PROD_FORMULA_NOTE", "Formula: indice = Σreal_alloc / Σprevisto_alloc (solo unit=MT, rapportini APPROVED_UFFICIO).")}
          </div>
        </CoreChartCard>

        <CoreChartCard
          isDark={isDark}
          title={t("DIR_TOP_PROD_TITLE", "Top · Produzioni (alloc)")}
          subtitle={t("DIR_TOP_PROD_SUB", "Somma prodotto_alloc per descrizione (lettura rapida).")}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
            {!topProduzioni.length ? (
              <div className="text-[12px] text-slate-400">{t("DIR_NO_DATA", "Nessun dato.")}</div>
            ) : (
              <div className="space-y-2">
                {topProduzioni.map((r, idx) => (
                  <div key={`${r.descrizione}-${idx}`} className="flex items-center justify-between gap-3">
                    <div className="text-[12px] text-slate-200 truncate">{String(r.descrizione || "—")}</div>
                    <div className="text-[12px] text-slate-300 tabular-nums">
                      {formatNumberByLang(lang, r.prodotto_sum, 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {t(
              "DIR_TOP_PROD_NOTE",
              "Nota: breakdown informativo; il drill-down “Righe attività” mostra dettagli e ranking completo."
            )}
          </div>
        </CoreChartCard>
      </section>
    </>
  );
}