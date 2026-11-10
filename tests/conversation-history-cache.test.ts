import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  InfiniteQueryObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import {
  clearConversationHistory,
  conversationHistoryQueries,
  HISTORY_CACHE_TIME,
  latestHistoryRoot,
} from "../src/utils/ConversationHistoryQuery.ts";

type Page = { items: string[]; next_cursor?: number };
const scope = {
  organizationId: "org-a",
  userId: "user-a",
  conversationId: "chat-a",
  includeCampaigns: true,
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function eventually(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await tick();
  }
  assert.fail("Query did not reach expected state");
}

function fixture() {
  const client = new QueryClient();
  const calls: (number | undefined)[] = [];
  let generation = 0;
  let failure: number | "latest" | undefined;
  const queries = conversationHistoryQueries<number, Page>(scope, (cursor) => {
    calls.push(cursor);
    if (failure === (cursor ?? "latest"))
      return Promise.reject(new Error("Offline"));
    return Promise.resolve({
      items: [`${generation}:${cursor ?? "latest"}`],
      next_cursor: cursor === 2 ? undefined : (cursor ?? 0) + 1,
    });
  });
  const open = async () => {
    const latest = new QueryObserver(client, queries.latest);
    const stopLatest = latest.subscribe(() => undefined);
    await eventually(() => latest.getCurrentResult().isSuccess);
    const pages = new InfiniteQueryObserver(client, queries.pages);
    const stopPages = pages.subscribe(() => undefined);
    await eventually(() => pages.getCurrentResult().isSuccess);
    return {
      latest,
      pages,
      close: () => {
        stopLatest();
        stopPages();
      },
    };
  };
  return {
    client,
    calls,
    queries,
    open,
    changeHead: () => generation++,
    fail: (value: typeof failure) => (failure = value),
  };
}

void test("initial page is fetched once and reopening reuses all loaded pages", async () => {
  const f = fixture();
  try {
    const first = await f.open();
    assert.deepEqual(f.calls, [undefined]);
    await first.pages.fetchNextPage();
    await first.pages.fetchNextPage();
    assert.deepEqual(f.calls, [undefined, 1, 2]);
    assert.equal(first.pages.getCurrentResult().hasNextPage, false);
    first.close();
    const reopened = await f.open();
    assert.deepEqual(f.calls, [undefined, 1, 2]);
    assert.equal(reopened.pages.getCurrentResult().data?.pages.length, 3);
    reopened.close();
    assert.equal(f.queries.pages.gcTime, HISTORY_CACHE_TIME);
  } finally {
    f.client.clear();
  }
});

void test("focus, reconnect and recovery refresh only a stale head, not older pages", async () => {
  const f = fixture();
  try {
    const active = await f.open();
    await active.pages.fetchNextPage();
    await active.pages.fetchNextPage();
    const before = active.pages.getCurrentResult().data;
    const markStale = () =>
      f.client.setQueryData(
        f.queries.latest.queryKey,
        active.latest.getCurrentResult().data,
        {
          updatedAt: Date.now() - 60_000,
        },
      );
    markStale();
    f.changeHead();
    f.client.getQueryCache().onFocus();
    await eventually(
      () =>
        f.calls.length === 4 && !active.latest.getCurrentResult().isFetching,
    );
    assert.deepEqual(f.calls, [undefined, 1, 2, undefined]);
    // A second focus within the freshness window does not repeat the request.
    f.client.getQueryCache().onFocus();
    await tick();
    assert.equal(f.calls.length, 4);
    markStale();
    f.client.getQueryCache().onOnline();
    await eventually(
      () =>
        f.calls.length === 5 && !active.latest.getCurrentResult().isFetching,
    );
    await f.client.invalidateQueries({ queryKey: latestHistoryRoot("org-a") });
    assert.deepEqual(f.calls, [
      undefined,
      1,
      2,
      undefined,
      undefined,
      undefined,
    ]);
    assert.deepEqual(active.pages.getCurrentResult().data, before);
    assert.deepEqual(active.latest.getCurrentResult().data?.items, [
      "1:latest",
    ]);
    active.close();
  } finally {
    f.client.clear();
  }
});

