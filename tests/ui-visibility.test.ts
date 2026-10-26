import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isVisibleInvitationRole,
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
    /settingsNavigation.filter\(\(item\) =>\s*isVisibleNavigationPath\(item.to, organization.data\?\.extra\)/,
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

void test("organization visibility hides only configured tabs without affecting other organizations", () => {
  const extra = {
    ui_visibility: {
      hidden_paths: [
        "/quick-replies",
        "/campaigns",
        "/chatbots",
        "/team-members",
        "/whatsapp-manager",
      ],
      settings_visible_paths: ["/settings/organization"],
    },
  };
  for (const path of extra.ui_visibility.hidden_paths) {
    assert.equal(isVisibleNavigationPath(path, extra), false, path);
    assert.equal(isVisibleNavigationPath(path, {}), true, path);
    assert.equal(isVisibleNavigationPath(path), true, path);
  }
  for (const path of [
    "/dashboard",
    "/conversations",
    "/contacts",
    "/templates",
    "/integrations",
    "/settings",
    "/settings/organization",
  ])
    assert.equal(isVisibleNavigationPath(path, extra), true, path);
  for (const path of [
    "/settings/preferences",
    "/settings/business-hours",
    "/settings/media-management",
    "/settings/appearance",
    "/settings/routing-queues",
    "/settings/automation",
    "/settings/webhooks",
    "/settings/api-keys",
  ])
    assert.equal(isVisibleNavigationPath(path, extra), false, path);
});

void test("missing or malformed organization visibility retains existing behavior", () => {
  for (const extra of [
    null,
    undefined,
    [],
    "invalid",
    {},
    { ui_visibility: null },
    { ui_visibility: [] },
    {
      ui_visibility: { hidden_paths: true, settings_visible_paths: "invalid" },
    },
  ]) {
    assert.equal(isVisibleNavigationPath("/campaigns", extra), true);
    assert.equal(isVisibleNavigationPath("/settings/appearance", extra), true);
    assert.equal(isVisibleNavigationPath("/settings/api-keys", extra), false);
  }
});

void test("sidebar and settings use current organization metadata without tenant IDs or permission changes", () => {
  const menu = source("src/components/Menu.tsx");
  assert.match(
    menu,
    /organizations\?\.find\(\s*\(org\) => org.id === activeOrgId,?\s*\)/,
  );
  assert.match(
    menu,
    /!!currentOrganization &&\s*isVisibleNavigationPath\(path, currentOrganization.extra\)/,
  );
  for (const path of [
    "quick-replies",
    "campaigns",
    "chatbots",
    "team-members",
    "whatsapp-manager",
  ])
    assert.ok(menu.includes(`visible={visibleNavigation("/${path}")}`));
  const link = source("src/components/LinkButton.tsx");
  assert.match(link, /if \(!visible\) return null/);
  assert.match(
    link,
    /if \(access && !canAccessNavigation\(role, access\)\) return null/,
  );
  const settings = source(
    "src/components/settings/SettingsWorkspaceLayout.tsx",
  );
  assert.match(settings, /organization.isSuccess \? navigation : \[\]/);
  assert.doesNotMatch(
    source("src/utils/UiVisibility.ts"),
    /bf15dc18|Test Organization/,
  );
});

void test("Administrator is hidden from tenant and platform role choices", () => {
  assert.equal(isVisibleMemberRole("admin"), false);
  for (const role of ["owner", "supervisor", "member", "agent"]) {
    assert.equal(isVisibleMemberRole(role), true);
  }
  assert.deepEqual(
    ORGANIZATION_PROVISIONING_ROLES.map((role) => role.value),
    ["owner", "supervisor", "agent"],
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
        "Agregá supervisores o agentes. También podés hacerlo después."
      ],
    );
  }
});

void test("invitation choices hide Member without removing existing member support", () => {
  for (const role of ["member", "admin"]) {
    assert.equal(isVisibleInvitationRole(role), false);
  }
  for (const role of ["owner", "supervisor", "agent"]) {
    assert.equal(isVisibleInvitationRole(role), true);
  }
  assert.equal(isVisibleMemberRole("member"), true);
  const members = source("src/routes/_auth/team-members/index.tsx");
  assert.match(
    members,
    /getInvitableTeamMemberRoles\(currentRole\).filter\(\s*isVisibleInvitationRole/,
  );
  assert.match(members, /useState<TeamMemberRole>\("agent"\)/);
  assert.match(members, /useState<TeamMemberRole>\(member.role\)/);
  const draft = createOrganizationProvisioningDraft();
  draft.members = [
    {
      id: "existing",
      name: "Existing member",
      email: "member@example.com",
      role: "member",
    },
  ];
  assert.equal(
    buildOrganizationProvisioningPayload(draft, "request-id").members[0].role,
    "member",
  );
});

void test("profile menu hides the language selector but preserves translations and logout", () => {
  const menu = source("src/components/Menu.tsx");
  assert.doesNotMatch(menu, /key: "lang"|setCurrentLanguage|<Languages/);
  assert.match(menu, /useTranslation/);
  assert.match(menu, /key: "logout"/);
  assert.match(menu, /key: "orgs"/);
  assert.match(source("src/hooks/useTranslation.tsx"), /setCurrentLanguage/);
});
