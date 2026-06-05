import type { CommanderParsedCommand } from "./CommandTypes";
import { loadCommanderCable } from "../read-models/cable.read";
import { loadCommanderEquipment } from "../read-models/equipment.read";
import { loadCommanderPriority } from "../read-models/priority.read";
import { loadCommanderRisk } from "../read-models/risk.read";
import { loadCommanderToday } from "../read-models/today.read";
import { loadCommanderTomorrow } from "../read-models/tomorrow.read";
import { formatCommanderCable } from "../formatters/cable.format";
import { formatCommanderEquipment } from "../formatters/equipment.format";
import { formatCommanderPriority } from "../formatters/priority.format";
import { formatCommanderRisk } from "../formatters/risk.format";
import { formatCommanderToday } from "../formatters/today.format";
import { formatCommanderTomorrow } from "../formatters/tomorrow.format";

function normalizeCommandInput(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function parseCommanderCommand(input: string): CommanderParsedCommand | null {
  const value = normalizeCommandInput(input);
  if (!value.startsWith("#")) return null;

  if (/^#today$/i.test(value)) return { name: "today", raw: value };
  if (/^#risk$/i.test(value)) return { name: "risk", raw: value };
  if (/^#priority$/i.test(value)) return { name: "priority", raw: value };
  if (/^#tomorrow$/i.test(value)) return { name: "tomorrow", raw: value };

  const equipmentMatch = value.match(/^#equipment\s+(.+)$/i);
  if (equipmentMatch) {
    return { name: "equipment", raw: value, code: equipmentMatch[1].trim() };
  }

  const cableMatch = value.match(/^#cable\s+(.+)$/i);
  if (cableMatch) {
    return { name: "cable", raw: value, code: cableMatch[1].trim() };
  }

  return null;
}

export async function runCommanderCommand(input: string): Promise<string> {
  const command = parseCommanderCommand(input);
  if (!command) {
    return "Comando non riconosciuto.";
  }

  switch (command.name) {
    case "today": {
      const model = await loadCommanderToday();
      return formatCommanderToday(model);
    }
    case "risk": {
      const model = await loadCommanderRisk();
      return formatCommanderRisk(model);
    }
    case "priority": {
      const model = await loadCommanderPriority();
      return formatCommanderPriority(model);
    }
    case "equipment": {
      const model = await loadCommanderEquipment(command.code);
      return formatCommanderEquipment(model);
    }
    case "cable": {
      const model = await loadCommanderCable(command.code);
      return formatCommanderCable(model);
    }
    case "tomorrow": {
      const model = await loadCommanderTomorrow();
      return formatCommanderTomorrow(model);
    }
    default:
      return "Comando non riconosciuto.";
  }
}
