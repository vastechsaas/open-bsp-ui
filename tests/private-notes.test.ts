import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { MessageRow } from "../src/supabase/client.ts";
import {
  canComposePrivateNote,
  canSendCustomerReply,
  isPrivateNote,
} from "../src/utils/PrivateNoteUtils.ts";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function message(
  direction: MessageRow["direction"],
  kind: "text" | "private_note",
): MessageRow {
  return {
    direction,
    content: {
      version: "1",
      type: "text",
      kind,
      text: "hello",
      ...(kind === "private_note" ? { mentioned_agent_ids: [] } : {}),
    },
  } as MessageRow;
}

void test("private notes are explicitly identified as internal note messages", () => {
  assert.equal(isPrivateNote(message("internal", "private_note")), true);
  assert.equal(isPrivateNote(message("internal", "text")), false);
  assert.equal(isPrivateNote(message("outgoing", "text")), false);
});

void test("note composition is active-conversation only and ignores assignment", () => {
  assert.equal(canComposePrivateNote("active"), true);
  assert.equal(canComposePrivateNote("closed"), false);
  assert.equal(canComposePrivateNote("spam"), false);
});

void test("customer replies remain assignment-gated for Agent users", () => {
  assert.equal(canSendCustomerReply("member", "member", null), true);
  assert.equal(canSendCustomerReply("agent", "sara", "sara"), true);
  assert.equal(canSendCustomerReply("agent", "sara", "ali"), false);
  assert.equal(canSendCustomerReply("agent", "sara", null), false);
});

void test("the composer keeps separate per-conversation customer and note drafts", () => {
  const slice = readSource("../src/stores/chatSlice.ts");
  const footer = readSource("../src/components/ChatFooter.tsx");
  const composer = readSource("../src/components/PrivateNoteComposer.tsx");

  assert.match(slice, /textDrafts: Map<string, string>/);
  assert.match(slice, /privateNoteDrafts: Map<string, PrivateNoteDraft>/);
  assert.match(footer, /privateNoteMode/);
  assert.match(composer, /bg-amber-100/);
  assert.match(composer, /createNote\.mutateAsync/);
  assert.doesNotMatch(composer, /type="file"|TemplatePicker|pushMessageToDb/);
});

void test("private notes remain visible while ordinary internal tools stay role-filtered", () => {
  const chat = readSource("../src/components/Chat.tsx");
  const messageComponent = readSource("../src/components/Message/Message.tsx");

  assert.match(chat, /if \(isPrivateNote\(m\)\) return true/);
  assert.match(chat, /if \(m\.direction === "internal"\) return false/);
  assert.match(messageComponent, /authorName/);
  assert.match(messageComponent, /border-amber-300 bg-amber-100/);
});

void test("private notes cannot replace or reorder ordinary queue previews", () => {
  const list = readSource("../src/components/ChatList.tsx");
  const item = readSource("../src/components/ChatListItem.tsx");

  assert.match(list, /if \(!isPrivateNote\(message\)\) return message/);
  assert.match(item, /!isPrivateNote\(m\)/);
});
