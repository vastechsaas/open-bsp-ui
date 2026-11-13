import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  workspaceNavigationPending,
  workspaceStartupState,
  WORKSPACE_PROGRESS_DELAY_MS,
} from "../src/utils/WorkspaceLoadingUtils.ts";

const ready = { data: [], isError: false, isFetching: false };
const pending = { data: undefined, isError: false, isFetching: true };
const failed = { data: undefined, isError: true, isFetching: false };
const noOrganization = {
  signedIn: true,
  organizations: ready,
  invitations: ready,
  organizationCount: 0,
  hasPendingInvitations: false,
  hasActiveOrganization: false,
  activeOrganizationIsValid: false,
  membership: pending,
  hasRole: false,
};

void test("slow module navigation is eligible, but same-page refreshes and public pages are not", () => {
  assert.equal(WORKSPACE_PROGRESS_DELAY_MS, 200);
  assert.equal(
    workspaceNavigationPending(true, "/templates", "/campaigns"),
    true,
  );
  assert.equal(workspaceNavigationPending(true, "/dashboard", "/login"), true);
  assert.equal(workspaceNavigationPending(true, "/campaigns"), true);
  assert.equal(
    workspaceNavigationPending(false, "/templates", "/campaigns"),
    false,
  );
  assert.equal(
    workspaceNavigationPending(true, "/campaigns/", "/campaigns"),
    false,
  );
  for (const path of [
    "/",
    "/login",
    "/login/email",
    "/onboard/set-password",
    "/oauth/instagram",
    "/privacy",
    "/terms",
    "/data-deletion",
  ]) {
    assert.equal(
      workspaceNavigationPending(true, path, "/dashboard"),
      false,
      path,
    );
  }
});

void test("startup waits for session, organization selection, invitations and current membership", () => {
  assert.equal(
    workspaceStartupState({ ...noOrganization, signedIn: false }),
    "loading",
  );
  assert.equal(
    workspaceStartupState({ ...noOrganization, organizations: pending }),
    "loading",
  );
  assert.equal(
    workspaceStartupState({ ...noOrganization, invitations: pending }),
    "loading",
  );
  assert.equal(
    workspaceStartupState({ ...noOrganization, organizationCount: 1 }),
    "loading",
  );
  assert.equal(
    workspaceStartupState({ ...noOrganization, hasActiveOrganization: true }),
    "loading",
  );
  const selected = {
    ...noOrganization,
    organizationCount: 1,
    hasActiveOrganization: true,
    activeOrganizationIsValid: true,
  };
  assert.equal(workspaceStartupState(selected), "loading");
  assert.equal(
    workspaceStartupState({ ...selected, membership: failed }),
    "error",
  );
  assert.equal(
    workspaceStartupState({ ...selected, membership: ready }),
    "error",
  );
  assert.equal(
    workspaceStartupState({ ...selected, membership: ready, hasRole: true }),
    "ready",
  );
  assert.equal(workspaceStartupState(noOrganization), "ready");
});

void test("cached startup data stays usable and invitation acceptance stays available before tenant selection", () => {
  assert.equal(
    workspaceStartupState({
      ...noOrganization,
      organizations: failed,
      hasPendingInvitations: true,
    }),
    "invitation",
  );
  assert.equal(
    workspaceStartupState({ ...noOrganization, invitations: failed }),
    "error",
  );
  assert.equal(
    workspaceStartupState({
      ...noOrganization,
      invitations: { ...failed, isFetching: true },
    }),
    "loading",
  );
  assert.equal(
    workspaceStartupState({
      ...noOrganization,
      organizations: { ...ready, isFetching: true },
      invitations: { ...ready, isError: true },
    }),
    "ready",
  );
});

void test("new workspace loading copy is available in all translated locales", () => {
  for (const lang of ["en", "fr", "pt", "sw"]) {
    const dictionary = JSON.parse(
      readFileSync(
        new URL("../public/locales/" + lang + ".json", import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of [
      "Cargando módulo…",
      "Cargando el espacio de trabajo…",
      "No se pudo cargar el espacio de trabajo.",
    ])
      assert.ok(dictionary[key], lang + ": " + key);
  }
});
