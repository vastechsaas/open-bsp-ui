import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { queryKeys } from "./queryKeys";
import {
  type ConversationQueueConfig,
  isConversationQueueKey,
} from "@/types/conversationQueues";

type RpcError = {
  message: string;
};

type RpcResult = {
  data: unknown;
  error: RpcError | null;
};

function getConversationQueuesRpc(args: {
  p_organization_id: string;
}): Promise<RpcResult> {
  return (
    supabase.rpc as unknown as (
      fn: "get_conversation_queues",
      args: { p_organization_id: string },
    ) => Promise<RpcResult>
  )("get_conversation_queues", args);
}

function toConversationQueueConfig(value: unknown): ConversationQueueConfig[] {
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

export function useConversationQueues() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.conversationQueues.config(orgId),
    queryFn: async () => {
      const { data, error } = await getConversationQueuesRpc({
        p_organization_id: orgId!,
      });

      if (error) throw new Error(error.message);

      return toConversationQueueConfig(data);
    },
    enabled: !!orgId,
  });
}
