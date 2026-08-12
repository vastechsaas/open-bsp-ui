import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createChatbotNode,
  updateChatbotAssignAgent,
  updateChatbotHandoffQueue,
} from "../src/utils/ChatbotFlowUtils.ts";
import { conversationQueueFilters } from "../src/stores/uiSlice.ts";
import type { ConversationRow } from "../src/supabase/client.ts";

const QUEUE_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";

function conversation(
  overrides: Partial<ConversationRow> = {},
): ConversationRow {
  return {
    assigned_agent_id: null,
    contact_address: "15551234567",
    created_at: "2026-08-12T00:00:00.000Z",
    extra: null,
    group_address: null,
    id: "33333333-3333-4333-8333-333333333333",
    name: "VIP Customer",
    organization_address: "15557654321",
    organization_id: "44444444-4444-4444-8444-444444444444",
    routed_at: "2026-08-12T00:01:00.000Z",
    routing_queue_id: QUEUE_ID,
    service: "whatsapp",
    status: "active",
    updated_at: "2026-08-12T00:01:00.000Z",
    ...overrides,
  };
}

void test("VIP queue composes with Pending and Assigned lifecycle filters", () => {
  const pending = conversation();
  const assigned = conversation({ assigned_agent_id: AGENT_ID });

  assert.equal(conversationQueueFilters.pending(pending), true);
  assert.equal(pending.routing_queue_id === QUEUE_ID, true);
  assert.equal(
    conversationQueueFilters.assigned(assigned, [], {
      role: "agent",
      currentAgentId: AGENT_ID,
    }),
    true,
  );
  assert.equal(assigned.routing_queue_id === QUEUE_ID, true);
});

void test("new handoffs use a queue while legacy Agent handoffs remain readable", () => {
  const handoff = createChatbotNode(
    "assign_agent",
    { x: 100, y: 100 },
    "handoff",
  );
  const routed = updateChatbotHandoffQueue(handoff, QUEUE_ID);
  const legacy = updateChatbotAssignAgent(handoff, AGENT_ID);

  assert.deepEqual(routed.data.config, { routing_queue_id: QUEUE_ID });
  assert.deepEqual(legacy.data.config, { agent_id: AGENT_ID });
});

void test("settings, queue picker, and Mentioned-global behavior are wired", () => {
  const settings = readFileSync(
    new URL("../src/routes/_auth/settings/routing-queues.tsx", import.meta.url),
    "utf8",
  );
  const filter = readFileSync(
    new URL("../src/components/ChatFilter.tsx", import.meta.url),
    "utf8",
  );
  const list = readFileSync(
    new URL("../src/components/ChatList.tsx", import.meta.url),
    "utf8",
  );

  assert.match(settings, /useCreateRoutingQueue/);
  assert.match(settings, /useUpdateRoutingQueue/);
  assert.match(settings, /owner.*admin.*supervisor/s);
  assert.match(filter, /Todas las colas/);
  assert.match(list, /isMentionedQueue \|\|\s+routingQueueId === null/s);
});
