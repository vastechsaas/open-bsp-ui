import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPrivateNoteTransferTarget } from "../src/utils/PrivateNoteUtils.ts";
import { toConversationStateSignal } from "../src/utils/ConversationRealtimeUtils.ts";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const sara = { id: "sara", name: "Sara", role: "agent" };

void test("an assigned Agent can transfer to one mentioned Agent with an explanation", () => {
  assert.deepEqual(
    getPrivateNoteTransferTarget({
      role: "agent",
      currentAgentId: "ali",
      assignedAgentId: "ali",
      text: "Please continue with the marketing setup",
      selectedHumans: [sara],
    }),
    sara,
  );
});

void test("transfer eligibility rejects every incomplete or unauthorized UI state", () => {
  const eligibility = (overrides: object) =>
    getPrivateNoteTransferTarget({
      role: "agent",
      currentAgentId: "ali",
      assignedAgentId: "ali",
      text: "Marketing context",
      selectedHumans: [sara],
      ...overrides,
    });

  assert.equal(eligibility({ role: "supervisor" }), undefined);
  assert.equal(eligibility({ assignedAgentId: "sara" }), undefined);
  assert.equal(eligibility({ text: "   " }), undefined);
  assert.equal(eligibility({ selectedHumans: [] }), undefined);
  assert.equal(
    eligibility({ selectedHumans: [sara, { ...sara, id: "omar" }] }),
    undefined,
  );
  assert.equal(
    eligibility({ selectedHumans: [{ ...sara, role: "supervisor" }] }),
    undefined,
  );
  assert.equal(
    eligibility({ selectedHumans: [{ ...sara, id: "ali" }] }),
    undefined,
  );
});

void test("the composer confirms and sends IDs through the structured transfer RPC", () => {
  const composer = readSource("../src/components/PrivateNoteComposer.tsx");
  const query = readSource("../src/queries/usePrivateNotes.ts");

  assert.match(composer, /Modal\.confirm/);
  assert.match(composer, /targetAgentId: transferTarget\.id/);
  assert.match(query, /transfer_conversation_with_private_note/);
  assert.match(query, /p_target_agent_id: targetAgentId/);
  assert.doesNotMatch(`${composer}\n${query}`, /[</]transfer>|\/transfer/i);
});

void test("a successful transfer clears Ali's draft and active conversation", () => {
  const composer = readSource("../src/components/PrivateNoteComposer.tsx");

  assert.match(composer, /pushMessages\(\[result\.note\]\)/);
  assert.match(composer, /removeConversations\(\[result\.conversation\.id\]\)/);
  assert.match(
    composer,
    /setDraft\(conversationId, \{ text: "", mentionedAgentIds: \[\] \}\)/,
  );
  assert.match(composer, /setActiveConv\(null\)/);
  assert.match(composer, /navigate\(\{ to: "\/conversations", hash: "" \}\)/);
});

void test("assignment signals are validated before queue reconciliation", () => {
  assert.deepEqual(
    toConversationStateSignal({
      organization_id: "org-1",
      conversation_id: "conversation-1",
      assigned_agent_id: "sara",
    }),
    {
      organization_id: "org-1",
      conversation_id: "conversation-1",
    },
  );
  assert.equal(
    toConversationStateSignal({ organization_id: "org-1" }),
    undefined,
  );
  assert.equal(toConversationStateSignal("conversation-1"), undefined);
});

void test("every open client securely reconciles assignment changes", () => {
  const realtime = readSource("../src/hooks/useRealtimeSubscription.ts");
  const chatSlice = readSource("../src/stores/chatSlice.ts");

  assert.match(realtime, /conversation-queue:\$\{activeOrgId\}/);
  assert.match(realtime, /config: \{ private: true \}/);
  assert.match(realtime, /conversation_state_changed/);
  assert.match(realtime, /\.maybeSingle\(\)/);
  assert.match(realtime, /removeConversations\(\[conversationId\]\)/);
  assert.match(chatSlice, /activeConvId: null/);
  assert.match(chatSlice, /messages\.delete\(conversationId\)/);
});

void test("structured transfer notes render the people and keep the explanation", () => {
  const chat = readSource("../src/components/Chat.tsx");
  const messageComponent = readSource("../src/components/Message/Message.tsx");

  assert.match(chat, /content\.transfer\.to_agent_id/);
  assert.match(messageComponent, /transferTargetName/);
  assert.match(messageComponent, /transfiri/);
  assert.match(messageComponent, /body=\{props\.message\.content\.text\}/);
  assert.match(messageComponent, /text-amber-800/);
});
