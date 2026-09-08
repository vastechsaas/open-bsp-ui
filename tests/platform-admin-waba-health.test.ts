import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isWhatsAppHealthCheckStale,
  runWithConcurrency,
} from "../src/utils/PlatformWhatsAppHealthUtils.ts";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("connected accounts refresh after five minutes while disconnected accounts do not", () => {
  const now = Date.parse("2026-08-14T12:00:00Z");
  assert.equal(isWhatsAppHealthCheckStale("connected", null, now), true);
  assert.equal(
    isWhatsAppHealthCheckStale("connected", "2026-08-14T11:54:59Z", now),
    true,
  );
  assert.equal(
    isWhatsAppHealthCheckStale("connected", "2026-08-14T11:56:00Z", now),
    false,
  );
  assert.equal(isWhatsAppHealthCheckStale("disconnected", null, now), false);
});

void test("automatic health checks never exceed three concurrent requests", async () => {
  let active = 0;
  let peak = 0;
  await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
  });
  assert.equal(peak, 3);
});

void test("health queries use protected tenant-scoped RPCs and actions", () => {
  const query = read("../src/queries/usePlatformWhatsAppHealth.ts");
  assert.match(query, /list_platform_whatsapp_health_page/);
  assert.match(query, /get_platform_whatsapp_health/);
  assert.match(query, /functions\/v1\/platform-whatsapp-health/);
  assert.match(query, /organization_id: organizationId/);
  assert.match(query, /phone_number_id: phoneNumberId/);
  assert.match(query, /request_id: crypto\.randomUUID\(\)/);
  assert.match(query, /signal,/);
  assert.doesNotMatch(query, /access_token:/);
  assert.doesNotMatch(query, /verify_token/);
});

void test("selected organization routes expose a flat list and detail", () => {
  const layout = read(
    "../src/components/platform/PlatformOrganizationDetailLayout.tsx",
  );
  const list = read("../src/components/platform/PlatformWhatsAppHealth.tsx");
  const detail = read(
    "../src/components/platform/PlatformWhatsAppHealthDetail.tsx",
  );
  const listRoute = read(
    "../src/routes/platform/$organizationId/waba-health/index.tsx",
  );
  const detailRoute = read(
    "../src/routes/platform/$organizationId/waba-health/$phoneNumberId.tsx",
  );

  assert.match(layout, /Salud de WABA/);
  assert.match(listRoute, /\/platform\/\$organizationId\/waba-health\//);
  assert.match(
    detailRoute,
    /\/platform\/\$organizationId\/waba-health\/\$phoneNumberId/,
  );
  assert.match(list, /<table/);
  assert.match(detail, /Identificadores de Meta/);
  assert.match(detail, /divide-y divide-border/);
  assert.doesNotMatch(list + detail, /<article/);
  assert.doesNotMatch(detail, /Reconnect|Reconectar/);
});

void test("list supports search, status, pagination and cancellable automatic checks", () => {
  const list = read("../src/components/platform/PlatformWhatsAppHealth.tsx");
  assert.match(list, /useDebouncedValue/);
  assert.match(list, /Todos los estados de salud/);
  assert.match(list, /DataTablePagination/);
  assert.match(list, /runWithConcurrency\(stale, 3/);
  assert.match(list, /new AbortController\(\)/);
  assert.match(list, /return \(\) => controller\.abort\(\)/);
  for (const status of ["healthy", "warning", "disconnected", "unknown"]) {
    assert.match(list, new RegExp(`value="${status}"`));
  }
});

void test("detail provides only the three approved audited actions", () => {
  const detail = read(
    "../src/components/platform/PlatformWhatsAppHealthDetail.tsx",
  );
  assert.match(detail, /test_connection/);
  assert.match(detail, /refresh_account/);
  assert.match(detail, /sync_templates/);
  assert.match(detail, /Probar conexion/);
  assert.match(detail, /Actualizar informacion/);
  assert.match(detail, /Sincronizar plantillas/);
  assert.doesNotMatch(detail, /reconnect/);
});

void test("WABA Health labels exist in every supported locale", () => {
  const keys = [
    "Salud de WABA",
    "Buscar cuenta de WhatsApp",
    "Todos los estados de salud",
    "Saludable",
    "Advertencia",
    "Desconectado",
    "Desconocido",
    "Probar conexion",
    "Actualizar informacion",
    "Sincronizar plantillas",
    "Identificadores de Meta",
    "Errores recientes",
  ];
  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${language}.json`),
    ) as Record<string, string>;
    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing WABA Health labels`,
    );
  }
});
