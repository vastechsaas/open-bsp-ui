import type { MessageRow, PrivateNotePart } from "@/supabase/client";

export type PrivateNoteMessageRow = MessageRow & {
  direction: "internal";
  content: MessageRow["content"] & PrivateNotePart;
};

export function isPrivateNote(
  message: MessageRow,
): message is PrivateNoteMessageRow {
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
