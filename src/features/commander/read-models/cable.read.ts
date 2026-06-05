import { loadCableStory } from "../../../modules/cable-story/cableStory.repo";
import type { CommanderCableReadModel } from "../commands/CommandTypes";

export async function loadCommanderCable(code: string): Promise<CommanderCableReadModel> {
  const resolution = await loadCableStory(code);

  if (resolution.kind !== "resolved") {
    return {
      code,
      story: null,
      resolution,
    };
  }

  return {
    code,
    story: resolution.model,
    resolution,
  };
}
