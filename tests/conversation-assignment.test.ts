import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getConversationAssignee,
  getConversationAssigneeName,
  getConversationAssignmentAction,
} from "../src/utils/AssignmentUtils.ts";
import { toConversationQueueConfig } from "../src/utils/ConversationQueueUtils.ts";
import {
  conversationQueueFilters,
  filters,
  Filters,
  isArchived,
} from "../src/stores/uiSlice.ts";
import type {
  AgentRow,
  ConversationRow,
  MessageRow,
} from "../src/supabase/client.ts";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CURRENT_AGENT_ID = "00000000-0000-4000-8000-000000000002";
const OTHER_AGENT_ID = "00000000-0000-4000-8000-000000000003";

function conversation(
  overrides: Partial<ConversationRow> = {},
): ConversationRow {
  return {
    assigned_agent_id: null,
    contact_address: "15551234567",
    created_at: "2026-07-12T00:00:00.000Z",
    extra: null,
    group_address: null,
    id: "00000000-0000-4000-8000-000000000010",
    name: "Test Customer",
    organization_address: "15557654321",
    organization_id: ORG_ID,
    service: "whatsapp",
    status: "active",
    updated_at: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

function agent(id: string, name: string): AgentRow {
  return {
    ai: false,
    created_at: "2026-07-12T00:00:00.000Z",
    extra: { role: "member" },
    id,
    name,
    organization_id: ORG_ID,
    picture: null,
    updated_at: "2026-07-12T00:00:00.000Z",
    user_id: `10000000-0000-4000-8000-${id.slice(-12)}`,
  };
}

function message(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    agent_id: null,
    contact_address: "15551234567",
    content: {
      kind: "text",
      text: "hello",
      type: "text",
      version: "1",
    },
    conversation_id: "00000000-0000-4000-8000-000000000010",
    created_at: "2026-07-12T00:00:00.000Z",
    direction: "incoming",
    external_id: null,
    group_address: null,
    id: "00000000-0000-4000-8000-000000000020",
    organization_address: "15557654321",
    organization_id: ORG_ID,
    service: "whatsapp",
    status: { pending: "2026-07-12T00:00:00.000Z" },
    thread_id: null,
    timestamp: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as MessageRow;
}

void test("assignment actions expose only the delivered base controls", () => {
  assert.equal(
    getConversationAssignmentAction(conversation(), CURRENT_AGENT_ID),
    "assign-to-me",
  );
  assert.equal(
    getConversationAssignmentAction(
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      CURRENT_AGENT_ID,
    ),
    "unassign-from-me",
  );
  assert.equal(
    getConversationAssignmentAction(
      conversation({ assigned_agent_id: OTHER_AGENT_ID }),
      CURRENT_AGENT_ID,
    ),
    null,
  );
  assert.equal(getConversationAssignmentAction(conversation(), null), null);
});

void test("assignee display resolves the current assignee name from loaded agents", () => {
  const currentAgent = agent(CURRENT_AGENT_ID, "Goat");
  assert.equal(
    getConversationAssignee(
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      [currentAgent],
    ),
    currentAgent,
  );
  assert.equal(
    getConversationAssigneeName(
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      [agent(CURRENT_AGENT_ID, "Goat"), agent(OTHER_AGENT_ID, "Spider")],
    ),
    "Goat",
  );
  assert.equal(
    getConversationAssigneeName(conversation({ assigned_agent_id: null }), [
      agent(CURRENT_AGENT_ID, "Goat"),
    ]),
    undefined,
  );
  assert.equal(
    getConversationAssigneeName(
      conversation({ assigned_agent_id: OTHER_AGENT_ID }),
      [agent(CURRENT_AGENT_ID, "Goat")],
    ),
    undefined,
  );
  assert.equal(
    getConversationAssignee(
      conversation({ assigned_agent_id: OTHER_AGENT_ID }),
      [currentAgent],
    ),
    undefined,
  );
});

void test("mine and unassigned filters derive from conversation assignment state", () => {
  const incoming = message();

  assert.equal(
    filters[Filters.MINE](
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      incoming,
      { currentAgentId: CURRENT_AGENT_ID },
    ),
    true,
  );
  assert.equal(
    filters[Filters.MINE](
      conversation({ assigned_agent_id: OTHER_AGENT_ID }),
      incoming,
      { currentAgentId: CURRENT_AGENT_ID },
    ),
    false,
  );
  assert.equal(
    filters[Filters.MINE](
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      incoming,
      { currentAgentId: null },
    ),
    false,
  );
  assert.equal(filters[Filters.UNASSIGNED](conversation(), incoming), true);
  assert.equal(
    filters[Filters.UNASSIGNED](
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      incoming,
    ),
    false,
  );
});

void test("existing conversation filters keep their current behavior", () => {
  const incoming = message();
  const outgoing = message({
    direction: "outgoing",
    status: { sent: "2026-07-12T00:00:00.000Z" },
  });
  const oldIncoming = message({
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  });
  const archived = conversation({
    extra: { archived: new Date(Date.now() + 1000).toISOString() },
  });

  assert.equal(filters[Filters.ALL](conversation(), incoming), true);
  assert.equal(filters[Filters.UNREAD](conversation(), incoming), true);
  assert.equal(filters[Filters.UNREAD](conversation(), outgoing), false);
  assert.equal(filters[Filters.H24](conversation(), incoming), true);
  assert.equal(filters[Filters.H24](conversation(), oldIncoming), false);
  assert.equal(isArchived(archived, incoming), true);
  assert.equal(filters[Filters.ARCHIVED](archived, incoming), true);
  assert.equal(filters[Filters.ALL](archived, incoming), false);
});

void test("backend conversation queue keys derive from base conversation state", () => {
  const freshIncoming = message({
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  });
  const oldIncoming = message({
    timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  });
  const outgoing = message({
    direction: "outgoing",
    status: { sent: "2026-07-12T00:00:00.000Z" },
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  });

  assert.equal(
    conversationQueueFilters.all_active(conversation(), [freshIncoming]),
    true,
  );
  assert.equal(
    conversationQueueFilters.assigned(
      conversation({ assigned_agent_id: CURRENT_AGENT_ID }),
      [freshIncoming],
    ),
    true,
  );
  assert.equal(
    conversationQueueFilters.pending(conversation(), [freshIncoming]),
    true,
  );
  assert.equal(
    conversationQueueFilters.spam(conversation({ status: "spam" }), [
      freshIncoming,
    ]),
    true,
  );
  assert.equal(
    conversationQueueFilters.closed(conversation({ status: "closed" }), [
      freshIncoming,
    ]),
    true,
  );
  assert.equal(
    conversationQueueFilters.expired(conversation(), [oldIncoming, outgoing]),
    true,
  );
  assert.equal(
    conversationQueueFilters.expired(conversation(), [freshIncoming, outgoing]),
    false,
  );
});

void test("backend conversation queue config controls visible tab labels and order", () => {
  const queues = toConversationQueueConfig([
    {
      key: "pending",
      label: "Pending",
      order: 3,
      enabled: true,
    },
    {
      key: "mentioned",
      label: "Mentioned",
      order: 7,
      enabled: true,
    },
    {
      key: "all_active",
      label: "All (active)",
      order: 1,
      enabled: true,
    },
    {
      key: "assigned",
      label: "Assigned",
      order: 2,
      enabled: false,
    },
    {
      key: "spam",
      label: "Spam",
      order: 4,
      enabled: true,
    },
  ]);

  assert.deepEqual(
    queues.map((queue) => queue.key),
    ["all_active", "pending", "spam"],
  );
  assert.deepEqual(
    queues.map((queue) => queue.label),
    ["All (active)", "Pending", "Spam"],
  );
});

void test("empty conversation queue message is translated in every supported locale", () => {
  const expected = {
    en: "No conversations in",
    pt: "Não há conversas em",
    fr: "Aucune conversation dans",
    sw: "Hakuna mazungumzo katika",
  };

  for (const [language, translation] of Object.entries(expected)) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;

    assert.equal(translations["No hay conversaciones en"], translation);
  }
});
