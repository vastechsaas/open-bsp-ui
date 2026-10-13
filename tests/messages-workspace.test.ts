import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  conversationCountKey,
  parseConversationCounts,
  ownershipPresentation,
} from "../src/utils/ConversationWorkspaceUtils.ts";
import type { NodeConversationSnapshot } from "../src/utils/NodeConversationUtils.ts";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
void test("counts retain zero and full totals, including bigint JSON strings", () => {
  assert.deepEqual(
    [
      ...parseConversationCounts([
        { key: "pending", count: 0 },
        { key: "closed", count: "405" },
      ]),
    ],
    [
      ["pending", 0],
      ["closed", 405],
    ],
  );
});
void test("failed or malformed counts cannot become successful zero totals", () => {
  for (const data of [
    null,
    {},
    [{ key: "pending", count: -1 }],
    [{ key: "closed", count: null }],
    [{ key: "pending", count: 1.2 }],
    [{ key: "closed", count: "oops" }],
    [
      { key: "closed", count: 1 },
      { key: "closed", count: 2 },
    ],
  ])
    assert.throws(() => parseConversationCounts(data));
});
void test("count caches isolate users, organizations and queue filters", () => {
  assert.notDeepEqual(
    conversationCountKey("a", "org", "vip"),
    conversationCountKey("b", "org", "vip"),
  );
  assert.notDeepEqual(
    conversationCountKey("a", "org", "vip"),
    conversationCountKey("a", "other", "vip"),
  );
  assert.notDeepEqual(
    conversationCountKey("a", "org", "vip"),
    conversationCountKey("a", "org", null),
  );
  assert.deepEqual(
    conversationCountKey("a", "org"),
    conversationCountKey("a", "org", "vip").slice(0, 3),
  );
});
void test("native chats do not acquire a fabricated Node ownership banner", () => {
  assert.equal(ownershipPresentation({ enabled: false }), null);
  assert.equal(ownershipPresentation(undefined), null);
});
void test("support waiting means bot active, not human ownership", () => {
  const waiting = {
    enabled: true,
    state: "bot_active",
    support_request: { status: "waiting" },
  } as NodeConversationSnapshot;
  assert.equal(
    ownershipPresentation(waiting)?.label,
    "Esperando soporte · Chatbot activo",
  );
  assert.equal(
    ownershipPresentation({ ...waiting, state: "human_owned" })?.tone,
    "human",
  );
});
void test("banner distinguishes current and other handling agents from confirmed state", () => {
  const handling = {
    enabled: true,
    state: "human_owned",
    support_request: { status: "handling", handled_by_agent_id: "a" },
  } as NodeConversationSnapshot;
  assert.match(ownershipPresentation(handling, "a")!.label, /Estás atendiendo/);
  assert.match(ownershipPresentation(handling, "b")!.label, /Soporte humano/);
});
void test("pending closure and takeover take priority over stale human ownership", () => {
  const pending = {
    enabled: true,
    state: "human_owned",
    pending_request_id: "one",
    optimistic_action: "resolve-and-close",
  } as NodeConversationSnapshot;
  assert.equal(ownershipPresentation(pending)?.tone, "warning");
  assert.match(ownershipPresentation(pending)!.label, /Cerrando/);
  assert.match(
    ownershipPresentation({ ...pending, optimistic_action: "takeover" })!.label,
    /Tomando control/,
  );
  assert.match(
    ownershipPresentation({ ...pending, optimistic_action: "resume" })!.label,
    /Devolviendo/,
  );
});
void test("unavailable or synchronizing state never displays confirmed human ownership", () => {
  assert.equal(
    ownershipPresentation(
      { enabled: true, state: "human_owned" },
      undefined,
      true,
    )?.tone,
    "error",
  );
  assert.equal(
    ownershipPresentation({
      enabled: true,
      state: "human_owned",
      sync_pending: true,
    })?.tone,
    "warning",
  );
  assert.match(
    ownershipPresentation({ enabled: true, state: "closed" })!.label,
    /solo lectura/,
  );
});
void test("status views retain backend labels and keys with no renamed or hidden grouping", () => {
  const filter = source("src/components/ChatFilter.tsx");
  assert.match(filter, /queue\.label/);
  assert.match(filter, /queues\.map/);
  assert.doesNotMatch(filter, /slice\(|\bMine\b|\bWaiting\b|\bMore\b/);
  assert.match(filter, /counts\.isError/);
  assert.match(filter, /refetch\(\)/);
});
void test("counts use a single cancellable scoped request and visible-page polling", () => {
  const query = source("src/queries/useConversationQueueCounts.ts");
  assert.match(query, /get_conversation_queue_counts/);
  assert.match(query, /abortSignal\(signal\)/);
  assert.match(query, /gcTime: 0/);
  assert.match(query, /refetchInterval: 30_000/);
  assert.match(query, /refetchIntervalInBackground: false/);
  assert.match(query, /refetchOnReconnect: "always"/);
  assert.doesNotMatch(query, /searchPattern|\.from\("messages"\)/);
});
void test("queue selection lives in Filters and sorting remains unchanged", () => {
  const search = source("src/components/ChatSearch.tsx");
  assert.match(search, /<Popover/);
  assert.match(search, /aria-pressed=\{!!routingQueueId\}/);
  assert.match(search, /setRoutingQueueId\(null\)/);
  assert.doesNotMatch(search, /Newest|sortOrder/);
  const list = source("src/components/ChatList.tsx");
  assert.match(list, /pinnedAscending\(a\.conv, b\.conv\)/);
  assert.match(
    list,
    /timestampDescending\(a\.mostRecentMsg, b\.mostRecentMsg\)/,
  );
});
void test("workspace styling retains themes and both existing sidebar components", () => {
  const layout = source("src/routes/_auth.tsx");
  assert.match(layout, /<Menu/);
  assert.match(layout, /<CustomerDetailsPanel/);
  assert.match(layout, /<MessagesWorkspaceHeader/);
  assert.match(layout, /<ConversationOwnershipBanner/);
  assert.match(layout, /appearanceSettings\?\.chat_bubble_theme/);
  assert.doesNotMatch(
    source("src/components/MessagesWorkspaceHeader.tsx"),
    />Live</,
  );
  assert.match(
    source("src/global.css"),
    /\.messages-workspace \.bg-chat::before/,
  );
});
void test("all new UI labels and ownership states are translated consistently", () => {
  const components = [
    "src/components/ChatFilter.tsx",
    "src/components/ChatSearch.tsx",
    "src/components/MessagesWorkspaceHeader.tsx",
    "src/components/ConversationOwnershipBanner.tsx",
  ]
    .map(source)
    .join("\n");
  const keys = [...components.matchAll(/\bt\("([^"]+)"\)/g)].map((m) => m[1]);
  keys.push(
    "No se pudo sincronizar el estado del chat.",
    "Devolviendo al chatbot—sincronización pendiente",
    "Esperando soporte · Chatbot activo",
    "Estás atendiendo este chat · Chatbot pausado",
    "Soporte humano activo · Chatbot pausado",
  );
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const labels = JSON.parse(source(`public/locales/${lang}.json`)) as Record<
      string,
      string
    >;
    for (const key of keys) assert.ok(labels[key], `${lang}: ${key}`);
  }
});
