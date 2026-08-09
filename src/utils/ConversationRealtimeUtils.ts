export type ConversationStateSignal = {
  organization_id: string;
  conversation_id: string;
};

export const REALTIME_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000] as const;

export function shouldRetryRealtimeStatus(status: string): boolean {
  return ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status);
}

export function getRealtimeRetryDelayMs(attempt: number): number {
  const index = Math.min(
    Math.max(0, attempt),
    REALTIME_RETRY_DELAYS_MS.length - 1,
  );
  return REALTIME_RETRY_DELAYS_MS[index];
}

export function getInaccessibleConversationIds(
  cached: Iterable<{ id: string; organization_id: string }>,
  accessibleIds: ReadonlySet<string>,
  organizationId: string,
): string[] {
  return Array.from(cached)
    .filter(
      (conversation) =>
        conversation.organization_id === organizationId &&
        !accessibleIds.has(conversation.id),
    )
    .map((conversation) => conversation.id);
}

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
