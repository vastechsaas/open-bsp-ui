import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("selected tenant navigation exposes the Automation control panel", () => {
  const layout = read(
    "../src/components/platform/PlatformOrganizationDetailLayout.tsx",
  );
  const route = read("../src/routes/platform/$organizationId/automation.tsx");
  const panel = read(
    "../src/components/platform/PlatformOrganizationAutomation.tsx",
  );

  assert.match(layout, /\/platform\/\$organizationId\/automation/);
  assert.match(route, /PlatformOrganizationAutomation/);
  assert.match(panel, /platform/);
  assert.doesNotMatch(panel, /activeOrgId/);
});

void test("Platform queries are tenant-scoped and separate from tenant workspace keys", () => {
  const keys = read("../src/queries/queryKeys.ts");
  const query = read("../src/queries/useOrganizationAutomation.ts");

  assert.match(keys, /organizationAutomation: \(organizationId/);
  assert.match(keys, /"platform", "tenant", organizationId/);
  assert.match(query, /get_platform_organization_automation_settings/);
  assert.match(query, /update_platform_organization_contact_auto_save/);
  assert.match(query, /p_organization_id: organizationId/);
  assert.match(query, /p_request_id: crypto\.randomUUID\(\)/);
});

void test("tenant switching preserves Automation scope without stale data", () => {
  const layout = read("../src/components/platform/PlatformLayout.tsx");
  const query = read("../src/queries/useOrganizationAutomation.ts");

  assert.match(layout, /automationActive/);
  assert.match(layout, /to: "\/platform\/\$organizationId\/automation"/);
  assert.match(query, /organizationAutomation\(organizationId\)/);
  assert.match(query, /cancelQueries\(\{ queryKey \}\)/);
});
