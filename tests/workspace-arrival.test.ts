import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  useWorkspaceArrival,
  workspaceArrivalReady,
  WORKSPACE_ARRIVAL_MIN_MS,
} from "../src/stores/workspaceArrival.ts";

void test("arrival starts only on demand and retains one start time across routes", () => {
  const state = useWorkspaceArrival.getState;
  assert.equal(state().startedAt, null);
  state().ready("/dashboard");
  assert.equal(state().readyPath, null);
  state().begin();
  const startedAt = state().startedAt;
  assert.notEqual(startedAt, null);
  state().begin();
  assert.equal(state().startedAt, startedAt);
  state().ready("/conversations");
  assert.equal(state().readyPath, "/conversations");
  state().finish();
  assert.equal(state().startedAt, null);
  assert.equal(state().readyPath, null);
});

void test("arrival waits for the settled destination and its matching tenant startup", () => {
  const waiting = {
    routeSettled: false,
    pathname: "/dashboard",
    tenantRoute: true,
    routeFailed: false,
    readyPath: "/dashboard",
  };
  assert.equal(workspaceArrivalReady(waiting), false);
  assert.equal(
    workspaceArrivalReady({
      ...waiting,
      routeSettled: true,
      readyPath: "/conversations",
    }),
    false,
  );
  assert.equal(workspaceArrivalReady({ ...waiting, routeSettled: true }), true);
  assert.equal(
    workspaceArrivalReady({
      ...waiting,
      routeSettled: true,
      pathname: "/platform",
      tenantRoute: false,
    }),
    true,
  );
  assert.equal(
    workspaceArrivalReady({
      ...waiting,
      routeSettled: true,
      readyPath: null,
      routeFailed: true,
    }),
    true,
  );
  assert.equal(WORKSPACE_ARRIVAL_MIN_MS, 4_000);
});

void test("arrival only starts on sign-in and its caption is translated", () => {
  const auth = readFileSync(
    new URL("../src/hooks/useAuth.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    auth,
    /event === "SIGNED_IN"[\s\S]*?isSignInPath\(window\.location\.pathname\)[\s\S]*?useWorkspaceArrival\.getState\(\)\.begin\(\)/,
  );
  for (const lang of ["en", "fr", "pt", "sw"]) {
    const value = JSON.parse(
      readFileSync(
        new URL("../public/locales/" + lang + ".json", import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.ok(value["Estamos preparando todo para vos."], lang);
  }
});
