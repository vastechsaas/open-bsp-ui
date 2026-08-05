import useBoundStore from "@/stores/useBoundStore";
import {
  type ConversationInsert,
  type ConversationRow,
  supabase,
} from "@/supabase/client";

function pushConversationToStore(record: ConversationInsert) {
  // TODO: optimistic insert lacks some fields that the store considers as present - cabra 2024/07/28
  useBoundStore.getState().chat.pushConversations([record as ConversationRow]);
}

export async function pushConversationToDb(record: ConversationInsert) {
  const insertQuery = await supabase.from("conversations").insert(record);

  if (insertQuery.error) {
    throw insertQuery.error;
  }
}

export function startConversation(conv: ConversationInsert) {
  const record: ConversationInsert = {
    ...conv,
    id: crypto.randomUUID(),
  };

  pushConversationToStore(record);

  return record.id;
}

export async function createConversationForMe(conv: ConversationInsert) {
  const { data, error } = await supabase.rpc("create_conversation_for_me", {
    p_organization_id: conv.organization_id,
    p_service: conv.service,
    p_organization_address: conv.organization_address,
    p_contact_address: conv.contact_address ?? undefined,
    p_group_address: conv.group_address ?? undefined,
    p_name: conv.name ?? undefined,
    p_extra: conv.extra,
  });

  if (error) throw error;

  pushConversationToStore(data as ConversationRow);
  return (data as ConversationRow).id;
}

export const updateConvExtra = async (
  conversation: ConversationRow,
  extra: {
    pinned?: string | null;
    archived?: string | null;
    paused?: string | null;
  },
) => {
  const { error } = await supabase
    .from("conversations")
    .update({ extra })
    .eq("organization_address", conversation.organization_address)
    .eq("contact_address", conversation.contact_address || "");

  if (error) {
    throw error;
  }
};

export async function assignConversationToMe(conversationId: string) {
  const { data, error } = await supabase.rpc("assign_conversation_to_me", {
    p_conversation_id: conversationId,
  });

  if (error) {
    throw error;
  }

  useBoundStore.getState().chat.pushConversations([data as ConversationRow]);
  return data as ConversationRow;
}

export async function unassignConversationFromMe(conversationId: string) {
  const { data, error } = await supabase.rpc("unassign_conversation_from_me", {
    p_conversation_id: conversationId,
  });

  if (error) {
    throw error;
  }

  useBoundStore.getState().chat.pushConversations([data as ConversationRow]);
  return data as ConversationRow;
}

export async function setConversationAgentAssignment(
  conversationId: string,
  agentId: string | null,
) {
  const { data, error } = await (
    supabase.rpc as unknown as (
      functionName: "set_conversation_agent_assignment",
      args: { p_conversation_id: string; p_agent_id: string | null },
    ) => Promise<{ data: unknown; error: Error | null }>
  )("set_conversation_agent_assignment", {
    p_conversation_id: conversationId,
    p_agent_id: agentId,
  });

  if (error) throw error;

  useBoundStore.getState().chat.pushConversations([data as ConversationRow]);
  return data as ConversationRow;
}

export async function saveDraft(
  conv: ConversationRow,
  text: string | null,
  sendAsContact?: boolean,
) {
  let origin = "human";

  if (sendAsContact !== undefined) {
    origin = sendAsContact ? "human-as-contact" : "human-as-organization";
  }

  const payload = {
    extra: {
      draft: text
        ? {
            text,
            timestamp: new Date().toISOString(),
            origin,
          }
        : null,
    },
  };

  const { error } = await supabase
    .from("conversations")
    .update(payload)
    .eq("organization_address", conv.organization_address)
    .eq("contact_address", conv.contact_address || "");

  if (error) {
    throw error;
  }
}
