import {
  type ConversationRow,
  type MessageRow,
  supabase,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useCurrentAgent } from "@/queries/useAgents";
import { isPrivateNote } from "@/utils/PrivateNoteUtils";
import { queryKeys } from "@/queries/queryKeys";
import {
  getInaccessibleConversationIds,
  getRealtimeRetryDelayMs,
  shouldRetryRealtimeStatus,
  toConversationStateSignal,
} from "@/utils/ConversationRealtimeUtils";

const CONVERSATION_PAGE_SIZE = 500;

type InitDataResponse = {
  conversations: ConversationRow[];
  messages: MessageRow[];
};

export const useRealtimeSubscription = () => {
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  const pushConversations = useBoundStore(
    (state) => state.chat.pushConversations,
  );
  const pushMessages = useBoundStore((state) => state.chat.pushMessages);
  const removeConversations = useBoundStore(
    (state) => state.chat.removeConversations,
  );
  const queryClient = useQueryClient();
  const { data: currentAgent } = useCurrentAgent();
  const currentAgentId = currentAgent?.id;

  useEffect(() => {
    if (!activeOrgId) return;

    const filter = `organization_id=eq.${activeOrgId}`;

    let recoveryPromise: Promise<void> | undefined;

    const reconcileConversation = async (conversationId: string) => {
      const { data, error } = await supabase
        .from("conversations")
        .select()
        .eq("id", conversationId)
        .maybeSingle();

      if (error) {
        console.error("Could not reconcile conversation queue state", error);
        return;
      }

      if (data) {
        pushConversations([data as ConversationRow]);

        const { data: messages, error: messagesError } = await supabase
          .from("messages")
          .select()
          .eq("organization_id", activeOrgId)
          .eq("conversation_id", conversationId)
          .order("timestamp", { ascending: false })
          .limit(100);

        if (messagesError) {
          console.error(
            "Could not hydrate reconciled conversation messages",
            messagesError,
          );
          return;
        }

        pushMessages(messages as MessageRow[]);
      } else {
        removeConversations([conversationId]);
      }
    };

    const refreshConversationQueues = () => {
      if (recoveryPromise) return recoveryPromise;

      recoveryPromise = (async () => {
        const conversations: ConversationRow[] = [];

        for (let from = 0; ; from += CONVERSATION_PAGE_SIZE) {
          const { data, error } = await supabase
            .from("conversations")
            .select()
            .eq("organization_id", activeOrgId)
            .order("id", { ascending: true })
            .range(from, from + CONVERSATION_PAGE_SIZE - 1);

          if (error) throw error;

          const page = data as ConversationRow[];
          conversations.push(...page);
          if (page.length < CONVERSATION_PAGE_SIZE) break;
        }

        const accessibleIds = new Set(
          conversations.map((conversation) => conversation.id),
        );
        const inaccessibleIds = getInaccessibleConversationIds(
          useBoundStore.getState().chat.conversations.values(),
          accessibleIds,
          activeOrgId,
        );

        if (inaccessibleIds.length) removeConversations(inaccessibleIds);
        pushConversations(conversations);

        const { data, error } = await supabase.rpc("init_data", {
          p_organization_id: activeOrgId,
          p_limit: 1000,
          p_per_conversation: 1,
        });

        if (error) throw error;

        const initialData = data as unknown as InitDataResponse;
        pushConversations(initialData.conversations);
        pushMessages(initialData.messages);
        await queryClient.invalidateQueries({
          queryKey:
            queryKeys.privateNotes.mentionedConversationsRoot(activeOrgId),
        });
      })()
        .catch((error: unknown) => {
          console.error("Could not refresh conversation queue state", error);
        })
        .finally(() => {
          recoveryPromise = undefined;
        });

      return recoveryPromise;
    };

    const refreshQuickReplies = () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.quickReplies.all(activeOrgId),
      });

    const refreshContacts = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.all(activeOrgId),
      });
      void queryClient.invalidateQueries({
        queryKey: [activeOrgId, "contacts_addresses"],
      });
    };

    let cancelled = false;
    let dataChannel: ReturnType<typeof supabase.channel> | undefined;
    let queueChannel: ReturnType<typeof supabase.channel> | undefined;
    let dataRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let queueRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let dataRetryAttempt = 0;
    let queueRetryAttempt = 0;
    let dataSubscribed = false;
    let queueSubscribed = false;

    const startDataChannel = () => {
      if (cancelled) return;

      if (dataRetryTimer) clearTimeout(dataRetryTimer);
      dataRetryTimer = undefined;
      if (dataChannel) void dataChannel.unsubscribe();

      const nextDataChannel = supabase
        .channel(`conversation-data:${activeOrgId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
            filter,
          },
          (payload) => {
            // TODO: https://github.com/supabase/supabase/issues/32817
            if (payload.table !== "conversations") return;

            const conversation = payload.new as ConversationRow;

            pushConversations([conversation]);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter,
          },
          (payload) => {
            // TODO: https://github.com/supabase/supabase/issues/32817
            if (payload.table !== "messages") return;

            const message = payload.new as MessageRow;

            pushMessages([message]);

            if (
              currentAgentId &&
              isPrivateNote(message) &&
              message.content.mentioned_agent_ids.includes(currentAgentId)
            ) {
              void queryClient.invalidateQueries({
                queryKey:
                  queryKeys.privateNotes.mentionedConversationsRoot(
                    activeOrgId,
                  ),
              });
            }

            //updateMessagesCache([message]);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "quick_replies",
            filter,
          },
          () => {
            void refreshQuickReplies();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "contacts",
            filter,
          },
          () => {
            refreshContacts();
          },
        );

      dataChannel = nextDataChannel;

      nextDataChannel.subscribe((status) => {
        if (cancelled || dataChannel !== nextDataChannel) return;

        dataSubscribed = status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED;
        if (dataSubscribed) {
          dataRetryAttempt = 0;
          void refreshQuickReplies();
          refreshContacts();
          return;
        }

        if (shouldRetryRealtimeStatus(status)) {
          const delay = getRealtimeRetryDelayMs(dataRetryAttempt++);
          console.warn(`Conversation data realtime ${status}; retrying`);
          dataRetryTimer = setTimeout(startDataChannel, delay);
        }
      });
    };

    const startQueueChannel = async () => {
      if (cancelled) return;

      if (queueRetryTimer) clearTimeout(queueRetryTimer);
      queueRetryTimer = undefined;
      if (queueChannel) void queueChannel.unsubscribe();

      try {
        await supabase.realtime.setAuth();
        if (cancelled) return;

        const nextQueueChannel = supabase
          .channel(`conversation-queue:${activeOrgId}`, {
            config: { private: true },
          })
          .on(
            "broadcast",
            { event: "conversation_state_changed" },
            (payload) => {
              const signal = toConversationStateSignal(payload.payload);
              if (!signal || signal.organization_id !== activeOrgId) return;

              void reconcileConversation(signal.conversation_id);
            },
          );

        queueChannel = nextQueueChannel;

        nextQueueChannel.subscribe((status) => {
          if (cancelled || queueChannel !== nextQueueChannel) return;

          queueSubscribed = status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED;
          if (queueSubscribed) {
            queueRetryAttempt = 0;
            void refreshConversationQueues();
            return;
          }

          if (shouldRetryRealtimeStatus(status)) {
            const delay = getRealtimeRetryDelayMs(queueRetryAttempt++);
            console.warn(`Conversation queue realtime ${status}; retrying`);
            queueRetryTimer = setTimeout(() => {
              void startQueueChannel();
            }, delay);
          }
        });
      } catch (error: unknown) {
        console.error("Could not authorize conversation queue realtime", error);
        const delay = getRealtimeRetryDelayMs(queueRetryAttempt++);
        queueRetryTimer = setTimeout(() => {
          void startQueueChannel();
        }, delay);
      }
    };

    const recoverWhenActive = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;

      void refreshConversationQueues();
      void refreshQuickReplies();
      refreshContacts();
      if (!dataSubscribed) startDataChannel();
      if (!queueSubscribed) void startQueueChannel();
    };

    startDataChannel();
    void startQueueChannel();
    window.addEventListener("online", recoverWhenActive);
    document.addEventListener("visibilitychange", recoverWhenActive);

    // Cleanup subscription on unmount
    return () => {
      cancelled = true;
      if (dataRetryTimer) clearTimeout(dataRetryTimer);
      if (queueRetryTimer) clearTimeout(queueRetryTimer);
      window.removeEventListener("online", recoverWhenActive);
      document.removeEventListener("visibilitychange", recoverWhenActive);
      if (dataChannel) void dataChannel.unsubscribe();
      if (queueChannel) void queueChannel.unsubscribe();
    };
  }, [
    activeOrgId,
    currentAgentId,
    pushConversations,
    pushMessages,
    removeConversations,
    queryClient,
  ]);
};
