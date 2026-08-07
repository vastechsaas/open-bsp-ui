export type ConversationStateSignal = {
  organization_id: string;
  conversation_id: string;
};

export function toConversationStateSignal(
  value: unknown,
): ConversationStateSignal | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = value as Record<string, unknown>;
  return typeof candidate.organization_id === "string" &&
    typeof candidate.conversation_id === "string"
    ? {
        organization_id: candidate.organization_id,
        conversation_id: candidate.conversation_id,
      }
    : undefined;
}
