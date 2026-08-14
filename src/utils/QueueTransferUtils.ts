export function canTransferConversationToQueue({
  role,
  currentAgentId,
  assignedAgentId,
  conversationStatus,
}: {
  role: string | null | undefined;
  currentAgentId: string | null | undefined;
  assignedAgentId: string | null | undefined;
  conversationStatus: string | null | undefined;
}) {
  if (!currentAgentId || conversationStatus !== "active") return false;

  if (role === "agent") return assignedAgentId === currentAgentId;

  return role === "owner" || role === "admin" || role === "supervisor";
}
