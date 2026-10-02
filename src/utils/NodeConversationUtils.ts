export type NodeConversationSnapshot = {
  enabled: boolean;
  revision?: string;
  state?: "human_owned" | "closed" | "bot_ready" | "bot_active";
  last_inbound_wamid?: string;
  pending_request_id?: string | null;
  can_resolve?: boolean;
  can_resume?: boolean;
  operation?: {
    request_id: string;
    status: string;
    last_error: string | null;
    action: "resolve-and-close" | "resume";
    expected_revision: string;
    observed_last_inbound_wamid: string;
  } | null;
};

export function isConversationManager(role?: string) {
  return role === "owner" || role === "admin" || role === "supervisor";
}

export function nodeHumanSendingBlocked(
  mapping?: {
    lifecycle_enabled: boolean;
    human_owned: boolean;
    pending_request_id: string | null;
  } | null,
) {
  return Boolean(
    mapping?.lifecycle_enabled &&
      (!mapping.human_owned || mapping.pending_request_id),
  );
}

export function canResolveNodeConversation(
  snapshot?: NodeConversationSnapshot,
  renderedInboundWamids: readonly string[] = [],
) {
  return Boolean(
    snapshot?.enabled &&
      snapshot.state === "human_owned" &&
      snapshot.can_resolve &&
      !snapshot.pending_request_id &&
      snapshot.last_inbound_wamid &&
      snapshot.revision &&
      renderedInboundWamids.includes(snapshot.last_inbound_wamid),
  );
}

export function conversationRetry(
  snapshot: NodeConversationSnapshot,
  action: "resolve-and-close" | "resume",
) {
  const operation = snapshot.operation;
  return operation &&
    operation.action === action &&
    operation.status !== "succeeded" &&
    (snapshot.pending_request_id === operation.request_id ||
      (operation.expected_revision === snapshot.revision &&
        operation.observed_last_inbound_wamid === snapshot.last_inbound_wamid))
    ? operation
    : null;
}
