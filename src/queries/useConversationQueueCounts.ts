import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  conversationCountKey,
  parseConversationCounts,
} from "@/utils/ConversationWorkspaceUtils";

export function useConversationQueueCounts() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const routingQueueId = useBoundStore((state) => state.ui.routingQueueId);
  return useQuery({
    queryKey: conversationCountKey(userId, organizationId, routingQueueId),
    enabled: !!organizationId && !!userId,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc("get_conversation_queue_counts", {
          p_organization_id: organizationId!,
          p_routing_queue_id: routingQueueId ?? undefined,
        })
        .abortSignal(signal);
      if (error) throw error;
      return parseConversationCounts(data);
    },
  });
}
