import assert from "node:assert/strict";
import test from "node:test";
import {
  lifecyclePollInterval,
  reconcileLifecycleRead,
  nodeHumanSendingBlocked,
  type NodeConversationSnapshot,
} from "../src/utils/NodeConversationUtils.ts";
import {
  mergeInboxVisibility,
  inboxMembershipChanged,
} from "../src/utils/SupportInboxUtils.ts";

test("missing Node mapping and waiting support poll until takeover becomes available", () => {
  assert.equal(
    lifecyclePollInterval({ enabled: false, awaiting_mapping: true }),
    2000,
  );
  assert.equal(lifecyclePollInterval({ enabled: false }), false);
  assert.equal(
    lifecyclePollInterval({
      enabled: true,
      support_request: { status: "waiting" },
    } as NodeConversationSnapshot),
    2000,
  );
});
test("accepted first-click closure remains fenced across stale reads until its own completion", () => {
  const pending: NodeConversationSnapshot = {
    enabled: true,
    state: "human_owned",
    optimistic_action: "resolve-and-close",
    pending_request_id: "close-1",
  };
  const stale: NodeConversationSnapshot = {
    enabled: true,
    state: "human_owned",
    pending_request_id: null,
  };
  const retained = reconcileLifecycleRead(pending, stale, false);
  assert.equal(retained.pending_request_id, "close-1");
  assert.equal(
    nodeHumanSendingBlocked({
      lifecycle_enabled: true,
      human_owned: true,
      pending_request_id: retained.pending_request_id!,
    }),
    true,
  );
  const old = {
    ...stale,
    operation: { request_id: "close-old", status: "succeeded" },
  } as NodeConversationSnapshot;
  assert.equal(
    reconcileLifecycleRead(pending, old, false).pending_request_id,
    "close-1",
  );
  const closed = {
    ...stale,
    state: "closed",
    operation: { request_id: "close-1", status: "succeeded" },
  } as NodeConversationSnapshot;
  assert.deepEqual(reconcileLifecycleRead(pending, closed, false), closed);
});
test("definite failed action and unaccepted preflight release their local loading fence", () => {
  const fresh: NodeConversationSnapshot = {
    enabled: true,
    state: "human_owned",
    operation: { request_id: "one", status: "failed" },
  } as NodeConversationSnapshot;
  assert.deepEqual(
    reconcileLifecycleRead(
      {
        ...fresh,
        optimistic_action: "resolve-and-close",
        pending_request_id: "one",
      },
      fresh,
      false,
    ),
    fresh,
  );
  assert.deepEqual(
    reconcileLifecycleRead(
      {
        ...fresh,
        optimistic_action: "resolve-and-close",
        pending_request_id: "submitting",
      },
      fresh,
      false,
    ),
    fresh,
  );
});
test("inbox presentation follows confirmed visibility without deleting message history", () => {
  const previous = new Map([
    ["bot", false],
    ["support", true],
    ["closed", true],
  ]);
  const result = mergeInboxVisibility(previous, [
    {
      ids: ["bot", "support", "closed"],
      rows: [
        { conversation_id: "bot", visible: false },
        { conversation_id: "support", visible: true },
        { conversation_id: "closed", visible: true },
      ],
    },
  ]);
  assert.equal(result.get("bot"), false);
  assert.equal(result.get("support"), true);
  assert.equal(result.get("closed"), true);
  assert.equal(
    inboxMembershipChanged(
      {
        status: "active",
        organization_address: "number",
        assigned_agent_id: null,
        routing_queue_id: null,
      },
      {
        status: "active",
        organization_address: "number",
        assigned_agent_id: "agent",
        routing_queue_id: null,
      },
    ),
    true,
  );
});
