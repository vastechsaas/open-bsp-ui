import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isSignInPath,
  safeSignInRedirect,
  signInErrorMessage,
} from "../src/utils/SignInUtils.ts";

void test("sign-in retains internal chat destinations including search and fragment", () => {
  const chat =
    "/conversations?conversationId=chat-id&queue=assigned#message-id";
  assert.equal(safeSignInRedirect(chat), chat);
  assert.equal(
    safeSignInRedirect("/platform/organizations?search=Test%20Org#members"),
    "/platform/organizations?search=Test%20Org#members",
  );
  assert.equal(safeSignInRedirect("/"), "/");
  assert.equal(isSignInPath("/login/email"), true);
  assert.equal(isSignInPath("/login-not-a-route"), false);
});

void test("sign-in discards unsafe destinations and login loops", () => {
  for (const value of [
    undefined,
    {},
    ["//evil.example"],
    "https://evil.example/",
    "javascript:alert(1)",
    "//evil.example/",
    "/\\evil.example/",
    "/%5cevil.example/",
    "/%2fevil.example/",
    "/inside/..//evil.example/",
    "/lo\tgin",
    "/login",
    "/login/email?redirect=/dashboard",
    "/LOGIN/",
    "/x/../login",
    "/%6cogin",
    "/%zz",
  ]) {
    assert.equal(safeSignInRedirect(value), undefined, JSON.stringify(value));
  }
});

void test("sign-in distinguishes invalid credentials from transient failures", () => {
  const credentials = signInErrorMessage({ code: "invalid_credentials" });
  const transient = signInErrorMessage({ name: "AuthRetryableFetchError" });
  const other = signInErrorMessage({ code: "email_not_confirmed" });
  assert.equal(
    credentials,
    "El correo electrónico o la contraseña son incorrectos.",
  );
  assert.notEqual(transient, credentials);
  assert.notEqual(other, credentials);
  assert.notEqual(other, transient);
  assert.equal(signInErrorMessage({ status: 503 }), transient);
  assert.equal(signInErrorMessage({ status: 429 }), transient);
});

void test("legacy login forwards to the single form and does not submit credentials", () => {
  const legacy = readFileSync(
    new URL("../src/routes/login_.email.tsx", import.meta.url),
    "utf8",
  );
  assert.match(legacy, /to: "\/login"/);
  assert.match(legacy, /search: \{ redirect: search\.redirect \}/);
  assert.match(legacy, /replace: true/);
  assert.doesNotMatch(legacy, /signInWithPassword|<form/);
});
