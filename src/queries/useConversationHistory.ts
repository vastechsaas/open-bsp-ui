import { useEffect } from "react";
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

type CampaignLink = { label: string; url: string };
export type CampaignHistoryItem = {
  id: string;
  external_id: string;
  timestamp: string;
  name: string;
  header?: string;
  body?: string;
  footer?: string;
  links: CampaignLink[];
  cards: { text?: string; links: CampaignLink[]; image_url?: string }[];
};

type TimelineCursor = HistoryCursor & { source: "message" | "campaign" };
type TimelinePage = {
  messages: MessageRow[];
  campaigns: CampaignHistoryItem[];
  next_cursor?: TimelineCursor;
};

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
  const includeCampaigns =
    conversation?.service === "whatsapp" && !conversation.group_address;
  const enabled =
    !!userId && !!organizationId && !!conversationId && accessible;
  const queries = conversationHistoryQueries<TimelineCursor, TimelinePage>(
    { organizationId, userId, conversationId, includeCampaigns },
    async (pageParam, signal): Promise<TimelinePage> => {
      function denyAccess(): never {
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
      if (includeCampaigns) {
        const result = await supabase.functions.invoke<
          (TimelinePage & { accessible: true }) | { accessible: false }
        >("whatsapp-management/campaign-conversation-history", {
          body: {
            organization_id: organizationId,
            conversation_id: conversationId,
            cursor: pageParam,
          },
          signal,
        });
        const error: unknown = result.error;
        if (error) throw error;
        if (!result.data) throw new Error("Conversation history unavailable");
        if (!result.data.accessible) return denyAccess();
        return result.data;
      }
      const { data: allowed, error: accessError } = await supabase
        .from("conversations")
        .select("id")
        .eq("organization_id", organizationId!)
        .eq("id", conversationId!)
        .abortSignal(signal)
        .maybeSingle();
      if (accessError) throw accessError;
      if (!allowed) return denyAccess();
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
      const next = nextHistoryCursor(messages);
      return {
        messages,
        campaigns: [],
        ...(next ? { next_cursor: { ...next, source: "message" } } : {}),
      };
    },
  );
  const latest = useQuery({ ...queries.latest, enabled });
  const history = useInfiniteQuery({
    ...queries.pages,
    enabled: enabled && latest.isSuccess,
  });

  // A cached page never restores access after the conversation is removed.
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

  const campaigns = new Map(
    [
      ...(history.data?.pages.flatMap((page) => page.campaigns) ?? []),
      ...(latest.data?.campaigns ?? []),
    ].map((campaign) => [campaign.id, campaign]),
  );

  return {
    history: {
      data: history.data,
      hasNextPage: history.hasNextPage,
      fetchNextPage: history.fetchNextPage,
      isFetchNextPageError: history.isFetchNextPageError,
      isFetching: history.isFetching || latest.isFetching,
      isError: history.isError || latest.isError,
      isSuccess: history.isSuccess && latest.isSuccess,
      // The Retry control refreshes the head, never replays all cached pages.
      refetch: latest.refetch,
    },
    campaignSends: accessible ? [...campaigns.values()] : [],
  };
}
