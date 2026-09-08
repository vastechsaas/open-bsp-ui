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

export type TransferMention = {
  id: string;
  name: string;
  role: string;
};

export function getPrivateNoteTransferTarget({
  role,
  currentAgentId,
  assignedAgentId,
  text,
  selectedHumans,
}: {
  role: string | null | undefined;
  currentAgentId: string | null | undefined;
  assignedAgentId: string | null | undefined;
  text: string;
  selectedHumans: TransferMention[];
}) {
  if (
    role !== "agent" ||
    !currentAgentId ||
    assignedAgentId !== currentAgentId ||
    !text.trim() ||
    selectedHumans.length !== 1
  ) {
    return undefined;
  }

  const target = selectedHumans[0];
  return target.role === "agent" && target.id !== currentAgentId
    ? target
    : undefined;
}
