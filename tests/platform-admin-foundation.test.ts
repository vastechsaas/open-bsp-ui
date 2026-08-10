import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ALL_TENANTS_VALUE,
  formatPlatformMetric,
  getAuthenticatedHomePath,
  getPlatformScopePath,
  isPlatformPath,
} from "../src/utils/PlatformAdminUtils.ts";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("platform route and landing helpers keep tenant and platform modes separate", () => {
  assert.equal(getAuthenticatedHomePath(true), "/platform");
  assert.equal(getAuthenticatedHomePath(false), "/dashboard");
  assert.equal(getPlatformScopePath(), "/platform");
  assert.equal(getPlatformScopePath("tenant-a"), "/platform/tenant-a");
  assert.equal(isPlatformPath("/platform"), true);
  assert.equal(isPlatformPath("/platform/tenant-a"), true);
  assert.equal(isPlatformPath("/dashboard"), false);
  assert.equal(ALL_TENANTS_VALUE, "all");
  assert.equal(formatPlatformMetric(1200), "1,200");
});

void test("platform routes are guarded by backend authorization", () => {
  const route = read("../src/routes/platform.tsx");
  const root = read("../src/routes/__root.tsx");
  const login = read("../src/routes/login_.email.tsx");

  assert.match(route, /fetchIsPlatformAdmin\(\)/);
  assert.match(route, /redirect\(\{ to: "\/dashboard" \}\)/);
  assert.match(root, /resolveAuthenticatedHome\(\)/);
  assert.match(login, /resolveAuthenticatedHome\(\)/);
});

void test("platform mode does not mount ordinary tenant initialization or realtime", () => {
  const root = read("../src/routes/__root.tsx");

  assert.match(root, /function TenantRuntime\(\)/);
  assert.match(
    root,
    /!isPlatformPath\(location\.pathname\) && <TenantRuntime \/>/,
  );
  assert.doesNotMatch(root, /setActiveOrg\([^)]*organizationId/);
});

void test("platform data uses dedicated typed RPCs and tenant-aware query keys", () => {
  const queries = read("../src/queries/usePlatformAdmin.ts");
  const keys = read("../src/queries/queryKeys.ts");

  for (const rpc of [
    "is_platform_admin",
    "get_platform_overview",
    "list_platform_organizations_page",
    "get_platform_tenant_summary",
    "record_platform_access",
  ]) {
    assert.match(queries, new RegExp(`rpc\\("${rpc}"`));
  }

  assert.match(
    keys,
    /tenant: \(organizationId: NullableId\)[\s\S]*?organizationId/,
  );
  assert.match(keys, /organizations: \(params: object\)[\s\S]*?params/);
});

void test("one idempotent access request is generated per platform scope", () => {
  const queries = read("../src/queries/usePlatformAdmin.ts");

  assert.match(
    queries,
    /const accessKey = `\$\{scope\}:\$\{organizationId \|\| "all"\}`/,
  );
  assert.match(
    queries,
    /useMemo\([\s\S]*?accessKey, requestId: crypto\.randomUUID\(\)[\s\S]*?\[accessKey\]/,
  );
  assert.match(
    queries,
    /queryKeys\.platform\.access\(scope, organizationId, requestId\)/,
  );
  assert.match(queries, /p_request_id: requestId/);
  assert.match(queries, /staleTime: Number\.POSITIVE_INFINITY/);
});

void test("tenant selection is URL-backed and cancels the previous tenant request", () => {
  const layout = read("../src/components/platform/PlatformLayout.tsx");

  assert.match(layout, /queryClient\.cancelQueries/);
  assert.match(layout, /setPendingScope\(value\)/);
  assert.match(layout, /pendingScope \? \(/);
  assert.match(layout, /pendingOrganizationId !== organizationId/);
  assert.match(
    layout,
    /requestAnimationFrame\(\(\) => setPendingScope\(null\)\)/,
  );
  assert.match(layout, /to: "\/platform\/\$organizationId"/);
  assert.match(layout, /params: \{ organizationId: value \}/);
  assert.doesNotMatch(layout, /setActiveOrg/);
  assert.match(layout, /Todos los tenants/);
});

void test("foundation views remain read-only", () => {
  const files = [
    read("../src/components/platform/PlatformLayout.tsx"),
    read("../src/components/platform/PlatformOverview.tsx"),
    read("../src/components/platform/PlatformTenantSummary.tsx"),
    read("../src/queries/usePlatformAdmin.ts"),
  ].join("\n");

  assert.match(files, /Solo lectura/);
  assert.doesNotMatch(files, /update_platform/);
  assert.doesNotMatch(files, /delete_platform/);
  assert.doesNotMatch(files, /service_role/);
});

void test("platform labels exist in every supported locale", () => {
  const keys = [
    "Administración de plataforma",
    "Todos los tenants",
    "Modo plataforma",
    "Vista general de la plataforma",
    "Miembros humanos",
    "Conversaciones activas",
    "No se pudo cargar el resumen del tenant.",
    "Solo lectura",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${language}.json`),
    ) as Record<string, string>;

    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing platform labels`,
    );
  }
});

void test("generated routes expose global and selected-tenant platform paths", () => {
  const routeTree = read("../src/routeTree.gen.ts");

  assert.match(routeTree, /'\/platform'/);
  assert.match(routeTree, /'\/platform\/\$organizationId'/);
});
