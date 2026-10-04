export type NodeConversationSnapshot = {
  enabled: boolean;
  revision?: string;
  state?: "human_owned" | "closed" | "bot_ready" | "bot_active";
  last_inbound_wamid?: string;
  pending_request_id?: string | null;
  can_resolve?: boolean;
  can_resume?: boolean;
  takeover_enabled?: boolean;
  takeover_sync_pending?: boolean;
  can_takeover?: boolean;
  support_request?: {
    id: string;
    status: "waiting" | "handling" | "resolved" | "released";
    reason: string;
    requested_at: string;
    source_wamid: string;
    target: { routing_queue_id: string } | { agent_id: string };
    handled_by_agent_id?: string;
  };
  operation?: {
    request_id: string;
    status: string;
    last_error: string | null;
    action: "resolve-and-close" | "resume" | "takeover";
    expected_revision: string;
    observed_last_inbound_wamid: string;
    actor_is_current?: boolean;
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
  action: "resolve-and-close" | "resume" | "takeover",
) {
  const operation = snapshot.operation;
  return operation &&
    operation.actor_is_current !== false &&
    operation.action === action &&
    operation.status !== "succeeded" &&
    (snapshot.pending_request_id === operation.request_id ||
      (operation.expected_revision === snapshot.revision &&
        (action === "takeover" ||
          operation.observed_last_inbound_wamid ===
            snapshot.last_inbound_wamid)))
    ? operation
    : null;
}

export function canTakeOverNodeConversation(
  snapshot?: NodeConversationSnapshot,
) {
  return Boolean(
    snapshot?.enabled &&
      snapshot.takeover_enabled &&
      snapshot.can_takeover &&
      !snapshot.takeover_sync_pending &&
      snapshot.support_request?.status === "waiting" &&
      snapshot.state !== "human_owned" &&
      !snapshot.pending_request_id &&
      snapshot.revision &&
      snapshot.last_inbound_wamid,
  );
}
