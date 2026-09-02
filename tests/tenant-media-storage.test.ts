import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatStorageBytes,
  mediaStorageStatusLabel,
} from "../src/utils/MediaStorageUtils.ts";
import { canAccessPath } from "../src/utils/RoleAccess.ts";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("tenant media management is readable by every accepted human role", () => {
  for (const role of [
    "owner",
    "admin",
    "supervisor",
    "member",
    "agent",
  ] as const) {
    assert.equal(canAccessPath(role, "/settings/media-management"), true, role);
  }
  assert.equal(canAccessPath("agent", "/settings/organization"), false);

  const route = read("../src/routes/_auth/settings/media-management.tsx");
  const panel = read("../src/components/settings/MediaStoragePanel.tsx");
  assert.match(route, /useOrganizationMediaStorage/);
  assert.doesNotMatch(route, /update_platform|Configurar cuota|Reconciliar/);
  assert.match(panel, /imágenes, audio, video y documentos/);
  assert.match(panel, /no se eliminan/);
});

void test("Platform Admin gets global and tenant-scoped storage controls", () => {
  const global = read("../src/components/platform/PlatformMediaStorage.tsx");
  const detail = read(
    "../src/components/platform/PlatformOrganizationMediaStorage.tsx",
  );
  const query = read("../src/queries/useMediaStorage.ts");
  const layout = read("../src/components/platform/PlatformLayout.tsx");
  const tenantLayout = read(
    "../src/components/platform/PlatformOrganizationDetailLayout.tsx",
  );

  assert.match(global, /usePlatformMediaStoragePage/);
  assert.match(global, /DataTablePagination/);
  assert.match(global, /Buscar tenant/);
  assert.match(global, /safe|approaching|critical/);
  assert.match(detail, /MEDIA_STORAGE_QUOTA_OPTIONS/);
  assert.match(detail, /Reconciliar uso/);
  assert.match(query, /update_platform_organization_media_storage_quota/);
  assert.match(query, /p_page_size: params\.pageSize/);
  assert.match(query, /reconcile_platform_organization_media_storage/);
  assert.match(query, /p_request_id: crypto\.randomUUID\(\)/);
  assert.match(layout, /to="\/platform\/storage"/);
  assert.match(tenantLayout, /\/platform\/\$organizationId\/storage/);
});

void test("storage display helpers keep quota values understandable", () => {
  assert.equal(formatStorageBytes(25_000_000_000), "25.0 GB");
  assert.equal(formatStorageBytes(750_000_000), "750.0 MB");
  const t = (value: string) => value;
  assert.equal(mediaStorageStatusLabel("safe", t), "Seguro");
  assert.equal(
    mediaStorageStatusLabel("approaching", t),
    "Acercándose al límite",
  );
  assert.equal(mediaStorageStatusLabel("critical", t), "Crítico");
});

void test("media storage labels exist in every supported locale", () => {
  const required = [
    "Administración de medios",
    "Uso de almacenamiento",
    "Cuota asignada",
    "Acercándose al límite",
    "Crítico",
    "Administración de almacenamiento",
    "Configurar cuota",
    "Reconciliar uso",
  ];
  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${language}.json`),
    ) as Record<string, string>;
    for (const key of required) {
      assert.ok(translations[key], `${language}: ${key}`);
    }
  }
});
