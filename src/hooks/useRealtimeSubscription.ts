import {
  type ConversationRow,
  type MessageRow,
  supabase,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentAgent } from "@/queries/useAgents";
import { isPrivateNote } from "@/utils/PrivateNoteUtils";
import { queryKeys } from "@/queries/queryKeys";
import { toConversationStateSignal } from "@/utils/ConversationRealtimeUtils";

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
      } else {
        removeConversations([conversationId]);
      }
    };

    const channel = supabase
      .channel("rialtaim")
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
                queryKeys.privateNotes.mentionedConversationsRoot(activeOrgId),
            });
          }

          //updateMessagesCache([message]);
        },
      );

    channel.subscribe();

    let cancelled = false;
    let queueChannel: ReturnType<typeof supabase.channel> | undefined;

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (cancelled) return;

        queueChannel = supabase
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

        queueChannel.subscribe();
      })
      .catch((error: unknown) => {
        console.error("Could not authorize conversation queue realtime", error);
      });

    // Cleanup subscription on unmount
    return () => {
      cancelled = true;
      void channel.unsubscribe();
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
