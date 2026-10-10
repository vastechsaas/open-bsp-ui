import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canResolveNodeConversation,
  canTakeOverNodeConversation,
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
      "Esperando soporte · Chatbot activo",
      "Estás atendiendo este chat · Chatbot pausado",
      "Soporte humano activo · Chatbot pausado",
      "Solicitud original",
      "Tomando control—sincronización pendiente",
      "Tomar control del chat",
      "Reintentar toma de control",
      "Toma el control del chat antes de responder al cliente",
    ])
      assert.ok(translations[key], `${locale}:${key}`);
  }
});

test("takeover requires authorized waiting ownership and never follows assignment alone", () => {
  const snapshot = {
    enabled: true,
    takeover_enabled: true,
    can_takeover: true,
    state: "bot_ready" as const,
    revision: "4",
    last_inbound_wamid: "wamid.latest",
    support_request: {
      id: "request",
      status: "waiting" as const,
      reason: "Refund",
      requested_at: "today",
      source_wamid: "wamid.first",
      target: { routing_queue_id: "mobile" },
    },
  };
  assert.equal(canTakeOverNodeConversation(snapshot), true);
  assert.equal(
    canTakeOverNodeConversation({ ...snapshot, can_takeover: false }),
    false,
  );
  assert.equal(
    canTakeOverNodeConversation({ ...snapshot, takeover_enabled: false }),
    false,
  );
  assert.equal(
    canTakeOverNodeConversation({
      ...snapshot,
      pending_request_id: "other-agent",
    }),
    false,
  );
  assert.equal(
    canTakeOverNodeConversation({ ...snapshot, state: "human_owned" }),
    false,
  );
  assert.equal(canResolveNodeConversation(snapshot, ["wamid.latest"]), false);
  const operation = {
    request_id: "stable-takeover",
    status: "failed",
    last_error: "outage",
    action: "takeover" as const,
    expected_revision: "4",
    observed_last_inbound_wamid: "wamid.first",
  };
  assert.equal(
    conversationRetry({ ...snapshot, operation }, "takeover"),
    operation,
  );
  assert.equal(
    conversationRetry({ ...snapshot, revision: "5", operation }, "takeover"),
    null,
  );
  const controls = readFileSync(
    new URL("../src/components/ResumeChatbotButton.tsx", import.meta.url),
    "utf8",
  );
  const footer = readFileSync(
    new URL("../src/components/ChatFooter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(controls, /canTakeOverNodeConversation/);
  assert.match(controls, /handled_by_agent_id === agent\?\.id/);
  assert.match(
    controls,
    /mutate\(\s*waiting \? "takeover" : "resolve-and-close",?\s*\)/,
  );
  assert.match(footer, /!privateNoteMode &&[\s\S]*?nodeHumanSendingBlocked/);
  assert.match(footer, /\{composerModeTabs\}/);
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

void test("takeover and close controls keep a single compact row with accessible status hints", () => {
  const controls = readFileSync(
    new URL("../src/components/ResumeChatbotButton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    controls,
    /<div className="flex h-8 shrink-0 items-center gap-1" title=\{supportHint\}>/,
  );
  assert.doesNotMatch(controls, /flex-col|max-w-\[250px\]/);
  assert.match(
    controls,
    /role="status" className="sr-only" aria-live="polite"/,
  );
  assert.match(controls, /Solicitud original/);
  assert.match(controls, /aria-label=\{progressLabel\}/);
  assert.match(controls, /aria-busy=\{pending \|\| syncingSupport\}/);
  const action = controls.match(/<button\b[\s\S]*?<\/button>/)?.[0] || "";
  assert.match(action, /h-8 shrink-0/);
  assert.match(action, /whitespace-nowrap/);
  assert.match(action, /LoaderCircle/);
  assert.match(action, /\{progressLabel\}/);
  assert.match(controls, /<Popover[\s\S]*?placement="bottomRight"/);
  assert.match(controls, /role="alert"[\s\S]*?max-w-72 break-words/);
  assert.match(controls, /<AlertCircle/);
  assert.match(controls, /Reintentar toma de control/);
});