void test("reopening a stale chat checks only its head and preserves pagination position", async () => {
  const f = fixture();
  try {
    const first = await f.open();
    await first.pages.fetchNextPage();
    first.close();
    f.client.setQueryData(
      f.queries.latest.queryKey,
      { items: ["old"], next_cursor: 1 },
      {
        updatedAt: Date.now() - 60_000,
      },
    );
    const reopened = await f.open();
    await eventually(() => !reopened.latest.getCurrentResult().isFetching);
    assert.deepEqual(f.calls, [undefined, 1, undefined]);
    await reopened.pages.fetchNextPage();
    assert.deepEqual(f.calls, [undefined, 1, undefined, 2]);
    reopened.close();
  } finally {
    f.client.clear();
  }
});

void test("failed reads retain existing pages and Retry requests only the failed batch", async () => {
  const f = fixture();
  try {
    const active = await f.open();
    f.fail(1);
    await active.pages.fetchNextPage();
    assert.equal(active.pages.getCurrentResult().isFetchNextPageError, true);
    assert.equal(active.pages.getCurrentResult().data?.pages.length, 1);
    f.fail(undefined);
    await active.pages.fetchNextPage();
    assert.deepEqual(f.calls, [undefined, 1, 1]);
    f.fail("latest");
    await active.latest.refetch();
    assert.equal(active.latest.getCurrentResult().isError, true);
    assert.equal(active.pages.getCurrentResult().data?.pages.length, 2);
    f.fail(undefined);
    await active.latest.refetch();
    assert.deepEqual(f.calls, [undefined, 1, 1, undefined, undefined]);
    active.close();
  } finally {
    f.client.clear();
  }
});

void test("cache keys isolate user, organization, conversation and timeline mode", () => {
  const base = conversationHistoryQueries(
    scope,
    (): Promise<Page> => Promise.resolve({ items: [] }),
  );
  for (const change of [
    { userId: "user-b" },
    { organizationId: "org-b" },
    { conversationId: "chat-b" },
    { includeCampaigns: false },
  ]) {
    const other = conversationHistoryQueries(
      { ...scope, ...change },
      (): Promise<Page> => Promise.resolve({ items: [] }),
    );
    assert.notDeepEqual(other.latest.queryKey, base.latest.queryKey);
    assert.notDeepEqual(other.pages.queryKey, base.pages.queryKey);
  }
});

void test("revoked access purges both caches without clearing unrelated chats", async () => {
  const f = fixture();
  try {
    const active = await f.open();
    await active.pages.fetchNextPage();
    const other = conversationHistoryQueries(
      { ...scope, conversationId: "chat-b" },
      (): Promise<Page> => Promise.resolve({ items: [] }),
    );
    await f.client.fetchQuery(other.latest);
    active.close();
    clearConversationHistory(f.client, "org-a", ["chat-a"]);
    assert.equal(f.client.getQueryData(f.queries.latest.queryKey), undefined);
    assert.equal(f.client.getQueryData(f.queries.pages.queryKey), undefined);
    assert.ok(f.client.getQueryData(other.latest.queryKey));
    // Expiry/removal requires a fresh, authorized initial read.
    const reopened = await f.open();
    assert.deepEqual(f.calls, [undefined, 1, undefined]);
    reopened.close();
  } finally {
    f.client.clear();
  }
});

void test("recovery and Retry do not invalidate or refetch the full history", () => {
  const hook = readFileSync(
    new URL("../src/queries/useConversationHistory.ts", import.meta.url),
    "utf8",
  );
  const realtime = readFileSync(
    new URL("../src/hooks/useRealtimeSubscription.ts", import.meta.url),
    "utf8",
  );
  assert.match(hook, /refetch: latest.refetch/);
  assert.match(hook, /latest.data\?\.messages/);
  assert.match(
    hook,
    /pages: history.data.pages.map\(\(page\) => page.messages\)/,
  );
  assert.doesNotMatch(hook, /campaign-conversation-history/);
  assert.match(hook, /clearConversationHistory\(client/);
  assert.match(realtime, /queryKey: latestHistoryRoot\(activeOrgId\)/);
  assert.doesNotMatch(
    realtime,
    /queryKey: \[activeOrgId, "conversation-history"\]/,
  );
});
