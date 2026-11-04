import { useQueries } from "@tanstack/react-query";
import { supabase, type MessageRow } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";

type CampaignLink = { label: string; url: string };
export type CampaignReplyPreview = {
  reply_id: string;
  name: string;
  header?: string;
  body?: string;
  footer?: string;
  links: CampaignLink[];
  cards: { text?: string; links: CampaignLink[]; image_url?: string }[];
};

export function useCampaignReplyContext(messages: MessageRow[]) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const conversationId = useBoundStore((state) => state.ui.activeConvId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const visibleConversation = useBoundStore(
    (state) =>
      !!conversationId &&
      state.chat.conversations.get(conversationId)?.organization_id ===
        organizationId,
  );
  const replyIds = messages
    .filter(
      (message) =>
        message.organization_id === organizationId &&
        message.conversation_id === conversationId &&
        message.service === "whatsapp" &&
        message.direction === "incoming" &&
        !message.group_address &&
        message.content.kind !== "reaction" &&
        !!message.content.re_message_id,
    )
    .map(({ id }) => id);
  const batches: string[][] = [];
  if (organizationId && conversationId && userId && visibleConversation) {
    for (let index = 0; index < replyIds.length; index += 50) {
      batches.push(replyIds.slice(index, index + 50));
    }
  }
  const results = useQueries({
    queries: batches.map((reply_ids) => ({
      queryKey: [
        organizationId,
        "campaign-reply-context",
        userId,
        conversationId,
        reply_ids,
      ],
      gcTime: 0,
      staleTime: 60_000,
      refetchOnWindowFocus: "always" as const,
      retry: false,
      queryFn: async (context: { signal: AbortSignal }) => {
        const result = await supabase.functions.invoke<{
          previews: CampaignReplyPreview[];
        }>("whatsapp-management/campaign-reply-context", {
          body: {
            organization_id: organizationId,
            conversation_id: conversationId,
            reply_ids,
          },
          signal: context.signal,
        });
        const error: unknown = result.error;
        if (error) throw error;
        return result.data?.previews ?? [];
      },
    })),
  });
  // Supplemental context must never prevent rendering an actual incoming reply.
  return new Map(
    results.flatMap((result) =>
      (result.isError ? [] : (result.data ?? [])).map(
        (preview) => [preview.reply_id, preview] as const,
      ),
    ),
  );
}
