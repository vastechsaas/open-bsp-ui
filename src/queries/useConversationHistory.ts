import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase, type MessageRow } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
  olderMessagesFilter,
  type HistoryCursor,
} from "@/utils/ConversationHistoryUtils";

export function useConversationHistory() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const conversationId = useBoundStore((state) => state.ui.activeConvId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const conversation = useBoundStore((state) =>
    state.chat.conversations.get(conversationId ?? ""),
  );
  const accessible =
    !!conversation && conversation.organization_id === organizationId;
  const history = useInfiniteQuery({
    queryKey: [organizationId, "conversation-history", userId, conversationId],
    enabled: !!userId && !!organizationId && !!conversationId && accessible,
    initialPageParam: undefined as HistoryCursor | undefined,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
    queryFn: async ({ pageParam, signal }) => {
      const { data: allowed, error: accessError } = await supabase
        .from("conversations")
        .select("id")
        .eq("organization_id", organizationId!)
        .eq("id", conversationId!)
        .abortSignal(signal)
        .maybeSingle();
      if (accessError) throw accessError;
      if (!allowed) {
        const state = useBoundStore.getState();
        if (
          !signal.aborted &&
          state.ui.user?.id === userId &&
          state.ui.activeOrgId === organizationId
        ) {
          state.chat.removeConversations([conversationId!]);
        }
        throw new Error("Conversation is no longer accessible");
      }
      let request = supabase
        .from("messages")
        .select()
        .eq("organization_id", organizationId!)
        .eq("conversation_id", conversationId!)
        .lte("timestamp", new Date().toISOString())
        .order("timestamp", { ascending: false })
        .order("id", { ascending: false })
        .limit(HISTORY_PAGE_SIZE)
        .abortSignal(signal);
      if (pageParam) request = request.or(olderMessagesFilter(pageParam));
      const { data, error } = await request;
      if (error) throw error;
      return data as MessageRow[];
    },
    getNextPageParam: nextHistoryCursor,
  });

  useEffect(() => {
    const state = useBoundStore.getState();
    if (
      !accessible ||
      !history.data ||
      state.ui.user?.id !== userId ||
      state.ui.activeOrgId !== organizationId ||
      state.ui.activeConvId !== conversationId ||
      !state.chat.conversations.has(conversationId!)
    )
      return;
    state.chat.pushMessages(history.data.pages.flat());
  }, [history.data, accessible, userId, organizationId, conversationId]);

  return history;
}
