import { listOpenPriorities } from "../../core-command/api/cablePriorities.api";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import type { CommanderTodayReadModel } from "../commands/CommandTypes";

export async function loadCommanderToday(): Promise<CommanderTodayReadModel> {
  const latestImports = await listRecentImports(1);
  const latest = latestImports[0] ?? null;

  if (!latest) {
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

  const [items, priorities] = await Promise.all([
    loadItemsWithEvidence(latest.id),
    listOpenPriorities(10),
  ]);

  const summary = buildListSummary(
    latest.id,
    latest.list_date,
    latest.file_name,
    items
  );

  const criticalZones = summary.by_perimeter
    .filter((zone) => zone.no_evidence > 0 || zone.pct < 50)
    .sort((left, right) => {
      if (right.no_evidence !== left.no_evidence) return right.no_evidence - left.no_evidence;
      return left.pct - right.pct;
    })
    .slice(0, 3)
    .map((zone) => zone.perimetro);

  const topPriority = priorities[0]
    ? `${priorities[0].cable_code} — ${priorities[0].reason ?? priorities[0].priority}`
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
