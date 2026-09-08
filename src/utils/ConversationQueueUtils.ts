import {
  type ConversationQueueConfig,
  isConversationQueueKey,
} from "@/types/conversationQueues";

export function toConversationQueueConfig(
  value: unknown,
): ConversationQueueConfig[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((queue): queue is ConversationQueueConfig => {
      if (!queue || typeof queue !== "object") return false;

      const candidate = queue as Partial<ConversationQueueConfig>;

      return (
        isConversationQueueKey(candidate.key) &&
        typeof candidate.label === "string" &&
        typeof candidate.order === "number" &&
        typeof candidate.enabled === "boolean"
      );
    })
    .filter((queue) => queue.enabled)
    .sort((a, b) => a.order - b.order);
}
