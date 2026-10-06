import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import {
  inboxVisibilityBatches,
  visibleInboxIds,
  isInboxChange,
  inboxMembershipChanged,
  mergeInboxVisibility,
} from "../src/utils/SupportInboxUtils.ts";

void test("new batch loading preserves confirmed chats but never reveals new IDs", () => {
  const previous = new Map([
    ["waiting", true],
    ["bot", false],
  ]);
  const loading = mergeInboxVisibility(previous, []);
  assert.equal(loading.get("waiting"), true);
  assert.equal(loading.has("new-bot"), false);
  const refreshed = mergeInboxVisibility(loading, [
    {
      ids: ["waiting", "bot", "new-bot"],
      rows: [
        { conversation_id: "bot", visible: false },
        { conversation_id: "new-bot", visible: false },
      ],
    },
  ]);
  assert.equal(
    refreshed.get("waiting"),
    false,
    "missing inaccessible row revokes previous visibility",
  );
  assert.equal(refreshed.get("new-bot"), false);
});

void test("ordinary message timestamp updates do not trigger visibility requests", () => {
  const previous = {
    status: "active",
    organization_address: "number",
    assigned_agent_id: null,
    routing_queue_id: null,
  };
  assert.equal(inboxMembershipChanged(previous, { ...previous }), false);
  assert.equal(
    inboxMembershipChanged(previous, { ...previous, status: "closed" }),
    true,
  );
  assert.equal(
    inboxMembershipChanged(previous, {
      ...previous,
      assigned_agent_id: "agent",
    }),
    true,
  );
  assert.equal(inboxMembershipChanged(undefined, previous), true);
});

void test("visibility requests are bounded, deterministic and deduplicated", () => {
  const ids = Array.from({ length: 1001 }, (_, i) => String(i));
  const batches = inboxVisibilityBatches([...ids, ...ids].reverse());
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [500, 500, 1],
  );
  assert.deepEqual(batches.flat(), [...ids].sort());
  assert.deepEqual(inboxVisibilityBatches([]), []);
});

void test("only confirmed true is eligible; unknown and hidden chats never flash", () => {
  const visible = visibleInboxIds([
    { conversation_id: "bot", visible: false },
    { conversation_id: "waiting", visible: true },
  ]);
  assert.equal(visible.has("bot"), false);
  assert.equal(visible.has("unknown"), false);
  assert.equal(visible.has("waiting"), true);
  assert.equal(visibleInboxIds([]).size, 0);
});

void test("broadcasts are invalidations scoped to the active organization", () => {
  assert.equal(
    isInboxChange({ organization_id: "a", conversation_id: "chat" }, "a"),
    true,
  );
  assert.equal(isInboxChange({ organization_id: "b" }, "a"), false);
  assert.equal(isInboxChange(null, "a"), false);
});

void test("realtime refetches authoritative visibility and covers reconnects", () => {
  const source = readFileSync(
    new URL("../src/hooks/useRealtimeSubscription.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /conversation_inbox_changed/);
  assert.match(source, /cancelQueries\(\{ queryKey \}\)/);
  assert.match(source, /await refreshInboxVisibility\(\)/);
  assert.match(source, /reconcileConversation\(signal.conversation_id\)/);
});

void test("ordinary and Mentioned lists share eligibility without role bypass", () => {
  const source = readFileSync(
    new URL("../src/components/ChatList.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /inbox.visibleIds.has\(a.convId\)/);
  assert.match(source, /filter\(\(id\) => inbox.visibleIds.has\(id\)\)/);
  assert.match(source, /inbox.isError/);
  assert.match(source, /inbox.retry\(\)/);
});

void test("eligibility queries isolate accounts and consume cancellation signals", () => {
  const source = readFileSync(
    new URL("../src/queries/useSupportInboxVisibility.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /\[organizationId, "support-inbox", userId\]/);
  assert.match(source, /abortSignal\(signal\)/);
  assert.match(source, /gcTime: 0/);
  assert.doesNotMatch(source, /pushMessages|removeConversations/);
});

void test("support inbox error copy is translated consistently", () => {
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const messages = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.ok(messages["No se pudo actualizar la bandeja de soporte."]);
  }
});

void test("cancelled account requests cannot restore visibility after switching", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let completeOld: (
    rows: { conversation_id: string; visible: boolean }[],
  ) => void = () => {};
  const oldKey = ["org-a", "support-inbox", "user-a", ["chat"]];
  const newKey = ["org-b", "support-inbox", "user-b", ["chat"]];
  const old = client
    .fetchQuery({
      queryKey: oldKey,
      queryFn: async ({ signal }) => {
        const rows = await new Promise<
          { conversation_id: string; visible: boolean }[]
        >((resolve) => {
          completeOld = resolve;
        });
        signal.throwIfAborted();
        return rows;
      },
    })
    .catch(() => undefined);
  await client.cancelQueries({ queryKey: oldKey });
  await client.fetchQuery({
    queryKey: newKey,
    queryFn: () =>
      Promise.resolve([{ conversation_id: "chat", visible: false }]),
  });
  completeOld([{ conversation_id: "chat", visible: true }]);
  await old;
  assert.equal(client.getQueryData(oldKey), undefined);
  assert.deepEqual(client.getQueryData(newKey), [
    { conversation_id: "chat", visible: false },
  ]);
  client.clear();
});

void test("network failure remains retryable instead of revealing unknown chats", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const key = ["org", "support-inbox", "user", ["chat"]];
  await assert.rejects(
    client.fetchQuery({
      queryKey: key,
      queryFn: () => Promise.reject(new Error("offline")),
    }),
    /offline/,
  );
  assert.equal(client.getQueryData(key), undefined);
  await client.fetchQuery({
    queryKey: key,
    queryFn: () =>
      Promise.resolve([{ conversation_id: "chat", visible: true }]),
  });
  assert.deepEqual(client.getQueryData(key), [
    { conversation_id: "chat", visible: true },
  ]);
  client.clear();
});
