import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canAccessNavigation,
  getDefaultPathForRole,
} from "../src/utils/RoleAccess.ts";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("Agent defaults to Conversations and only gains read-only media settings", () => {
  assert.equal(getDefaultPathForRole("agent"), "/conversations");
  assert.equal(canAccessNavigation("agent", "conversations"), true);
  assert.equal(canAccessNavigation("agent", "contacts"), true);
  for (const access of [
    "dashboard",
    "teamMembers",
    "campaigns",
    "templates",
    "chatbots",
    "integrations",
    "stats",
    "whatsappManager",
  ] as const) {
    assert.equal(canAccessNavigation("agent", access), false, access);
  }
  assert.equal(canAccessNavigation("agent", "settings"), true);
});

void test("Agent customer replies stay assignment-gated while private notes remain available", () => {
  const footer = readSource("../src/components/ChatFooter.tsx");
  const actions = readSource("../src/components/ItemActions.tsx");
  assert.match(footer, /isAgent && !customerReplyAllowed/);
  assert.match(footer, /<PrivateNoteComposer conversationId=\{activeConvId\}/);
  assert.match(footer, /Asígnate esta conversación para responder/);
  assert.match(actions, /assignConversationToMe/);
  assert.match(actions, /unassignConversationFromMe/);
  assert.match(actions, /const isPendingAgent/);
  assert.match(actions, /isPendingAgent\s*\? \[\]/);
});

void test("Agent cannot send as contact but keeps approved-template composer access", () => {
  const footer = readSource("../src/components/ChatFooter.tsx");
  const previewer = readSource("../src/components/FilePreviewer.tsx");
  const picker = readSource("../src/components/TemplatePicker.tsx");
  assert.match(footer, /const sendAsContact = !isAgent && storedSendAsContact/);
  assert.match(previewer, /agent\?\.extra\?\.role !== "agent"/);
  assert.match(footer, /templatePicker && <TemplatePicker \/>/);
  assert.match(picker, /status === "APPROVED"/);
});

void test("Agent-created conversations use the atomic self-assignment RPC", () => {
  const route = readSource("../src/routes/_auth/conversations/new.tsx");
  const utilities = readSource("../src/utils/ConversationUtils.ts");
  assert.match(route, /currentAgent\?\.extra\?\.role === "agent"/);
  assert.match(route, /createConversationForMe\(conversation\)/);
  assert.match(utilities, /supabase\.rpc\("create_conversation_for_me"/);
});

void test("manager assignment menu targets accepted Agent users only", () => {
  const actions = readSource("../src/components/ItemActions.tsx");
  assert.match(actions, /canManageConversationAssignments/);
  assert.match(actions, /agent\.extra\?\.role !== "agent"/);
  assert.match(actions, /agent\.extra\.invitation\.status === "accepted"/);
  assert.match(actions, /setConversationAgentAssignment/);
  assert.match(actions, /currentAssigneeIsAgent/);
});

void test("Agent role and assignment prompt labels exist in every supported locale", () => {
  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readSource(`../public/locales/${language}.json`),
    ) as Record<string, string>;
    assert.ok(translations.Agente, language);
    assert.ok(
      translations["Asígnate esta conversación para responder"],
      language,
    );
  }
});
