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
  const setConversationQueueKey = useBoundStore(
    (state) => state.ui.setConversationQueueKey,
  );
  const searchPattern = useBoundStore((state) => state.ui.searchPattern);
  const setSearchPattern = useBoundStore((state) => state.ui.setSearchPattern);
  const { data: queues = [] } = useConversationQueues();

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
        ) &&
        !!a.mostRecentMsg,
    );

  if (searchPattern) {
    const fuse = new Fuse(items, {
      threshold: 0.4,
      keys: ["conv.name", "conv.contact_address"],
    });
    items = fuse.search(searchPattern).map((r) => r.item);
  } else {
    items.sort(
      (a, b) =>
        pinnedAscending(a.conv, b.conv) ||
        timestampDescending(a.mostRecentMsg, b.mostRecentMsg),
    );
  }

  const itemIds = items.map((a) => a.convId);

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
      {itemIds.length ? (
        <div className="flex flex-col gap-[4px]">
          {itemIds.map((key) => (
            <ChatListItem key={key} itemId={key} />
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center flex-col text-foreground text-[15px] mt-[-24px]">
          {emptyLabel}
          {(searchPattern ||
            activeQueueKey !== DEFAULT_CONVERSATION_QUEUE_KEY) && (
            <button
              className="text-[13px] text-primary"
              onClick={() => {
                setSearchPattern("");
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
