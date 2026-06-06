import type { NavemasterAiInsight, NavemasterAiOverview, NavemasterNormalizedRow } from "./navemaster.types";
import { summarizeNavemasterLegendSignals } from "./navemaster.legend";

function scoreRow(row: NavemasterNormalizedRow): NavemasterAiInsight | null {
  const reasons: string[] = [];
  let score = 0;

  const text = [
    row.stato_cavo,
    row.situazione_cavo_conit,
    row.ex_marca_cavo,
    row.payload.problematiche_cavi,
    row.payload.problematiche_collegamenti,
    row.payload.note_sviluppo,
    row.payload.note_conit,
  ].filter(Boolean).join(" ").toUpperCase();

  const legendSignals = summarizeNavemasterLegendSignals(row);
  if (legendSignals.score > 0) {
    score += legendSignals.score;
    reasons.push(...legendSignals.reasons);
  }

  if (/PRIORIT/.test(text)) {
    score += 12;
    reasons.push("priorité explicite dans les notes");
  }
  if (row.ex_marca_cavo && row.ex_marca_cavo.trim() && row.ex_marca_cavo.trim() !== row.marcacavo) {
    score += 14;
    reasons.push(`ancien code ${row.ex_marca_cavo.trim()} vers ${row.marcacavo}`);
  }
  if (/BLOCC|MANC|DA TROVARE|RISTENDERE|SHORT|CORT/.test(text)) {
    score += 30;
    reasons.push("anomalie ou blocage détecté");
  }
  if ((row.payload.disponibilita_magazzini as number | null) === 0) {
    score += 15;
    reasons.push("stock magasin à 0");
  }
  const metriDis = Number(row.payload.metri_dis ?? 0);
  const metriCan = Number(row.payload.metri_can ?? 0);
  if (Number.isFinite(metriDis) && Number.isFinite(metriCan) && metriCan > metriDis) {
    score += 8;
    reasons.push("mètres can supérieurs aux mètres disponibles");
  }
  if (!row.apparato_da || !row.apparato_a) {
    score += 10;
    reasons.push("topologie incomplète");
  }

  if (score === 0) return null;

  if (!isMajorSignal(row, text, reasons) && score < 45) return null;

  const aiNavStatus = score >= 70 ? "RISK_HIGH" : score >= 45 ? "RISK_MEDIUM" : "RISK_LOW";
  const aiNextAction =
    score >= 70 ? "Contrôler ce câble en priorité dans Navemaster et Cable Story" :
    score >= 45 ? "Vérifier statut, métrage et notes terrain" :
    "Surveiller la prochaine version INCA";

  return {
    marcacavo: row.marcacavo,
    aiNavStatus,
    aiRiskScore: Math.min(score, 100),
    aiRiskReasons: reasons,
    aiNextAction,
    aiConfidence: reasons.length >= 2 ? 0.84 : 0.67,
    aiSummary: `${row.marcacavo} présente ${reasons.join(", ")}.`,
  };
}

function isMajorSignal(row: NavemasterNormalizedRow, text: string, reasons: string[]): boolean {
  const statoSta = String(row.payload.stato_sta ?? "").trim().toUpperCase();
  const situazione = String(row.payload["SITUAZIONE CAVO"] ?? "").trim().toUpperCase();

  return (
    statoSta === "B" ||
    situazione === "!" ||
    /BLOCC|MANC|DA TROVARE|RISTENDERE|SHORT|CORT/.test(text) ||
    reasons.some((reason) =>
      /bloqué|longueur 0|ancien code|éliminé/i.test(reason)
    )
  );
}

export function buildNavemasterAiInsights(rows: NavemasterNormalizedRow[]): NavemasterAiOverview {
  const insights = rows
    .map(scoreRow)
    .filter((item): item is NavemasterAiInsight => Boolean(item))
    .sort((left, right) => right.aiRiskScore - left.aiRiskScore)
    .slice(0, 80);

  const perimeterMap = new Map<string, number>();
  let withPriorityNotes = 0;
  let withoutStockSignal = 0;
  let problematic = 0;
  let legendCritical = 0;
  let legendSignals = 0;

  for (const row of rows) {
    const perimeter = row.impianto ?? "—";
    perimeterMap.set(perimeter, (perimeterMap.get(perimeter) ?? 0) + 1);
    const notes = String(row.payload.note_sviluppo ?? "").toUpperCase();
    if (/PRIORIT/.test(notes)) withPriorityNotes += 1;
    if (row.payload.disponibilita_magazzini === 0) withoutStockSignal += 1;
    if (String(row.payload.problematiche_cavi ?? row.payload.problematiche_collegamenti ?? "").trim()) problematic += 1;

    const legend = summarizeNavemasterLegendSignals(row);
    if (legend.score > 0) legendSignals += 1;
    if (legend.score >= 35) legendCritical += 1;
  }

  const topPerimeters = Array.from(perimeterMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const summary = [
    `${rows.length} câbles dans la version active Navemaster.`,
    `${problematic} câbles portent déjà un signal de problématique métier.`,
    `${legendSignals} câbles exposent un signal de légende métier, dont ${legendCritical} critiques.`,
    `${withPriorityNotes} câbles ont une note de priorité explicite.`,
    `${insights.length} câbles sortent dans le top de vigilance IA.`,
  ];

  return {
    totalCables: rows.length,
    blockedOrProblematic: problematic,
    withPriorityNotes,
    withoutStockSignal,
    topPerimeters,
    insights,
    summary,
  };
}
