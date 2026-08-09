import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  canManageQuickReplies,
  getQuickReplyKeyboardAction,
  getQuickReplySuggestions,
  isQuickRepliesWorkspacePath,
  normalizeQuickReplyShortcut,
  validateQuickReplyDraft,
} from "../src/utils/QuickReplyUtils.ts";
import { canAccessNavigation, canAccessPath } from "../src/utils/RoleAccess.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const readSource = (path: string) => readFileSync(`${root}/${path}`, "utf8");

const replies = [
  { id: "2", shortcut: "/welcome", content: "Welcome to our support team" },
  { id: "1", shortcut: "/billing", content: "I can help with your invoice" },
];

void test("quick reply validation normalizes shortcuts and enforces locked limits", () => {
  assert.equal(normalizeQuickReplyShortcut("  WELCOME "), "/welcome");
  assert.equal(validateQuickReplyDraft("welcome", " Hello ").valid, true);
  assert.equal(validateQuickReplyDraft("/Welcome", "Hello").valid, true);
  assert.equal(validateQuickReplyDraft("/not valid", "Hello").valid, false);
  assert.equal(
    validateQuickReplyDraft(`/${"a".repeat(30)}`, "Hello").valid,
    false,
  );
  assert.equal(validateQuickReplyDraft("/ok", " ").valid, false);
  assert.equal(validateQuickReplyDraft("/ok", "a".repeat(1001)).valid, false);
});

void test("slash suggestions activate only at the start and search shortcut or content", () => {
  assert.deepEqual(getQuickReplySuggestions("hello /wel", replies), []);
  assert.deepEqual(getQuickReplySuggestions("/wel\nmore", replies), []);
  assert.deepEqual(
    getQuickReplySuggestions("/wel", replies).map((reply) => reply.shortcut),
    ["/welcome"],
  );
  assert.deepEqual(
    getQuickReplySuggestions("/invoice", replies).map(
      (reply) => reply.shortcut,
    ),
    ["/billing"],
  );
  assert.deepEqual(
    getQuickReplySuggestions("/", replies).map((reply) => reply.shortcut),
    ["/billing", "/welcome"],
  );
});

void test("picker keyboard navigation wraps, selects, and dismisses", () => {
  assert.deepEqual(getQuickReplyKeyboardAction("ArrowDown", 1, 2), {
    type: "move",
    index: 0,
  });
  assert.deepEqual(getQuickReplyKeyboardAction("ArrowUp", 0, 2), {
    type: "move",
    index: 1,
  });
  assert.deepEqual(getQuickReplyKeyboardAction("Enter", 1, 2), {
    type: "select",
    index: 1,
  });
  assert.deepEqual(getQuickReplyKeyboardAction("Tab", 0, 2), {
    type: "select",
    index: 0,
  });
  assert.deepEqual(getQuickReplyKeyboardAction("Escape", 0, 2), {
    type: "close",
  });
});

void test("only managers can open the organization quick reply workspace", () => {
  for (const role of ["owner", "admin", "supervisor"] as const) {
    assert.equal(canManageQuickReplies(role), true);
    assert.equal(canAccessNavigation(role, "quickReplies"), true);
    assert.equal(canAccessPath(role, "/quick-replies"), true);
  }
  for (const role of ["member", "agent"] as const) {
    assert.equal(canManageQuickReplies(role), false);
    assert.equal(canAccessNavigation(role, "quickReplies"), false);
    assert.equal(canAccessPath(role, "/quick-replies"), false);
  }
  assert.equal(isQuickRepliesWorkspacePath("/quick-replies"), true);
});

void test("management uses backend pagination and authoritative mutation RPCs", () => {
  const querySource = readSource("src/queries/useQuickReplies.ts");
  const routeSource = readSource("src/routes/_auth/quick-replies.tsx");

  for (const rpc of [
    "list_quick_replies_page",
    "create_quick_reply",
    "update_quick_reply",
    "delete_quick_reply",
  ]) {
    assert.match(querySource, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.match(routeSource, /DataTablePagination/);
  assert.match(routeSource, /total >= 50/);
  assert.match(routeSource, /maxLength=\{30\}/);
  assert.match(routeSource, /maxLength=\{1000\}/);
  assert.match(routeSource, /confirmDelete/);
});

void test("customer composer copies editable text without sending or exposing private notes", () => {
  const source = readSource("src/components/ChatFooter.tsx");
  const selection = source.match(
    /const selectQuickReply = [\s\S]+?^ {2}};$/m,
  )?.[0];

  assert.ok(selection);
  assert.match(source, /if \(activeConvId && conv && privateNoteMode\)/);
  assert.match(
    source,
    /<PrivateNoteComposer conversationId=\{activeConvId\} \/>/,
  );
  assert.match(source, /inCSWindow/);
  assert.match(source, /customerReplyAllowed/);
  assert.match(
    source,
    /getQuickReplySuggestions\(message \|\| "", quickReplies\)/,
  );
  assert.match(selection, /setMessage\(reply\.content\)/);
  assert.match(selection, /moveCursorToEnd\(editableDiv\.current\)/);
  assert.doesNotMatch(selection, /handleSend|sendMessage|mutateAsync/);
});

void test("quick reply cache reconciles realtime, reconnect, online, and visibility recovery", () => {
  const source = readSource("src/hooks/useRealtimeSubscription.ts");
  assert.match(source, /table: "quick_replies"/);
  assert.match(source, /refreshQuickReplies/);
  assert.match(source, /REALTIME_SUBSCRIBE_STATES\.SUBSCRIBED/);
  assert.match(source, /window\.addEventListener\("online"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
});

void test("quick reply labels exist in every supported locale", () => {
  const requiredKeys = [
    "Respuestas rápidas",
    "Nueva respuesta",
    "Buscar por atajo o contenido",
    "Atajo",
    "Respuesta",
    "Respuesta rápida creada",
    "Eliminar respuesta rápida",
  ];

  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      readSource(`public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of requiredKeys) {
      assert.ok(translations[key], `${locale}: ${key}`);
    }
  }
});
