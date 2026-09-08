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
  assert.match(layout, /min-h-dvh bg-background text-foreground/);
  assert.match(layout, /min-h-\[calc\(100dvh-104px\)\] bg-background/);
  assert.doesNotMatch(layout, /min-h-dvh bg-muted\/30/);
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
  assert.match(shell, /lg:grid-cols-\[220px_minmax\(0,1fr\)\]/);
  assert.match(shell, /lg:border-r/);
  assert.match(shell, /<Outlet \/>/);
});

void test("organization overview uses flat administrative rows without cards", () => {
  const summary = read("../src/components/platform/PlatformTenantSummary.tsx");
  const overview = read("../src/components/platform/PlatformOverview.tsx");

  assert.match(summary, /AdminSection/);
  assert.match(summary, /AdminRow/);
  assert.match(summary, /ChannelRow/);
  assert.match(summary, /\/platform\/\$organizationId\/agents/);
  assert.doesNotMatch(summary, /PlatformMetricCard/);
  assert.doesNotMatch(summary, /rounded-xl border border-border bg-card/);
  assert.match(summary, /channel="WhatsApp"/);
  assert.doesNotMatch(summary, /Instagram/);
  assert.doesNotMatch(summary, /connected_instagram_account_count/);
  assert.match(overview, /label="WhatsApp"/);
  assert.doesNotMatch(overview, /Instagram/);
  assert.doesNotMatch(overview, /connected_instagram_account_count/);
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

void test("Agents supports protected management and capacity", () => {
  const agents = read(
    "../src/components/platform/PlatformOrganizationAgents.tsx",
  );
  const query = read("../src/queries/usePlatformOrganizationManagement.ts");

  assert.match(agents, /Configurar límite/);
  assert.match(agents, /Invitar agente/);
  assert.match(agents, /invitation_status/);
  assert.match(agents, /queue_names/);
  assert.match(agents, /capacity\.data\?\.over_limit/);
  assert.match(query, /get_platform_organization_agent_capacity/);
  assert.match(query, /update_platform_organization_agent_capacity/);
  assert.match(query, /create_platform_organization_agent_invitation/);
  assert.match(query, /update_platform_organization_agent/);
  assert.match(query, /remove_platform_organization_agent/);
  assert.doesNotMatch(agents, /password|role editing|impersonat/i);
});

void test("new organization-management labels exist in every locale", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of [
      "Resumen de la organización",
      "Acceso operativo",
      "Canales conectados",
      "Abrir agentes",
      "Detalles de la organización",
      "Colas de negocio",
      "Estrategia de asignación",
      "Agentes aceptados y sus colas de negocio.",
      "Capacidad de agentes",
      "Configurar límite",
      "Invitar agente",
      "Cancelar invitación",
    ]) {
      assert.ok(translations[key], `${locale} is missing ${key}`);
    }
  }
});
