import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  clearSupabaseAuthStorage,
  createRejectedSessionCheck,
  getSupabaseAuthStorageKeys,
  isMissingServerSession,
} from "../src/utils/AuthSessionUtils.ts";
import { createChatbotManagementError } from "../src/utils/ChatbotFlowUtils.ts";
import { lifecyclePollInterval } from "../src/utils/NodeConversationUtils.ts";
import { retryTransientRead } from "../src/utils/ReadRecoveryUtils.ts";

void test("derives and clears every Supabase browser-auth storage key", () => {
  const removed: string[] = [];
  const storage = { removeItem: (key: string) => removed.push(key) };

  clearSupabaseAuthStorage(storage, "https://buvjopvpkgvzhykwsxnk.supabase.co");

  assert.deepEqual(
    removed,
    getSupabaseAuthStorageKeys("https://buvjopvpkgvzhykwsxnk.supabase.co"),
  );
  assert.deepEqual(removed, [
    "sb-buvjopvpkgvzhykwsxnk-auth-token",
    "sb-buvjopvpkgvzhykwsxnk-auth-token-code-verifier",
    "sb-buvjopvpkgvzhykwsxnk-auth-token-user",
  ]);
});

void test("recognizes the stale server-session error by code or message", () => {
  assert.equal(isMissingServerSession({ code: "Session_not_found" }), true);
  assert.equal(
    isMissingServerSession({
      message: "Session from session_id claim in JWT does not exist",
    }),
    true,
  );
  assert.equal(isMissingServerSession({ code: "network_error" }), false);
  assert.equal(
    isMissingServerSession({ name: "AuthSessionMissingError" }),
    true,
  );
});

const unauthorized = createChatbotManagementError(401, {
  message: "Invalid JWT",
});
const missing = { name: "AuthSessionMissingError" };

void test("ownership polling and automatic read retries stop on 401, not a Node outage", () => {
  const snapshot = { enabled: true, sync_pending: true };
  const outage = createChatbotManagementError(503, {
    message: "Node unavailable",
  });
  assert.equal(lifecyclePollInterval(snapshot, unauthorized), false);
  assert.equal(retryTransientRead(0, unauthorized), false);
  assert.equal(lifecyclePollInterval(snapshot, outage), 2000);
  assert.equal(retryTransientRead(0, outage), true);
});

void test("concurrent 401s share one browser Auth check and only end an empty local session", async () => {
  const user = {};
  let reads = 0;
  let signOuts = 0;
  const check = createRejectedSessionCheck({
    currentUser: () => user,
    getUser: () => {
      reads++;
      return Promise.resolve({ error: missing });
    },
    getSession: () => Promise.resolve({ error: null, data: { session: null } }),
    endLocalSession: () => {
      signOuts++;
      return Promise.resolve();
    },
  });
  const first = check(unauthorized);
  assert.equal(first, check(unauthorized));
  await first;
  assert.equal(reads, 1);
  assert.equal(signOuts, 1);
});

void test("valid login, transient Auth failure, and permission failures never sign out", async () => {
  const user = {};
  let reads = 0;
  let unexpectedCalls = 0;
  let authResult: unknown = null;
  const check = createRejectedSessionCheck({
    currentUser: () => user,
    getUser: () => {
      reads++;
      return Promise.resolve({ error: authResult });
    },
    getSession: () => {
      unexpectedCalls++;
      return Promise.resolve({ error: null, data: { session: null } });
    },
    endLocalSession: () => {
      unexpectedCalls++;
      return Promise.resolve();
    },
  });
  await check(createChatbotManagementError(403, {}));
  await check(createChatbotManagementError(503, {}));
  assert.equal(reads, 0);
  await check(unauthorized);
  authResult = { name: "AuthRetryableFetchError", status: 503 };
  await check(unauthorized);
  assert.equal(reads, 2);
  assert.equal(unexpectedCalls, 0);
});

void test("a stale ownership response cannot sign out a replacement or already-ended session", async () => {
  for (const nextUser of [{}, null]) {
    let user: object | null = {};
    let unexpectedCalls = 0;
    const check = createRejectedSessionCheck({
      currentUser: () => user,
      getUser: () => {
        user = nextUser;
        return Promise.resolve({ error: missing });
      },
      getSession: () => {
        unexpectedCalls++;
        return Promise.resolve({ error: null, data: { session: null } });
      },
      endLocalSession: () => {
        unexpectedCalls++;
        return Promise.resolve();
      },
    });
    await check(unauthorized);
    assert.equal(unexpectedCalls, 0);
  }
});

void test("a still-stored session is not removed on an ambiguous confirmation", async () => {
  const user = {};
  let signOuts = 0;
  const check = createRejectedSessionCheck({
    currentUser: () => user,
    getUser: () => Promise.resolve({ error: missing }),
    getSession: () => Promise.resolve({ error: null, data: { session: {} } }),
    endLocalSession: () => {
      signOuts++;
      return Promise.resolve();
    },
  });
  await check(unauthorized);
  assert.equal(signOuts, 0);
});

void test("the Supabase client emits SIGNED_OUT for the incident's session_not_found response", async () => {
  const storageKey = "test-auth-session";
  let stored: string | null = JSON.stringify({
    access_token: "test-access",
    refresh_token: "test-refresh",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "test-user" },
  });
  let authReads = 0;
  const client = createClient("https://example.test", "test-anon", {
    auth: {
      storageKey,
      storage: {
        getItem: (key) => (key === storageKey ? stored : null),
        setItem: (key, value) => {
          if (key === storageKey) stored = value;
        },
        removeItem: (key) => {
          if (key === storageKey) stored = null;
        },
      },
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        assert.equal(url, "https://example.test/auth/v1/user");
        authReads++;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              code: "session_not_found",
              msg: "Session no longer exists",
            }),
            {
              status: 403,
              headers: {
                "content-type": "application/json",
                "x-supabase-api-version": "2024-01-01",
              },
            },
          ),
        );
      },
    },
  });
  const events: string[] = [];
  let user: object | null = {};
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event, session) => {
    events.push(event);
    if (event === "SIGNED_OUT" && !session) user = null;
  });
  try {
    const check = createRejectedSessionCheck({
      currentUser: () => user,
      getUser: () => client.auth.getUser(),
      getSession: () => client.auth.getSession(),
      endLocalSession: () => client.auth.signOut({ scope: "local" }),
    });
    await check(unauthorized);
    assert.equal(authReads, 1);
    assert.equal(stored, null);
    assert.equal(user, null);
    assert.equal(events.filter((e) => e === "SIGNED_OUT").length, 1);
  } finally {
    subscription.unsubscribe();
  }
});
