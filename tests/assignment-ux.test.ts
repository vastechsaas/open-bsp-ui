import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("Agent uses one loading-aware self-assignment action in header and footer", () => {
  const button = readSource("../src/components/AssignConversationButton.tsx");
  const header = readSource("../src/components/ChatHeader.tsx");
  const footer = readSource("../src/components/ChatFooter.tsx");

  assert.match(button, /assignConversationToMe\(conversationId\)/);
  assert.match(button, /disabled=\{isAssigning\}/);
  assert.match(button, /Conversación asignada/);
  assert.match(button, /No se pudo actualizar la asignación/);
  assert.match(header, /isPendingAgent/);
  assert.match(header, /isAssignedAgent/);
  assert.match(header, /t\("Asignada a mí"\)/);
  assert.match(header, /className="hidden md:inline-flex"/);
  assert.match(footer, /isAgent && !customerReplyAllowed/);
  assert.match(footer, /conv\?\.assigned_agent_id === null/);
  assert.match(footer, /AssignConversationButton conversationId=\{conv.id\}/);
});

void test("assignment managers see list badges and assignment-only header controls", () => {
  const listItem = readSource("../src/components/ChatListItem.tsx");
  const header = readSource("../src/components/ChatHeader.tsx");
  const actions = readSource("../src/components/ItemActions.tsx");

  assert.match(listItem, /const isAssignmentManager/);
  assert.match(listItem, /isAssignmentManager && \(/);
  assert.match(listItem, /<ConversationAssignmentBadge/);
  assert.match(header, /managerCanManageAssignment/);
  assert.match(header, /assignmentOnly/);
  assert.match(actions, /canManageConversationAssignments/);
  assert.match(actions, /assignmentOnly\s*\? assignmentOnlyItems/);
  assert.match(actions, /role === "agent"\s*\? assignmentItems/);
  assert.match(actions, /placement=\{assignmentOnly \? "bottomRight"/);
  assert.match(
    actions,
    /assignmentOnly \? \(\s*<span className="inline-flex">\{children\}<\/span>/,
  );
  assert.match(actions, /agent\.id === conversation\.assigned_agent_id/);
  assert.match(actions, /label: t\("Desasignar"\)/);
  assert.match(actions, /agent\.extra\?\.role !== "agent"/);
  assert.match(actions, /agent\.extra\.invitation\.status === "accepted"/);
});

void test("Assignment badge has unassigned, named, and missing-assignee states", () => {
  const badge = readSource("../src/components/ConversationAssignmentBadge.tsx");

  assert.match(badge, /conversation\.assigned_agent_id !== null/);
  assert.match(badge, /assignee\?\.name/);
  assert.doesNotMatch(badge, /Asignado.*·/);
  assert.doesNotMatch(badge, /teal|amber/);
  assert.match(badge, /border-border bg-muted\/70/);
  assert.match(badge, /t\("Asignado"\)/);
  assert.match(badge, /t\("Sin asignar"\)/);
  assert.match(badge, /title=\{label\}/);
  assert.match(badge, /truncate/);
});

void test("Assignment UX labels exist in every supported locale", () => {
  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readSource(`../public/locales/${language}.json`),
    ) as Record<string, string>;

    assert.ok(translations.Asignado, language);
    assert.ok(translations["Asignada a mí"], language);
    assert.ok(translations["Sin asignar"], language);
    assert.ok(translations.Asignarme, language);
    assert.ok(
      translations["Asígnate esta conversación para responder"],
      language,
    );
  }
});
