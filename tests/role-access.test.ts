import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canAccessNavigation,
  canAccessPath,
  roleAccess,
} from "../src/utils/RoleAccess.ts";

void test("Supervisor navigation contains only oversight workspaces", () => {
  assert.deepEqual(roleAccess.supervisor, [
    "dashboard",
    "conversations",
    "quickReplies",
    "contacts",
    "teamMembers",
  ]);

  for (const access of roleAccess.supervisor) {
    assert.equal(canAccessNavigation("supervisor", access), true);
  }

  for (const access of [
    "campaigns",
    "chatbots",
    "templates",
    "integrations",
    "stats",
    "whatsappManager",
    "settings",
  ] as const) {
    assert.equal(canAccessNavigation("supervisor", access), false);
  }
});

void test("Supervisor route guard permits inbox oversight and denies management modules", () => {
  for (const path of [
    "/dashboard",
    "/conversations",
    "/conversations/new",
    "/quick-replies",
    "/contacts",
    "/contacts/contact-1",
    "/team-members",
  ]) {
    assert.equal(canAccessPath("supervisor", path), true, path);
  }

  for (const path of [
    "/campaigns",
    "/templates",
    "/chatbots",
    "/agents",
    "/integrations",
    "/stats",
    "/whatsapp-manager",
    "/settings",
    "/settings/api-keys",
  ]) {
    assert.equal(canAccessPath("supervisor", path), false, path);
  }
});

void test("Agent navigation and route guard expose only Conversations and Contacts", () => {
  assert.deepEqual(roleAccess.agent, ["conversations", "contacts"]);
  for (const path of ["/conversations", "/conversations/new", "/contacts"]) {
    assert.equal(canAccessPath("agent", path), true, path);
  }
  for (const path of [
    "/dashboard",
    "/team-members",
    "/campaigns",
    "/templates",
    "/chatbots",
    "/agents",
    "/integrations",
    "/stats",
    "/whatsapp-manager",
    "/settings",
  ]) {
    assert.equal(canAccessPath("agent", path), false, path);
  }
});

void test("existing human roles retain their current route access", () => {
  for (const role of ["owner", "admin", "member"] as const) {
    for (const path of [
      "/dashboard",
      "/conversations",
      "/contacts",
      "/campaigns",
      "/templates",
      "/chatbots",
      "/agents",
      "/integrations",
      "/stats",
      "/whatsapp-manager",
      "/settings",
    ]) {
      assert.equal(canAccessPath(role, path), true, `${role}: ${path}`);
    }
  }
});

void test("missing roles fail closed", () => {
  assert.equal(canAccessPath(undefined, "/dashboard"), false);
  assert.equal(canAccessNavigation(undefined, "dashboard"), false);
});

void test("authenticated layout redirects denied direct navigation", () => {
  const layout = readFileSync(
    new URL("../src/routes/_auth.tsx", import.meta.url),
    "utf8",
  );
  assert.match(layout, /canAccessPath\(currentRole, pathname\)/);
  assert.match(layout, /getDefaultPathForRole\(currentRole\)/);
});

void test("Supervisor can use templates in conversations without Template Manager access", () => {
  const footer = readFileSync(
    new URL("../src/components/ChatFooter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(footer, /import TemplatePicker/);
  assert.match(footer, /templatePicker && <TemplatePicker \/>/);
  assert.equal(canAccessPath("supervisor", "/conversations"), true);
  assert.equal(canAccessPath("supervisor", "/templates"), false);
});

void test("API-key UI types and selector remain limited to existing roles", () => {
  const databaseTypes = readFileSync(
    new URL("../src/supabase/types/database_types.ts", import.meta.url),
    "utf8",
  );
  const apiKeyForm = readFileSync(
    new URL("../src/routes/_auth/settings/api-keys/new.tsx", import.meta.url),
    "utf8",
  );
  assert.match(databaseTypes, /Exclude<Role, "supervisor" \| "agent">/);
  assert.doesNotMatch(apiKeyForm, /value: "supervisor"/);
  assert.doesNotMatch(apiKeyForm, /value: "agent"/);
});
