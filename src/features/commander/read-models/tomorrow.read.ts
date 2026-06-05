import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import type { CommanderTomorrowReadModel } from "../commands/CommandTypes";

export async function loadCommanderTomorrow(): Promise<CommanderTomorrowReadModel> {
  const latestImports = await listRecentImports(1);
  const latest = latestImports[0] ?? null;

  if (!latest) {
    return {
      actions: [],
      recommendation: null,
    };
  }

  const items = await loadItemsWithEvidence(latest.id);
  const summary = buildListSummary(
    latest.id,
    latest.list_date,
    latest.file_name,
    items
  );

  const actions = summary.tomorrow_actions.slice(0, 5).map((action) => ({
    title: action.perimetro ? `${action.perimetro}` : action.label,
    detail:
      action.cable_codes.length > 0
        ? `${action.count} cavi — ${action.cable_codes.slice(0, 4).join(", ")}`
        : `${action.count} elementi da trattare`,
  }));

  const topMissingZone = summary.by_perimeter
    .filter((zone) => zone.no_evidence > 0)
    .sort((left, right) => right.no_evidence - left.no_evidence)[0] ?? null;

  const recommendation = topMissingZone
    ? `Aggiungere risorse su ${topMissingZone.perimetro}`
    : summary.tomorrow_actions[0]?.label ?? null;

  return {
    actions,
    recommendation,
  };
}
