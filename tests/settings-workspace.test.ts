import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isSettingsWorkspacePath } from "../src/utils/SettingsUtils.ts";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("Settings is a full-width workspace route", () => {
  assert.equal(isSettingsWorkspacePath("/settings"), true);
  assert.equal(isSettingsWorkspacePath("/settings/organization"), true);
  assert.equal(isSettingsWorkspacePath("/settings/webhooks/new"), true);
  assert.equal(isSettingsWorkspacePath("/team-members"), false);

  const layout = readSource("../src/routes/_auth.tsx");
  assert.match(layout, /isSettingsWorkspacePath\(pathname\)/);
});

void test("Settings navigation adds routing queues without unrelated modules", () => {
  const workspace = readSource(
    "../src/components/settings/SettingsWorkspaceLayout.tsx",
  );

  assert.match(workspace, /to: "\/settings\/organization"/);
  assert.match(workspace, /to: "\/settings\/webhooks"/);
  assert.match(workspace, /to: "\/settings\/api-keys"/);
  assert.match(workspace, /to: "\/settings\/routing-queues"/);
  assert.doesNotMatch(workspace, /members|Miembros/);
  assert.doesNotMatch(workspace, /Billing|Notifications|Security/);
});

void test("Settings landing and legacy member routes use their canonical workspaces", () => {
  const indexRoute = readSource("../src/routes/_auth/settings/index.tsx");
  const membersRoute = readSource(
    "../src/routes/_auth/settings/members/index.tsx",
  );
  const memberRoute = readSource(
    "../src/routes/_auth/settings/members/$memberId.tsx",
  );

  assert.match(indexRoute, /role === "supervisor"/);
  assert.match(indexRoute, /"\/settings\/routing-queues"/);
  assert.match(indexRoute, /"\/settings\/organization"/);
  assert.match(membersRoute, /redirect\(\{ to: "\/team-members" \}\)/);
  assert.match(memberRoute, /redirect\(\{ to: "\/team-members" \}\)/);
});

void test("Organization lifecycle, Webhooks, and API Keys content is preserved", () => {
  const organization = readSource(
    "../src/routes/_auth/settings/organization/index.tsx",
  );
  const webhooks = readSource(
    "../src/routes/_auth/settings/webhooks/index.tsx",
  );
  const apiKeys = readSource("../src/routes/_auth/settings/api-keys/index.tsx");

  assert.match(organization, /useUpdateCurrentOrganization/);
  assert.match(organization, /useArchiveCurrentOrganization/);
  assert.match(organization, /archiveReason/);
  assert.doesNotMatch(organization, /useDeleteCurrentOrganization/);
  assert.match(webhooks, /useWebhooks/);
  assert.match(apiKeys, /useApiKeys/);
});

void test("new Settings labels exist in every supported locale", () => {
  const required = [
    "Administra la configuración de tu organización y las herramientas para desarrolladores.",
    "Información y comportamiento del espacio de trabajo.",
    "Eventos para sistemas externos.",
    "Credenciales para integraciones.",
    "Archivar organización",
    "Organizaciones archivadas",
    "Restaurar organización",
    "Eliminar organización definitivamente",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readSource(`../public/locales/${language}.json`),
    ) as Record<string, string>;

    for (const label of required) {
      assert.ok(translations[label], `${language}: ${label}`);
    }
  }
});
