import type { CommanderEnv, ParsedIncomingMessage } from "../types";

export function isAllowedIngress(
  message: ParsedIncomingMessage,
  env: CommanderEnv,
): boolean {
  const senderAllowed =
    env.allowedSenders.length === 0 || env.allowedSenders.includes(message.sender);
  const groupAllowed =
    env.allowedGroupIds.length === 0 ||
    (message.groupId !== null && env.allowedGroupIds.includes(message.groupId));
  return senderAllowed && groupAllowed;
}
