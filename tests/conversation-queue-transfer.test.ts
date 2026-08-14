import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canTransferConversationToQueue } from "../src/utils/QueueTransferUtils.ts";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

void test("only the assigned Agent and assignment managers can transfer an active conversation", () => {
  const eligibility = (
    role: string,
    assignedAgentId: string | null,
    conversationStatus = "active",
  ) =>
    canTransferConversationToQueue({
      role,
      currentAgentId: "ali",
      assignedAgentId,
      conversationStatus,
    });

  assert.equal(eligibility("agent", "ali"), true);
  assert.equal(eligibility("agent", "sara"), false);
  assert.equal(eligibility("agent", null), false);
  assert.equal(eligibility("owner", "sara"), true);
  assert.equal(eligibility("admin", null), true);
  assert.equal(eligibility("supervisor", "ali"), true);
  assert.equal(eligibility("member", "ali"), false);
  assert.equal(eligibility("owner", "ali", "closed"), false);
  assert.equal(
    canTransferConversationToQueue({
      role: "owner",
      currentAgentId: null,
      assignedAgentId: "ali",
      conversationStatus: "active",
    }),
    false,
  );
});

void test("the chat header owns the explicit queue-transfer action", () => {
  const header = readSource("../src/components/ChatHeader.tsx");

  assert.match(header, /canTransferConversationToQueue/);
  assert.match(header, /Transferir a cola/);
  assert.match(header, /QueueTransferDialog/);
  assert.match(header, /setQueueTransferOpen\(true\)/);
});

void test("the dialog requires a destination and explanation before transfer", () => {
  const dialog = readSource("../src/components/QueueTransferDialog.tsx");

  assert.match(dialog, /targetQueueId/);
  assert.match(dialog, /explanation\.trim\(\)/);
  assert.match(dialog, /Cola de destino/);
  assert.match(dialog, /Explicación/);
  assert.match(dialog, /quedará sin asignar en la cola de destino/);
  assert.match(
    dialog,
    /transfer\.isPending \|\| !targetQueueId \|\| !explanation\.trim\(\)/,
  );
});

void test("the UI uses the conversation-specific queue RPC and structured transfer RPC", () => {
  const query = readSource("../src/queries/useRoutingQueues.ts");
  const dialog = readSource("../src/components/QueueTransferDialog.tsx");

  assert.match(query, /list_transferable_routing_queue_options/);
  assert.match(query, /p_conversation_id: conversationId/);
  assert.match(query, /transfer_conversation_to_queue_with_private_note/);
  assert.match(query, /p_target_routing_queue_id: targetRoutingQueueId/);
  assert.match(dialog, /targetRoutingQueueId: targetQueueId/);
  assert.doesNotMatch(`${query}\n${dialog}`, /<transfer>|\/transfer/i);
});

void test("success reconciles locally and only returns Agents to the list", () => {
  const dialog = readSource("../src/components/QueueTransferDialog.tsx");

  assert.match(dialog, /pushConversations\(\[result\.conversation\]\)/);
  assert.match(dialog, /pushMessages\(\[result\.note\]\)/);
  assert.match(dialog, /currentAgent\?\.extra\?\.role === "agent"/);
  assert.match(dialog, /removeConversations\(\[result\.conversation\.id\]\)/);
  assert.match(dialog, /navigate\(\{ to: "\/conversations", hash: "" \}\)/);
  assert.match(dialog, /else \{\s*onClose\(\)/s);
});

void test("routing-transfer notes render queue history and preserve the explanation", () => {
  const message = readSource("../src/components/Message/Message.tsx");
  const messageTypes = readSource("../src/supabase/types/message_types.ts");

  assert.match(messageTypes, /routing_transfer\?:/);
  assert.match(messageTypes, /from_queue_name: string \| null/);
  assert.match(messageTypes, /to_queue_name: string/);
  assert.match(message, /privateNoteContent\?\.routing_transfer/);
  assert.match(message, /routingTransfer\.from_queue_name/);
  assert.match(message, /routingTransfer\.to_queue_name/);
  assert.match(message, /body=\{props\.message\.content\.text\}/);
});

void test("realtime continues reconciling queue and assignment changes without refresh", () => {
  const realtime = readSource("../src/hooks/useRealtimeSubscription.ts");

  assert.match(realtime, /conversation_state_changed/);
  assert.match(realtime, /reconcileConversation\(signal\.conversation_id\)/);
  assert.match(realtime, /pushConversations\(\[data as ConversationRow\]\)/);
  assert.match(realtime, /pushMessages\(messages as MessageRow\[\]\)/);
  assert.match(realtime, /removeConversations\(\[conversationId\]\)/);
});

void test("every supported locale includes the queue-transfer workflow", () => {
  const keys = [
    "Transferir a cola",
    "Transferir conversación a otra cola",
    "Cola de destino",
    "Explicación",
    "La conversación quedará sin asignar en la cola de destino.",
    "transfirió esta conversación de",
    "a la cola",
    "Sin cola",
  ];

  for (const locale of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readSource(`../public/locales/${locale}.json`),
    ) as Record<string, string>;

    for (const key of keys) {
      assert.ok(translations[key], `${locale} is missing ${key}`);
    }
  }
});
