import { listOpenPriorities } from "../../core-command/api/cablePriorities.api";
import type { CommanderPriorityReadModel } from "../commands/CommandTypes";

export async function loadCommanderPriority(): Promise<CommanderPriorityReadModel> {
  const priorities = await listOpenPriorities(20);

  return {
    openItems: priorities.map((item) => ({
      cableCode: item.cable_code,
      priority: item.priority,
      reason: item.reason,
      status: item.status,
    })),
  };
}
