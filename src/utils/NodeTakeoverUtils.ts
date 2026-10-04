import {
  canTakeOverNodeConversation,
  conversationRetry,
  type NodeConversationSnapshot,
} from "./NodeConversationUtils";

export type TakeoverBody = {
  organization_id: string;
  request_id: string;
  expected_revision: string;
  observed_last_inbound_wamid: string;
};
export type ConversationActionRequest = {
  key: string;
  id: string;
  body?: TakeoverBody;
};
type ActionResult = { request_id: string; status: string; last_error?: string };

// Refresh before reservation. Retry only explicit, pre-reservation state
// conflicts, not network timeouts, permissions, competing claims or send guards.
export async function performTakeover(options: {
  scope: string;
  organizationId: string;
  supportRequestId: string;
  request: { current: ConversationActionRequest | null };
  snapshot: () => Promise<NodeConversationSnapshot>;
  submit: (body: TakeoverBody) => Promise<ActionResult>;
  ensureScope: () => void;
  sleep?: (ms: number) => Promise<void>;
  uuid?: () => string;
}) {
  const sleep =
    options.sleep ??
    ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const uuid = options.uuid ?? (() => crypto.randomUUID());
  for (let attempt = 0; attempt < 4; attempt++) {
    options.ensureScope();
    const snapshot = await options.snapshot();
    options.ensureScope();
    if (
      snapshot.operation?.request_id === options.request.current?.id &&
      snapshot.operation?.status === "succeeded" &&
      snapshot.operation.action === "takeover"
    )
      return { request_id: snapshot.operation.request_id, status: "succeeded" };
    if (snapshot.support_request?.id !== options.supportRequestId)
      throw new Error(
        "Support request changed. Refresh and review this conversation.",
      );
    if (snapshot.takeover_sync_pending) {
      if (attempt === 3)
        throw new Error(
          "Support request is still synchronizing. Please wait for the takeover button to become available.",
        );
      await sleep([300, 700, 1500][attempt]);
      continue;
    }
    const retry = conversationRetry(snapshot, "takeover");
    if (!retry && !canTakeOverNodeConversation(snapshot))
      throw new Error(
        "Takeover is no longer available. Refresh to see who is handling this conversation.",
      );
    const key = `${options.scope}:takeover:${options.supportRequestId}:${snapshot.revision}`;
    if (retry) {
      options.request.current = {
        key,
        id: retry.request_id,
        body: {
          organization_id: options.organizationId,
          request_id: retry.request_id,
          expected_revision: retry.expected_revision,
          observed_last_inbound_wamid: retry.observed_last_inbound_wamid,
        },
      };
    } else if (
      options.request.current?.key !== key ||
      !options.request.current.body
    ) {
      const id = uuid();
      options.request.current = {
        key,
        id,
        body: {
          organization_id: options.organizationId,
          request_id: id,
          expected_revision: snapshot.revision!,
          observed_last_inbound_wamid: snapshot.last_inbound_wamid!,
        },
      };
    }
    options.ensureScope();
    try {
      return await options.submit(options.request.current!.body!);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : undefined;
      if (
        attempt === 3 ||
        !["OWNERSHIP_CHANGED", "SUPPORT_STATE_CHANGED"].includes(String(code))
      )
        throw error;
      await sleep([300, 700, 1500][attempt]);
    }
  }
  throw new Error("Unable to synchronize takeover");
}
