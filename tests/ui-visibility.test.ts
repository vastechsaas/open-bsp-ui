import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isVisibleMemberRole,
  isVisibleNavigationPath,
} from "../src/utils/UiVisibility.ts";
import {
  ORGANIZATION_PROVISIONING_ROLES,
  buildOrganizationProvisioningPayload,
  createOrganizationProvisioningDraft,
} from "../src/utils/OrganizationProvisioningUtils.ts";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

void test("hide only requested navigation entries, retaining their routes", () => {
  for (const path of ["/stats", "/settings/webhooks", "/settings/api-keys"]) {
    assert.equal(isVisibleNavigationPath(path), false);
  }
  for (const path of [
    "/dashboard",
    "/integrations",
    "/settings/organization",
  ]) {
    assert.equal(isVisibleNavigationPath(path), true);
  }
  assert.match(
    source("src/components/Menu.tsx"),
    /isVisibleNavigationPath\("\/stats"\) && \(/,
  );
  const settings = source(
    "src/components/settings/SettingsWorkspaceLayout.tsx",
  );
  assert.match(
    settings,
    /settingsNavigation.filter\(\(item\) =>\s*isVisibleNavigationPath\(item.to\)/,
  );
  assert.doesNotMatch(settings, /[?:] settingsNavigation[;.]/);
  assert.match(source("src/routes/_auth/stats.tsx"), /createFileRoute/);
  assert.match(
    source("src/routes/_auth/settings/webhooks/index.tsx"),
    /useWebhooks/,
  );
  assert.match(
    source("src/routes/_auth/settings/api-keys/index.tsx"),
    /useApiKeys/,
  );
});

void test("Administrator is hidden from tenant and platform role choices", () => {
  assert.equal(isVisibleMemberRole("admin"), false);
  for (const role of ["owner", "supervisor", "member", "agent"]) {
    assert.equal(isVisibleMemberRole(role), true);
  }
  assert.deepEqual(
    ORGANIZATION_PROVISIONING_ROLES.map((role) => role.value),
    ["owner", "supervisor", "member", "agent"],
  );
  const members = source("src/routes/_auth/team-members/index.tsx");
  assert.match(members, /roles\s*\.filter\(isVisibleMemberRole\)/);
  assert.doesNotMatch(members, /value: "admin"/);
  // Existing administrators keep their real role displayed; opening/editing
  // their record cannot silently select a different role.
  assert.match(members, /useState<TeamMemberRole>\(member.role\)/);
  assert.match(
    members,
    /!isVisibleMemberRole\(role\) \? \([\s\S]*?\{labels\[role\]\}/,
  );
  const permissions = source(
    "src/components/platform/PlatformModulePermissions.tsx",
  );
  assert.match(
    permissions,
    /rows.filter\(\(row\) => isVisibleMemberRole\(row.role\)\)/,
  );
  assert.match(permissions, /permissions: rows,/);
});

void test("hiding does not remove administrator support or change stored payloads", () => {
  const draft = createOrganizationProvisioningDraft();
  draft.members = [
    {
      id: "existing",
      name: "Existing admin",
      email: "admin@example.com",
      role: "admin",
    },
  ];
  assert.equal(
    buildOrganizationProvisioningPayload(draft, "request-id").members[0].role,
    "admin",
  );
  assert.match(
    source("src/supabase/db_types.ts"),
    /role: \["owner", "admin", "supervisor", "member", "agent"\]/,
  );
});

void test("revised onboarding guidance is translated in every locale", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      source(`public/locales/${locale}.json`),
    ) as Record<string, string>;
    assert.ok(
      translations[
        "Agregá supervisores, miembros o agentes. También podés hacerlo después."
      ],
    );
  }
});
