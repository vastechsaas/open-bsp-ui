import type { MessageRow } from "@/supabase/client";

export function isPrivateNote(message: MessageRow): boolean {
  return (
    message.direction === "internal" &&
    message.content.type === "text" &&
    message.content.kind === "private_note"
  );
}

export function canComposePrivateNote(status: string | null | undefined) {
  return status === "active";
}

export function canSendCustomerReply(
  role: string | null | undefined,
  currentAgentId: string | null | undefined,
  assignedAgentId: string | null | undefined,
) {
  return role !== "agent" || assignedAgentId === currentAgentId;
}
