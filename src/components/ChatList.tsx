import useBoundStore from "@/stores/useBoundStore";
import ChatListItem from "./ChatListItem";
import { type ConversationRow, type MessageRow } from "@/supabase/client";
import { timestampDescending } from "@/stores/chatSlice";
import { conversationQueueFilters } from "@/stores/uiSlice";
import Fuse from "fuse.js";
import { useTranslation } from "@/hooks/useTranslation";
import { useConversationQueues } from "@/queries/useConversationQueues";
import { DEFAULT_CONVERSATION_QUEUE_KEY } from "@/types/conversationQueues";
import { isPrivateNote } from "@/utils/PrivateNoteUtils";
import { useEffect, useMemo } from "react";
import {
  toMentionedConversation,
  toMentionedPreviewMessage,
  useMentionedConversations,
} from "@/queries/usePrivateNotes";
import { useCurrentAgent } from "@/queries/useAgents";

export type ConvMetadata = {
  convId: string;
  conv: ConversationRow;
  mostRecentMsg?: MessageRow;
};

function pinnedAscending(a: ConversationRow, b: ConversationRow) {
  const aPin = a.extra?.pinned;
  const bPin = b.extra?.pinned;

  if (!aPin && !bPin) {
    return 0;
  }

  if (aPin && bPin) {
    return +new Date(aPin) > +new Date(bPin) ? 1 : -1;
  }

  return aPin && !bPin ? -1 : 1;
}

const ChatList = () => {
  const { translate: t } = useTranslation();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const conversations = useBoundStore((state) => state.chat.conversations);
  const messages = useBoundStore((state) => state.chat.messages);
  const queueKey = useBoundStore((state) => state.ui.conversationQueueKey);
  const routingQueueId = useBoundStore((state) => state.ui.routingQueueId);
  const setRoutingQueueId = useBoundStore(
    (state) => state.ui.setRoutingQueueId,
  );
  const setConversationQueueKey = useBoundStore(
    (state) => state.ui.setConversationQueueKey,
  );
  const searchPattern = useBoundStore((state) => state.ui.searchPattern);
  const setSearchPattern = useBoundStore((state) => state.ui.setSearchPattern);
  const { data: queues = [] } = useConversationQueues();
  const pushConversations = useBoundStore(
    (state) => state.chat.pushConversations,
  );
  const pushMessages = useBoundStore((state) => state.chat.pushMessages);
  const { data: currentAgent } = useCurrentAgent();

  function getMostRecentMsg(convId: string): MessageRow | undefined {
    for (const message of messages.get(convId)?.values() || []) {
      if (!isPrivateNote(message)) return message;
    }
  }

  function getConversationMessages(convId: string): MessageRow[] {
    return Array.from(messages.get(convId)?.values() || []);
  }

  const activeQueueKey = conversationQueueFilters[queueKey]
    ? queueKey
    : DEFAULT_CONVERSATION_QUEUE_KEY;
  const activeQueue = queues.find((queue) => queue.key === activeQueueKey);
  const isMentionedQueue = activeQueueKey === "mentioned";
  const mentionedQuery = useMentionedConversations(
    searchPattern,
    isMentionedQueue,
  );
  const mentionedRows = useMemo(
    () => mentionedQuery.data?.pages.flatMap((page) => page.rows) || [],
    [mentionedQuery.data],
  );

  useEffect(() => {
    if (!isMentionedQueue || mentionedRows.length === 0) return;

    pushConversations(mentionedRows.map(toMentionedConversation));
    pushMessages(
      mentionedRows
        .map(toMentionedPreviewMessage)
        .filter((message) => message !== undefined),
    );
  }, [isMentionedQueue, mentionedRows, pushConversations, pushMessages]);

  let items: ConvMetadata[] = [...conversations]
    /*.filter(
      ([, conv]) =>
        role === "admin" || conv.service !== "local",
    )*/
    .map(([convId, conv]) => ({
      convId,
      conv,
      mostRecentMsg: getMostRecentMsg(convId),
    }))
    .filter(
      (a) =>
        a.conv.organization_id === activeOrgId &&
        conversationQueueFilters[activeQueueKey](
          a.conv,
          getConversationMessages(a.convId),
          {
            currentAgentId: currentAgent?.id,
            role: currentAgent?.extra?.role,
          },
        ) &&
        (isMentionedQueue ||
          routingQueueId === null ||
          a.conv.routing_queue_id === routingQueueId) &&
        !!a.mostRecentMsg,
    );

  if (searchPattern && !isMentionedQueue) {
    const fuse = new Fuse(items, {
      threshold: 0.4,
      keys: ["conv.name", "conv.contact_address"],
    });
    items = fuse.search(searchPattern).map((r) => r.item);
  } else if (!isMentionedQueue) {
    items.sort(
      (a, b) =>
        pinnedAscending(a.conv, b.conv) ||
        timestampDescending(a.mostRecentMsg, b.mostRecentMsg),
    );
  }

  const itemIds = isMentionedQueue
    ? mentionedRows.map((row) => row.id)
    : items.map((a) => a.convId);
  const latestMentionById = new Map(
    mentionedRows.map((row) => [row.id, row.latest_mention_at]),
  );

  const emptyLabel = (() => {
    if (searchPattern) {
      return t("Sin resultados");
    }

    if (activeQueue) {
      return `${t("No hay conversaciones en")} ${activeQueue.label}`;
    }

    return t("Nada por aquí");
  })();

  return (
    <div className="overflow-y-auto [scrollbar-gutter:stable] w-full h-full pt-[10px] px-[10px]">
      {isMentionedQueue && mentionedQuery.isPending ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-[14px]">
          {t("Cargando...")}
        </div>
      ) : itemIds.length ? (
        <div className="flex flex-col gap-[4px]">
          {itemIds.map((key) => (
            <ChatListItem
              key={key}
              itemId={key}
              isMentionedQueue={isMentionedQueue}
              latestMentionAt={latestMentionById.get(key)}
            />
          ))}
          {isMentionedQueue && mentionedQuery.hasNextPage && (
            <button
              type="button"
              className="mx-auto my-2 rounded-lg border border-border px-3 py-2 text-[13px] text-primary disabled:opacity-50"
              disabled={mentionedQuery.isFetchingNextPage}
              onClick={() => void mentionedQuery.fetchNextPage()}
            >
              {mentionedQuery.isFetchingNextPage
                ? t("Cargando...")
                : t("Cargar más")}
            </button>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center flex-col text-foreground text-[15px] mt-[-24px]">
          {emptyLabel}
          {isMentionedQueue && mentionedQuery.error && (
            <div className="mt-2 max-w-sm text-center text-[12px] text-red-600">
              {mentionedQuery.error.message}
            </div>
          )}
          {(searchPattern ||
            routingQueueId !== null ||
            activeQueueKey !== DEFAULT_CONVERSATION_QUEUE_KEY) && (
            <button
              className="text-[13px] text-primary"
              onClick={() => {
                setSearchPattern("");
                setRoutingQueueId(null);
                setConversationQueueKey(
                  queues[0]?.key ?? DEFAULT_CONVERSATION_QUEUE_KEY,
                );
              }}
            >
              {t("remover filtros...")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatList;
