import { useMutation, useQuery } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { type Database, type MessageRow, supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export type MentionableHuman =
  Database["public"]["Functions"]["list_mentionable_humans_page"]["Returns"][number];

async function listMentionableHumans(organizationId: string, search: string) {
  const humans: MentionableHuman[] = [];
  let page = 1;
  let total = 0;

  do {
    const { data, error } = await supabase.rpc("list_mentionable_humans_page", {
      p_organization_id: organizationId,
      p_page: page,
      p_page_size: 50,
      p_search: search || undefined,
    });

    if (error) throw error;

    const rows = (data || []) as MentionableHuman[];
    humans.push(...rows);
    total = rows[0]?.total_count || humans.length;
    page += 1;
  } while (humans.length < total);

  return humans;
}

export function useMentionableHumans(search = "") {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.privateNotes.mentionableHumans(organizationId, search),
    queryFn: () => listMentionableHumans(organizationId!, search),
    enabled: !!organizationId,
  });
}

export function useCreatePrivateNote() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      text,
      mentionedAgentIds,
    }: {
      conversationId: string;
      text: string;
      mentionedAgentIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("create_private_note", {
        p_conversation_id: conversationId,
        p_text: text,
        p_mentioned_agent_ids: mentionedAgentIds,
      });

      if (error) throw error;
      return data as MessageRow;
    },
  });
}
