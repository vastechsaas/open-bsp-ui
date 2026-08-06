import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  addMentionedAgentId,
  findActiveMention,
  insertMention,
} from "../src/utils/MentionUtils.ts";
import { CONVERSATION_QUEUE_KEYS } from "../src/types/conversationQueues.ts";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

void test("mention parsing inserts display text while retaining distinct IDs", () => {
  const first = findActiveMention("Please check @sa", 16);
  assert.deepEqual(first, { start: 13, end: 16, query: "sa" });

  const inserted = insertMention("Please check @sa", first!, "Sara Khan");
  assert.equal(inserted.text, "Please check @Sara Khan ");
  assert.deepEqual(addMentionedAgentId([], "sara"), ["sara"]);
  assert.deepEqual(addMentionedAgentId(["sara"], "sara"), ["sara"]);
  assert.deepEqual(addMentionedAgentId(["sara"], "ali"), ["sara", "ali"]);
});

void test("Mentioned is a first-class queue resolved outside local filters", () => {
  const uiSlice = readSource("../src/stores/uiSlice.ts");

  assert.ok(CONVERSATION_QUEUE_KEYS.includes("mentioned"));
  assert.match(uiSlice, /mentioned: \(\) => false/);
});

void test("Mentioned uses the paginated backend RPC and preserves its row order", () => {
  const queries = readSource("../src/queries/usePrivateNotes.ts");
  const list = readSource("../src/components/ChatList.tsx");

  assert.match(queries, /list_mentioned_conversations_page/);
  assert.match(queries, /p_page_size: 50/);
  assert.match(queries, /useInfiniteQuery/);
  assert.match(list, /mentionedRows\.map\(\(row\) => row\.id\)/);
  assert.doesNotMatch(list, /mentionedRows\.sort/);
});

void test("Mentioned has no unread or count badge", () => {
  const filter = readSource("../src/components/ChatFilter.tsx");
  const item = readSource("../src/components/ChatListItem.tsx");

  assert.doesNotMatch(filter, /total_count|unread|badge/i);
  assert.match(item, /!isMentionedQueue && unread\.count > 0/);
  assert.match(item, /!isMentionedQueue && unread\.notification/);
});

void test("opening Mentioned hydrates up to 100 messages before navigation", () => {
  const queries = readSource("../src/queries/usePrivateNotes.ts");
  const item = readSource("../src/components/ChatListItem.tsx");

  assert.match(queries, /\.limit\(100\)/);
  assert.match(item, /fetchMentionedConversationMessages/);
  assert.match(item, /pushMessages\(hydratedMessages\)/);
  assert.match(
    item,
    /await navigate\(\{ to: "\/conversations", hash: itemId \}\)/,
  );
});

void test("realtime private mentions invalidate every Mentioned search page", () => {
  const realtime = readSource("../src/hooks/useRealtimeSubscription.ts");

  assert.match(realtime, /isPrivateNote\(message\)/);
  assert.match(realtime, /mentioned_agent_ids\.includes\(currentAgentId\)/);
  assert.match(realtime, /mentionedConversationsRoot/);
  assert.match(realtime, /invalidateQueries/);
});

void test("the picker uses backend-approved humans and stores multiple IDs", () => {
  const composer = readSource("../src/components/PrivateNoteComposer.tsx");
  const query = readSource("../src/queries/usePrivateNotes.ts");

  assert.match(composer, /useMentionableHumans\(\)/);
  assert.match(composer, /addMentionedAgentId/);
  assert.match(composer, /mentionedAgentIds/);
  assert.match(query, /list_mentionable_humans_page/);
  assert.doesNotMatch(composer, /availability|online/i);
});
