import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createContactLookupBatcher } from "../src/utils/ContactLookupBatcher.ts";
import {
  CONTACT_LOOKUP_STALE_MS,
  conversationContactKey,
  invalidateConversationContacts,
  recoverConversationContacts,
} from "../src/utils/ConversationContactCache.ts";

const scope = { organizationId: "org-a", userId: "user-a" };
const row = (address: string) => ({
  address,
  contact_id: `contact-${address}`,
});

void test("39 conversation contacts plus duplicate header and panel reads use one batch", async () => {
  const calls: string[][] = [];
  const load = createContactLookupBatcher((_, addresses) => {
    calls.push(addresses);
    return Promise.resolve(
      new Map(addresses.map((address) => [address, row(address)])),
    );
  });
  const client = new QueryClient();
  const lookup = (address: string) =>
    client.fetchQuery({
      queryKey: conversationContactKey(
        scope.organizationId,
        scope.userId,
        address,
      ),
      queryFn: ({ signal }) => load(scope, address, signal),
      staleTime: CONTACT_LOOKUP_STALE_MS,
    });
  try {
    const addresses = Array.from({ length: 39 }, (_, index) => String(index));
    await Promise.all([...addresses, "0", "0"].map(lookup));
    await lookup("0");
    assert.deepEqual(calls, [addresses]);
  } finally {
    client.clear();
  }
});

void test("large lists are bounded, serial, and never mix users or organizations", async () => {
  const calls: { org: string; user: string; size: number }[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const load = createContactLookupBatcher(async (current, addresses) => {
    calls.push({
      org: current.organizationId,
      user: current.userId,
      size: addresses.length,
    });
    maxInFlight = Math.max(maxInFlight, ++inFlight);
    await Promise.resolve();
    inFlight--;
    return new Map(addresses.map((address) => [address, current.userId]));
  });
  const signal = new AbortController().signal;
  const result = await Promise.all([
    ...Array.from({ length: 123 }, (_, index) =>
      load(scope, String(index), signal),
    ),
    load({ ...scope, userId: "user-b" }, "0", signal),
    load({ ...scope, organizationId: "org-b" }, "0", signal),
  ]);
  assert.equal(maxInFlight, 1);
  assert.deepEqual(
    calls.map(({ size }) => size),
    [50, 50, 23, 1, 1],
  );
  assert.deepEqual(calls.slice(-2), [
    { org: "org-a", user: "user-b", size: 1 },
    { org: "org-b", user: "user-a", size: 1 },
  ]);
  assert.equal(result.at(-2), "user-b");
});

void test("queued cancellations do not issue a read; missing rows do not throw", async () => {
  const calls: string[][] = [];
  const load = createContactLookupBatcher((_, addresses) => {
    calls.push(addresses);
    return Promise.resolve(new Map<string, string>());
  });
  const obsolete = new AbortController();
  const cancelled = assert.rejects(load(scope, "obsolete", obsolete.signal), {
    name: "AbortError",
  });
  obsolete.abort();
  const missing = await load(scope, "missing", new AbortController().signal);
  await cancelled;
  assert.equal(missing, null);
  assert.deepEqual(calls, [["missing"]]);
});

void test("shared request is aborted only after its last consumer cancels", async () => {
  let transportSignal: AbortSignal | undefined;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const load = createContactLookupBatcher<string>(
    (_, __, signal) =>
      new Promise((_, reject) => {
        transportSignal = signal;
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Cancelled", "AbortError")),
          { once: true },
        );
        started();
      }),
  );
  const first = new AbortController();
  const second = new AbortController();
  const pending = [
    assert.rejects(load(scope, "one", first.signal), { name: "AbortError" }),
    assert.rejects(load(scope, "two", second.signal), { name: "AbortError" }),
  ];
  await ready;
  first.abort();
  assert.equal(transportSignal?.aborted, false);
  second.abort();
  assert.equal(transportSignal?.aborted, true);
  await Promise.all(pending);
});

void test("contact edits and relinks invalidate only affected cached entries", async () => {
  const client = new QueryClient();
  const key = (address: string, org = scope.organizationId) =>
    conversationContactKey(org, scope.userId, address);
  try {
    client.setQueryData(key("one"), row("one"));
    client.setQueryData(key("two"), row("two"));
    client.setQueryData(key("three"), null);
    client.setQueryData(key("one", "org-b"), row("one"));
    await invalidateConversationContacts(client, "org-a", {
      contactIds: ["contact-one"],
    });
    assert.equal(client.getQueryState(key("one"))?.isInvalidated, true);
    assert.equal(client.getQueryState(key("two"))?.isInvalidated, false);
    assert.equal(client.getQueryState(key("three"))?.isInvalidated, false);
    assert.equal(
      client.getQueryState(key("one", "org-b"))?.isInvalidated,
      false,
    );
    await invalidateConversationContacts(client, "org-a", {
      addresses: ["two"],
    });
    assert.equal(client.getQueryState(key("two"))?.isInvalidated, true);
    await invalidateConversationContacts(client, "org-a", {
      includeUnlinked: true,
    });
    assert.equal(client.getQueryState(key("three"))?.isInvalidated, true);
  } finally {
    client.clear();
  }
});

void test("reconnect checks only stale active contact lookups for the signed-in scope", async () => {
  const client = new QueryClient();
  const calls: string[] = [];
  const stops: (() => void)[] = [];
  const observe = (
    address: string,
    user: string,
    age: number,
    active = true,
  ) => {
    const queryKey = conversationContactKey(
      scope.organizationId,
      user,
      address,
    );
    client.setQueryData(queryKey, row(address), {
      updatedAt: Date.now() - age,
    });
    if (!active) return;
    const observer = new QueryObserver(client, {
      queryKey,
      queryFn: () => {
        calls.push(address);
        return Promise.resolve(row(address));
      },
      staleTime: CONTACT_LOOKUP_STALE_MS,
      refetchOnMount: false,
    });
    stops.push(observer.subscribe(() => undefined));
  };
  try {
    observe("fresh", "user-a", 1000);
    observe("stale", "user-a", 90_000);
    observe("inactive", "user-a", 90_000, false);
    observe("other-user", "user-b", 90_000);
    await recoverConversationContacts(client, scope);
    await recoverConversationContacts(client, scope);
    assert.deepEqual(calls, ["stale"]);
  } finally {
    for (const stop of stops) stop();
    client.clear();
  }
});

void test("all chat surfaces use the shared authorized lookup and realtime no longer sweeps address reads", () => {
  const source = (path: string) =>
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  for (const name of ["ChatListItem", "ChatHeader", "CustomerDetailsPanel"]) {
    const component = source(`components/${name}.tsx`);
    assert.match(component, /useConversationContact\(/);
    assert.doesNotMatch(component, /useContactByAddress|useContactAddress\(/);
  }
  const query = source("queries/useConversationContact.ts");
  assert.match(query, /\.eq\("organization_id", scope.organizationId\)/);
  assert.match(query, /\.in\("address", addresses\)/);
  assert.match(query, /\.abortSignal\(signal\)/);
  assert.match(query, /retry: false/);
  assert.doesNotMatch(query, /\.single\(|experimental_prefetchInRender/);
  const realtime = source("hooks/useRealtimeSubscription.ts");
  assert.match(realtime, /refreshChangedContact/);
  assert.doesNotMatch(realtime, /\[activeOrgId, "contacts_addresses"\]/);
});
