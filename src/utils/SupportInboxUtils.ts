export const SUPPORT_INBOX_BATCH_SIZE = 500;

export type InboxVisibilityRow = { conversation_id: string; visible: boolean };
export type InboxVisibilityBatch = {
  ids: string[];
  rows: InboxVisibilityRow[];
};

// Keep confirmed rows while a changed batch loads. Missing/inaccessible rows
// in an authoritative response explicitly revoke any previous eligibility.
export function mergeInboxVisibility(
  previous: ReadonlyMap<string, boolean>,
  batches: InboxVisibilityBatch[],
): Map<string, boolean> {
  const merged = new Map(previous);
  for (const batch of batches) {
    for (const id of batch.ids) merged.set(id, false);
    for (const row of batch.rows)
      merged.set(row.conversation_id, row.visible === true);
  }
  return merged;
}

export function inboxVisibilityBatches(ids: Iterable<string>): string[][] {
  const unique = [...new Set(ids)].sort();
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += SUPPORT_INBOX_BATCH_SIZE)
    batches.push(unique.slice(i, i + SUPPORT_INBOX_BATCH_SIZE));
  return batches;
}

export function visibleInboxIds(
  rows: Iterable<InboxVisibilityRow>,
): Set<string> {
  return new Set(
    [...rows]
      .filter((row) => row.visible === true)
      .map((row) => row.conversation_id),
  );
}

export function isInboxChange(value: unknown, organizationId: string): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).organization_id === organizationId
  );
}

type InboxConversationFields = {
  status: string;
  organization_address: string;
  assigned_agent_id: string | null;
  routing_queue_id: string | null;
};

export function inboxMembershipChanged(
  previous: InboxConversationFields | undefined,
  current: InboxConversationFields,
): boolean {
  return (
    !previous ||
    previous.status !== current.status ||
    previous.organization_address !== current.organization_address ||
    previous.assigned_agent_id !== current.assigned_agent_id ||
    previous.routing_queue_id !== current.routing_queue_id
  );
}
