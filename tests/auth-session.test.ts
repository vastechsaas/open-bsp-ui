import test from "node:test";
import assert from "node:assert/strict";
import {
  clearSupabaseAuthStorage,
  getSupabaseAuthStorageKeys,
  isMissingServerSession,
} from "../src/utils/AuthSessionUtils.ts";

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
});
