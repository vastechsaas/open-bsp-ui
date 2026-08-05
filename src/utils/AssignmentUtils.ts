import type { AgentRow, ConversationRow } from "@/supabase/client";

export type ConversationAssignmentAction = "assign-to-me" | "unassign-from-me";

export function getConversationAssignmentAction(
  conversation: ConversationRow,
  currentAgentId?: string | null,
): ConversationAssignmentAction | null {
  if (!currentAgentId) {
    return null;
  }

  if (conversation.assigned_agent_id === null) {
    return "assign-to-me";
  }

  if (conversation.assigned_agent_id === currentAgentId) {
    return "unassign-from-me";
  }

  return null;
}

export function getConversationAssigneeName(
  conversation: ConversationRow | undefined,
  agents: AgentRow[] | undefined,
): string | undefined {
  return getConversationAssignee(conversation, agents)?.name;
}

export function getConversationAssignee(
  conversation: ConversationRow | undefined,
  agents: AgentRow[] | undefined,
): AgentRow | undefined {
  if (!conversation?.assigned_agent_id) {
    return undefined;
  }

  return agents?.find((agent) => agent.id === conversation.assigned_agent_id);
}
