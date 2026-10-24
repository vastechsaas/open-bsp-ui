import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  consumeInstagramOAuthContext,
  IG_INAPP_REDIRECT_PATH,
  IG_OAUTH_CONTEXT_KEY,
  IG_OAUTH_MAX_AGE_MS,
  instagramConnectionState,
} from "../src/utils/InstagramIntegrationUtils.ts";

const now = 1_000_000_000;
function storage(value: unknown) {
  const values = new Map([[IG_OAUTH_CONTEXT_KEY, JSON.stringify(value)]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
const context = {
  state: "nonce",
  organizationId: "org-a",
  userId: "user-a",
  createdAt: now,
};

void test("Instagram callback accepts its original tenant/account once", () => {
  const pending = storage(context);
  assert.deepEqual(
    consumeInstagramOAuthContext(pending, "nonce", "org-a", "user-a", now),
    context,
  );
  assert.throws(() =>
    consumeInstagramOAuthContext(pending, "nonce", "org-a", "user-a", now),
  );
  assert.equal(IG_INAPP_REDIRECT_PATH, "/oauth/instagram");
});

void test("Instagram callback rejects changed organizations, accounts and state", () => {
  for (const [state, org, user] of [
    ["wrong", "org-a", "user-a"],
    ["nonce", "org-b", "user-a"],
    ["nonce", "org-a", "user-b"],
    ["nonce", null, "user-a"],
    [undefined, "org-a", "user-a"],
    ["nonce", "org-a", undefined],
  ] as const) {
    assert.throws(() =>
      consumeInstagramOAuthContext(storage(context), state, org, user, now),
    );
  }
});

void test("Instagram callback rejects expired, future, malformed and legacy context", () => {
  for (const value of [
    null,
    "nonce",
    {},
    { ...context, createdAt: now + 1 },
    { ...context, createdAt: now - IG_OAUTH_MAX_AGE_MS - 1 },
    { ...context, createdAt: "yesterday" },
  ]) {
    assert.throws(() =>
      consumeInstagramOAuthContext(
        storage(value),
        "nonce",
        "org-a",
        "user-a",
        now,
      ),
    );
  }
  assert.throws(() =>
    consumeInstagramOAuthContext(
      {
        getItem: () => "{broken",
        removeItem: () => {},
      },
      "nonce",
      "org-a",
      "user-a",
      now,
    ),
  );
});

void test("revoked Instagram tokens display reconnection even on connected rows", () => {
  assert.equal(
    instagramConnectionState({
      status: "connected",
      extra: { needs_reauth: "today" },
    }),
    "needs_reauth",
  );
  assert.equal(
    instagramConnectionState({
      status: "connected",
      extra: { needs_reauth: null },
    }),
    "connected",
  );
  assert.equal(
    instagramConnectionState({ status: "disconnected" }),
    "disconnected",
  );
});

void test("Instagram navigation is restored without enabling hidden media preprocessing", () => {
  const source = readFileSync(
    new URL("../src/routes/_auth/integrations/index.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /Instagram integration is intentionally hidden/);
  assert.match(source, /to: "\/integrations\/instagram"/);
  assert.match(source, /Media pre-processing is intentionally hidden/);
});

void test("Instagram connection mutations retain owner-only controls", () => {
  const connect = readFileSync(
    new URL(
      "../src/routes/_auth/integrations/instagram/new.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(connect, /role === "owner"/);
  assert.match(connect, /disabled={!isOwner}/);
  assert.match(connect, /sessionStorage.setItem/);
  assert.doesNotMatch(connect, /localStorage.setItem/);
});

void test("Instagram reconnection and failure guidance is translated", () => {
  for (const language of ["en", "pt", "fr", "sw"]) {
    const locale = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of [
      "Requiere reconexión",
      "Volver a conectar",
      "No se pudieron cargar las cuentas de Instagram.",
      "No se pudo desconectar la cuenta de Instagram.",
    ]) {
      assert.ok(locale[key], `${language}: ${key}`);
    }
  }
});
