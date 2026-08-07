import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import {
  type ConversationRow,
  type Database,
  type MessageRow,
  supabase,
} from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export type MentionableHuman =
  Database["public"]["Functions"]["list_mentionable_humans_page"]["Returns"][number];
export type MentionedConversationRow =
  Database["public"]["Functions"]["list_mentioned_conversations_page"]["Returns"][number];

export type MentionedConversationPage = {
  page: number;
  rows: MentionedConversationRow[];
  totalCount: number;
};

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

async function listMentionedConversationsPage(
  organizationId: string,
  page: number,
  search: string,
): Promise<MentionedConversationPage> {
  const { data, error } = await supabase.rpc(
    "list_mentioned_conversations_page",
    {
      p_organization_id: organizationId,
      p_page: page,
      p_page_size: 50,
      p_search: search || undefined,
    },
  );

  if (error) throw error;

  const rows = (data || []) as MentionedConversationRow[];

  return {
    page,
    rows,
    totalCount: rows[0]?.total_count || 0,
  };
}

export function useMentionedConversations(search: string, enabled: boolean) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useInfiniteQuery({
    queryKey: queryKeys.privateNotes.mentionedConversations(
      organizationId,
      search,
    ),
    queryFn: ({ pageParam }) =>
      listMentionedConversationsPage(organizationId!, pageParam, search),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.rows.length, 0);
      return loaded < lastPage.totalCount ? lastPage.page + 1 : undefined;
    },
    enabled: enabled && !!organizationId,
  });
}

export function toMentionedConversation(
  row: MentionedConversationRow,
): ConversationRow {
  return {
    assigned_agent_id: row.assigned_agent_id || null,
    contact_address: row.contact_address || null,
    created_at: row.created_at,
    extra: row.extra as ConversationRow["extra"],
    group_address: row.group_address || null,
    id: row.id,
    name: row.name || null,
    organization_address: row.organization_address,
    organization_id: row.organization_id,
    service: row.service,
    status: row.status,
    updated_at: row.updated_at,
  };
}

export function toMentionedPreviewMessage(
  row: MentionedConversationRow,
): MessageRow | undefined {
  if (!row.preview_message || typeof row.preview_message !== "object") {
    return undefined;
  }

  return row.preview_message as unknown as MessageRow;
}

export async function fetchMentionedConversationMessages(
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select()
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as MessageRow[];
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

export type TransferConversationResult = {
  conversation: ConversationRow;
  note: MessageRow;
};

export function useTransferConversationWithPrivateNote() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      targetAgentId,
      text,
    }: {
      conversationId: string;
      targetAgentId: string;
      text: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "transfer_conversation_with_private_note",
        {
          p_conversation_id: conversationId,
          p_target_agent_id: targetAgentId,
          p_text: text,
        },
      );

      if (error) throw error;
      return data as unknown as TransferConversationResult;
    },
  });
}
