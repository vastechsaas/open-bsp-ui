export const CONVERSATION_QUEUE_KEYS = [
  "all_active",
  "assigned",
  "pending",
  "mentioned",
  "spam",
  "closed",
  "expired",
] as const;

export type ConversationQueueKey = (typeof CONVERSATION_QUEUE_KEYS)[number];

export type ConversationQueueConfig = {
  key: ConversationQueueKey;
  label: string;
  order: number;
  enabled: boolean;
};

export const DEFAULT_CONVERSATION_QUEUE_KEY: ConversationQueueKey =
  "all_active";

export function isConversationQueueKey(
  value: string | null | undefined,
): value is ConversationQueueKey {
  return CONVERSATION_QUEUE_KEYS.includes(value as ConversationQueueKey);
}
