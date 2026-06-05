import type { CommanderCommandName, CommanderEnv, RoutedMessage } from "../types";

const SUPPORTED_COMMANDS: readonly CommanderCommandName[] = [
  "cable",
  "story",
  "priority",
  "risk",
  "today",
  "tomorrow",
] as const;

function normalizeText(text: string | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function routeIncomingText(
  text: string | null,
  env: CommanderEnv,
): RoutedMessage {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return {
      kind: "unsupported",
      command: null,
      argument: null,
      normalizedText,
    };
  }

  if (!normalizedText.startsWith(env.commandPrefix)) {
    return {
      kind: "free_text",
      command: null,
      argument: null,
      normalizedText,
    };
  }

  const withoutPrefix = normalizedText.slice(env.commandPrefix.length).trim();
  const [candidate, ...rest] = withoutPrefix.split(/\s+/);
  const command = candidate.toLowerCase() as CommanderCommandName;
  if (!SUPPORTED_COMMANDS.includes(command)) {
    return {
      kind: "unsupported",
      command: null,
      argument: null,
      normalizedText,
    };
  }

  return {
    kind: "command",
    command,
    argument: rest.length > 0 ? rest.join(" ").trim() : null,
    normalizedText,
  };
}
