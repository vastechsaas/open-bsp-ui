import assert from "node:assert/strict";
import test from "node:test";
import {
  performTakeover,
  type ConversationActionRequest,
  type TakeoverBody,
} from "../src/utils/NodeTakeoverUtils.ts";
import {
  createChatbotManagementError,
  ChatbotConversationConflictError,
} from "../src/utils/ChatbotFlowUtils.ts";
import { type NodeConversationSnapshot } from "../src/utils/NodeConversationUtils.ts";

const ready: NodeConversationSnapshot = {
  enabled: true,
  takeover_enabled: true,
  can_takeover: true,
  state: "bot_ready",
  revision: "10",
  last_inbound_wamid: "wamid.one",
  support_request: {
    id: "request-1",
    status: "waiting",
    reason: "Help",
    requested_at: "now",
    source_wamid: "wamid.original",
    target: { routing_queue_id: "mobile" },
  },
};
function fixture(snapshots: NodeConversationSnapshot[] = [ready]) {
  const bodies: TakeoverBody[] = [],
    delays: number[] = [];
  let reads = 0,
    ids = 0;
  const options = {
    scope: "user:org:conversation",
    organizationId: "org",
    supportRequestId: "request-1",
    request: { current: null } as { current: ConversationActionRequest | null },
    snapshot: () =>
      Promise.resolve(snapshots[Math.min(reads++, snapshots.length - 1)]),
    submit: (body: TakeoverBody) => {
      bodies.push({ ...body });
      return Promise.resolve({
        request_id: body.request_id,
        status: "succeeded",
      });
    },
    ensureScope: () => {},
    sleep: (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    },
    uuid: () => `id-${++ids}`,
  };
  return { options, bodies, delays };
}

void test("click waits for synchronized support state, then submits exactly once", async () => {
  const f = fixture([
    { ...ready, takeover_sync_pending: true, can_takeover: false },
    ready,
  ]);
  await performTakeover(f.options);
  assert.equal(f.bodies.length, 1);
  assert.deepEqual(f.delays, [300]);
});
void test("fresh preflight and structured pre-reservation conflict recover without another click", async () => {
  const f = fixture([ready, { ...ready, revision: "11" }]);
  let posts = 0;
  f.options.submit = (body) => {
    f.bodies.push({ ...body });
    if (posts++ === 0)
      return Promise.reject(
        new ChatbotConversationConflictError(
          "state changed",
          "OWNERSHIP_CHANGED",
        ),
      );
    return Promise.resolve({
      request_id: body.request_id,
      status: "succeeded",
    });
  };
  await performTakeover(f.options);
  assert.deepEqual(
    f.bodies.map((b) => b.expected_revision),
    ["10", "11"],
  );
  assert.equal(f.delays.length, 1);
});
void test("network ambiguity is not retried automatically; later click keeps exact ID and payload despite new inbound", async () => {
  const f = fixture();
  f.options.submit = (body) => {
    f.bodies.push({ ...body });
    return Promise.reject(new Error("network timeout"));
  };
  await assert.rejects(performTakeover(f.options), /network/);
  assert.equal(f.bodies.length, 1);
  f.options.snapshot = () =>
    Promise.resolve({
      ...ready,
      last_inbound_wamid: "wamid.two",
    });
  await assert.rejects(performTakeover(f.options), /network/);
  assert.deepEqual(f.bodies[0], f.bodies[1]);
});
void test("durable pending retry preserves server's ID and original observed message", async () => {
  const f = fixture([
    {
      ...ready,
      can_takeover: false,
      pending_request_id: "durable",
      operation: {
        request_id: "durable",
        action: "takeover",
        status: "reconciling",
        last_error: null,
        expected_revision: "10",
        observed_last_inbound_wamid: "wamid.old",
        actor_is_current: true,
      },
    },
  ]);
  await performTakeover(f.options);
  assert.equal(f.bodies[0].request_id, "durable");
  assert.equal(f.bodies[0].observed_last_inbound_wamid, "wamid.old");
});
void test("competing actor, human takeover or a new support request never gets automatically claimed", async () => {
  for (const snapshot of [
    { ...ready, state: "human_owned" as const, can_takeover: false },
    {
      ...ready,
      support_request: { ...ready.support_request!, id: "request-2" },
    },
    {
      ...ready,
      can_takeover: false,
      pending_request_id: "other",
      operation: {
        request_id: "other",
        action: "takeover" as const,
        status: "pending",
        last_error: null,
        expected_revision: "10",
        observed_last_inbound_wamid: "wamid.old",
        actor_is_current: false,
      },
    },
  ]) {
    const f = fixture([snapshot]);
    await assert.rejects(performTakeover(f.options));
    assert.equal(f.bodies.length, 0);
  }
});
void test("bounded sync waits and pending-send/access errors are not blind retries", async () => {
  const syncing = fixture([
    { ...ready, takeover_sync_pending: true, can_takeover: false },
  ]);
  await assert.rejects(performTakeover(syncing.options), /still synchronizing/);
  assert.equal(syncing.bodies.length, 0);
  assert.equal(syncing.delays.length, 3);
  for (const code of [
    "HUMAN_SEND_PENDING",
    "OPERATION_PENDING",
    "REQUEST_ID_REUSE",
    "FORBIDDEN",
  ]) {
    const f = fixture();
    f.options.submit = () =>
      Promise.reject(new ChatbotConversationConflictError("guard", code));
    await assert.rejects(performTakeover(f.options), /guard/);
    assert.equal(f.delays.length, 0);
  }
});
void test("conversation/account switch while fetching stops submission", async () => {
  const f = fixture();
  let checks = 0;
  f.options.ensureScope = () => {
    if (++checks === 2) throw Error("scope changed");
  };
  await assert.rejects(performTakeover(f.options), /scope changed/);
  assert.equal(f.bodies.length, 0);
});
void test("successful ambiguous request is reconciled without another POST", async () => {
  const f = fixture([
    {
      ...ready,
      state: "human_owned",
      support_request: { ...ready.support_request!, status: "handling" },
      operation: {
        request_id: "sent",
        action: "takeover",
        status: "succeeded",
        last_error: null,
        expected_revision: "10",
        observed_last_inbound_wamid: "wamid.one",
      },
    },
  ]);
  f.options.request.current = { key: "old", id: "sent" };
  assert.equal((await performTakeover(f.options)).status, "succeeded");
  assert.equal(f.bodies.length, 0);
});
void test("only structured conversation conflicts use takeover retry codes; draft conflicts remain unchanged", () => {
  const error = createChatbotManagementError(409, {
    message: "changed",
    cause: { code: "OWNERSHIP_CHANGED" },
  });
  assert.ok(error instanceof ChatbotConversationConflictError);
  assert.equal(error.code, "OWNERSHIP_CHANGED");
  assert.equal(
    createChatbotManagementError(409, { message: "draft conflict" }).name,
    "ChatbotDraftConflictError",
  );
});
