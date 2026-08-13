import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("global platform overview relies on the authoritative tenant selector", () => {
  const overview = read("../src/components/platform/PlatformOverview.tsx");
  const layout = read("../src/components/platform/PlatformLayout.tsx");

  assert.doesNotMatch(overview, /DataTablePagination/);
  assert.doesNotMatch(overview, /usePlatformOrganizations/);
  assert.match(layout, /showSearch/);
  assert.match(layout, /Detalles de la organización/);
  assert.match(layout, /to="\/platform\/\$organizationId"/);
});

void test("selected organizations expose one reusable detail shell", () => {
  const parentRoute = read("../src/routes/platform/$organizationId.tsx");
  const shell = read(
    "../src/components/platform/PlatformOrganizationDetailLayout.tsx",
  );

  assert.match(parentRoute, /PlatformOrganizationDetailLayout/);
  assert.match(shell, /\/platform\/\$organizationId\/queues/);
  assert.match(shell, /\/platform\/\$organizationId\/agents/);
  assert.doesNotMatch(shell, /Reportes/);
  assert.doesNotMatch(shell, /xl:grid-cols-\[280px/);
  assert.doesNotMatch(shell, /max-w-\[1760px\]/);
  assert.doesNotMatch(shell, /accepted_agent_count/);
  assert.match(shell, /border-b border-border pb-5/);
  assert.match(shell, /<Outlet \/>/);
});

void test("organization overview uses a dense responsive metric grid", () => {
  const summary = read("../src/components/platform/PlatformTenantSummary.tsx");

  assert.match(summary, /xl:grid-cols-5/);
  assert.doesNotMatch(summary, /2xl:grid-cols-5/);
  assert.doesNotMatch(summary, /text-xl font-semibold/);
});

void test("platform queue management uses protected platform RPCs and request ids", () => {
  const query = read("../src/queries/usePlatformOrganizationManagement.ts");
  const queues = read(
    "../src/components/platform/PlatformOrganizationQueues.tsx",
  );

  assert.match(query, /list_platform_routing_queues_page/);
  assert.match(query, /list_platform_organization_agents_page/);
  assert.match(query, /create_platform_routing_queue/);
  assert.match(query, /update_platform_routing_queue/);
  assert.match(query, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(query, /activeOrgId/);
  assert.match(queues, /Estrategia de asignación/);
  assert.match(queues, /t\("Manual"\)/);
});

void test("tenant and Platform Admin queues share the same editor presentation", () => {
  const tenant = read("../src/routes/_auth/settings/routing-queues.tsx");
  const platform = read(
    "../src/components/platform/PlatformOrganizationQueues.tsx",
  );

  assert.match(tenant, /RoutingQueueEditorDialog/);
  assert.match(platform, /RoutingQueueEditorDialog/);
});

void test("Agents remains a read-only organization view", () => {
  const agents = read(
    "../src/components/platform/PlatformOrganizationAgents.tsx",
  );

  assert.match(agents, /Solo lectura/);
  assert.match(agents, /queue_names/);
  assert.doesNotMatch(agents, /useCreatePlatformRoutingQueue/);
  assert.doesNotMatch(agents, /invite/i);
});

void test("new organization-management labels exist in every locale", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of [
      "Detalles de la organización",
      "Colas de negocio",
      "Estrategia de asignación",
      "Agentes aceptados y sus colas de negocio.",
    ]) {
      assert.ok(translations[key], `${locale} is missing ${key}`);
    }
  }
});
