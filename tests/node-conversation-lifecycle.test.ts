import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canResolveNodeConversation,
  conversationRetry,
  isConversationManager,
  nodeHumanSendingBlocked,
} from "../src/utils/NodeConversationUtils.ts";

test("close requires a displayed inbound message and current human ownership", () => {
  const snapshot = {
    enabled: true,
    state: "human_owned" as const,
    can_resolve: true,
    revision: "3",
    last_inbound_wamid: "wamid.latest",
  };
  assert.equal(canResolveNodeConversation(snapshot, ["wamid.latest"]), true);
  assert.equal(canResolveNodeConversation(snapshot, ["wamid.older"]), false);
  assert.equal(
    canResolveNodeConversation({ ...snapshot, pending_request_id: "pending" }, [
      "wamid.latest",
    ]),
    false,
  );
  assert.equal(
    canResolveNodeConversation({ ...snapshot, state: "bot_ready" }, [
      "wamid.latest",
    ]),
    false,
  );
});

test("only existing managers can use return-to-chatbot override", () => {
  for (const role of ["owner", "admin", "supervisor"])
    assert.equal(isConversationManager(role), true);
  for (const role of ["agent", "member", undefined])
    assert.equal(isConversationManager(role), false);
});

test("retry reuses durable identity even after reopen, but a new failed snapshot starts a fresh request", () => {
  const operation = {
    request_id: "stable",
    status: "reconciling",
    last_error: "network",
    action: "resolve-and-close" as const,
    expected_revision: "1",
    observed_last_inbound_wamid: "wamid.old",
  };
  const snapshot = {
    enabled: true,
    revision: "2",
    last_inbound_wamid: "wamid.new",
    pending_request_id: "stable",
    operation,
  };
  assert.equal(conversationRetry(snapshot, "resolve-and-close"), operation);
  assert.equal(conversationRetry(snapshot, "resume"), null);
  assert.equal(
    conversationRetry(
      { ...snapshot, pending_request_id: null },
      "resolve-and-close",
    ),
    null,
  );
  assert.equal(
    conversationRetry(
      {
        ...snapshot,
        pending_request_id: null,
        revision: "1",
        last_inbound_wamid: "wamid.old",
      },
      "resolve-and-close",
    ),
    operation,
  );
});

test("human sends are disabled while pending, closed/bot owned, but not for legacy tenants", () => {
  assert.equal(
    nodeHumanSendingBlocked({
      lifecycle_enabled: true,
      human_owned: true,
      pending_request_id: "id",
    }),
    true,
  );
  assert.equal(
    nodeHumanSendingBlocked({
      lifecycle_enabled: true,
      human_owned: false,
      pending_request_id: null,
    }),
    true,
  );
  assert.equal(
    nodeHumanSendingBlocked({
      lifecycle_enabled: true,
      human_owned: true,
      pending_request_id: null,
    }),
    false,
  );
  assert.equal(
    nodeHumanSendingBlocked({
      lifecycle_enabled: false,
      human_owned: false,
      pending_request_id: null,
    }),
    false,
  );
});

test("controls have complete translations, pending/retry state and account-scoped queries", () => {
  const controls = readFileSync(
    new URL("../src/components/ResumeChatbotButton.tsx", import.meta.url),
    "utf8",
  );
  const hook = readFileSync(
    new URL("../src/queries/useChatbotFlows.ts", import.meta.url),
    "utf8",
  );
  assert.match(controls, /Dropdown/);
  assert.match(controls, /canResolveNodeConversation/);
  assert.match(
    hook,
    /node-conversation-lifecycle", userId, orgId, conversationId/,
  );
  assert.match(hook, /abortSignal\(signal\)/);
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const key of [
      "Resolver y cerrar",
      "Cerrando—sincronización pendiente",
      "Volver al chatbot",
      "Actualizar y reintentar",
    ])
      assert.ok(translations[key], `${locale}:${key}`);
  }
});

void test("lifecycle header controls use explicit theme colors, including disabled close", () => {
  const controls = readFileSync(
    new URL("../src/components/ResumeChatbotButton.tsx", import.meta.url),
    "utf8",
  );
  const buttons = [
    ...controls.matchAll(/<button\b[\s\S]*?className="([^"]+)"/g),
  ];
  const [close, overflow, retry] = buttons.map((button) => button[1]);
  assert.match(close, /\bbg-muted\/70\b/);
  assert.match(close, /\btext-foreground\b/);
  assert.match(close, /disabled:text-muted-foreground/);
  assert.doesNotMatch(close, /disabled:opacity-/);
  assert.match(close, /focus-visible:ring-2/);
  assert.match(overflow, /\btext-foreground\b/);
  assert.match(retry, /\btext-destructive\b/);
});
