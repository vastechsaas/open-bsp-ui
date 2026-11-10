import { useEffect, useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase, type MessageRow } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
  olderMessagesFilter,
  type HistoryCursor,
} from "@/utils/ConversationHistoryUtils";
import {
  clearConversationHistory,
  conversationHistoryQueries,
} from "@/utils/ConversationHistoryQuery";

type HistoryPage = { messages: MessageRow[]; next_cursor?: HistoryCursor };

export function useConversationHistory() {
  const client = useQueryClient();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const conversationId = useBoundStore((state) => state.ui.activeConvId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const conversation = useBoundStore((state) =>
    state.chat.conversations.get(conversationId ?? ""),
  );
  const accessible =
    !!conversation && conversation.organization_id === organizationId;
  const enabled =
    !!userId && !!organizationId && !!conversationId && accessible;
  const queries = conversationHistoryQueries<HistoryCursor, HistoryPage>(
    { organizationId, userId, conversationId, includeCampaigns: false },
    async (pageParam, signal): Promise<HistoryPage> => {
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
          state.ui.activeOrgId === organizationId &&
          state.ui.activeConvId === conversationId
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
      const messages = data as MessageRow[];
      return { messages, next_cursor: nextHistoryCursor(messages) };
    },
  );
  const latest = useQuery({ ...queries.latest, enabled });
  const history = useInfiniteQuery({
    ...queries.pages,
    enabled: enabled && latest.isSuccess,
  });

  useEffect(() => {
    if (!organizationId || !conversationId) return;
    return useBoundStore.subscribe((state, previous) => {
      if (
        previous.chat.conversations.has(conversationId) &&
        !state.chat.conversations.has(conversationId)
      ) {
        clearConversationHistory(client, organizationId, [conversationId]);
      }
    });
  }, [client, organizationId, conversationId]);

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
    state.chat.pushMessages([
      ...history.data.pages.flatMap((page) => page.messages),
      ...(latest.data?.messages ?? []),
    ]);
  }, [
    history.data,
    latest.data,
    accessible,
    userId,
    organizationId,
    conversationId,
  ]);

  // Preserve staging's existing array-page contract; do not import Main-only
  // campaign-history APIs or change its Chat renderer as part of this hotfix.
  const data = useMemo(
    () =>
      history.data && {
        pages: history.data.pages.map((page) => page.messages),
        pageParams: history.data.pageParams,
      },
    [history.data],
  );
  return {
    data,
    hasNextPage: history.hasNextPage,
    fetchNextPage: history.fetchNextPage,
    isFetchNextPageError: history.isFetchNextPageError,
    isFetching: history.isFetching || latest.isFetching,
    isError: history.isError || latest.isError,
    isSuccess: history.isSuccess && latest.isSuccess,
    refetch: latest.refetch,
  };
}
