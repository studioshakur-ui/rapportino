import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import type { PerimeterSummary } from "../../../modules/daily-lists/dailyLists.types";
import type { CommanderTodayReadModel } from "../commands/CommandTypes";

export async function loadCommanderToday(): Promise<CommanderTodayReadModel> {
  const snapshot = await loadCoreEngineSnapshot();
  const summary = snapshot.today.summary;
  const fieldSummary = snapshot.field.summary;

  if (!summary) {
    return {
      planned: null,
      confirmed: null,
      withoutEvidence: null,
      toVerify: null,
      blocked: null,
      topPriority: null,
      criticalZones: [],
    };
  }

  const criticalZones = (fieldSummary?.by_perimeter ?? ([] as PerimeterSummary[]))
    .filter((zone) => zone.no_evidence > 0 || zone.pct < 50)
    .sort((left, right) => {
      if (right.no_evidence !== left.no_evidence) return right.no_evidence - left.no_evidence;
      return left.pct - right.pct;
    })
    .slice(0, 3)
    .map((zone) => zone.perimetro);

  const topPriority = snapshot.today.open_priorities[0]
    ? `${snapshot.today.open_priorities[0].cable_code} — ${snapshot.today.open_priorities[0].reason ?? snapshot.today.open_priorities[0].priority}`
    : null;

  return {
    planned: summary.total,
    confirmed: summary.confirmed,
    withoutEvidence: summary.no_evidence,
    toVerify: summary.to_verify + summary.likely_laid + summary.outside_inca,
    blocked: summary.blocked,
    topPriority,
    criticalZones,
  };
}
