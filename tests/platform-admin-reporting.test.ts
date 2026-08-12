import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPlatformReportRequest,
  getFilenameFromContentDisposition,
  getPreviousUtcMonth,
} from "../src/utils/PlatformReportUtils.ts";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("the report month defaults to the previous UTC calendar month", () => {
  assert.equal(
    getPreviousUtcMonth(new Date("2026-08-11T12:00:00Z")),
    "2026-07",
  );
  assert.equal(
    getPreviousUtcMonth(new Date("2026-01-01T00:00:00Z")),
    "2025-12",
  );
});

void test("report requests are tenant scoped and idempotency keys are unique", () => {
  const first = buildPlatformReportRequest(
    "tenant-a",
    "conversations",
    "2026-07",
  );
  const second = buildPlatformReportRequest(
    "tenant-a",
    "conversations",
    "2026-07",
  );

  assert.deepEqual(
    {
      organization_id: first.organization_id,
      report_type: first.report_type,
      month: first.month,
    },
    {
      organization_id: "tenant-a",
      report_type: "conversations",
      month: "2026-07",
    },
  );
  assert.notEqual(first.request_id, second.request_id);
});

void test("the server supplied CSV filename is preferred", () => {
  assert.equal(
    getFilenameFromContentDisposition(
      'attachment; filename="tenant-campaigns-2026-07.csv"',
      "fallback.csv",
    ),
    "tenant-campaigns-2026-07.csv",
  );
  assert.equal(
    getFilenameFromContentDisposition(null, "fallback.csv"),
    "fallback.csv",
  );
});

void test("platform reporting uses the authenticated server export endpoint", () => {
  const query = read("../src/queries/usePlatformReports.ts");

  assert.match(query, /supabase\.auth\.getSession\(\)/);
  assert.match(query, /functions\/v1\/platform-report-export/);
  assert.match(query, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(query, /signal,/);
  assert.match(query, /X-Report-Row-Count/);
  assert.doesNotMatch(query, /activeOrgId/);
});

void test("selected-tenant reporting has a guarded route and visible navigation", () => {
  const route = read("../src/routes/platform/$organizationId/reports.tsx");
  const layout = read(
    "../src/components/platform/PlatformOrganizationDetailLayout.tsx",
  );
  const parentGuard = read("../src/routes/platform.tsx");

  assert.match(route, /\/platform\/\$organizationId\/reports/);
  assert.match(route, /PlatformReports/);
  assert.match(layout, /to: "\/platform\/\$organizationId\/reports"/);
  assert.match(parentGuard, /fetchIsPlatformAdmin\(\)/);
});

void test("tenant changes abort an in-progress report download", () => {
  const component = read("../src/components/platform/PlatformReports.tsx");

  assert.match(component, /new AbortController\(\)/);
  assert.match(
    component,
    /return \(\) => activeDownload\.current\?\.abort\(\)/,
  );
  assert.match(component, /\[organizationId\]/);
  assert.match(component, /controller\.signal\.aborted/);
});

void test("the reports view exposes UTC, live, progress, empty, and error states", () => {
  const component = read("../src/components/platform/PlatformReports.tsx");

  assert.match(component, /type="month"/);
  assert.match(component, /getPreviousUtcMonth/);
  assert.match(component, /Mes del reporte \(UTC\)/);
  assert.match(component, /Los reportes se recalculan con datos actuales/);
  assert.match(component, /Generando CSV\.\.\./);
  assert.match(component, /El CSV no contiene filas para este mes\./);
  assert.match(component, /No se pudo generar el reporte/);
});

void test("report labels exist in every supported locale", () => {
  const keys = [
    "Reportes",
    "Reportes mensuales",
    "Mes del reporte (UTC)",
    "Descargar CSV",
    "Generando CSV...",
    "No se pudo generar el reporte",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${language}.json`),
    ) as Record<string, string>;
    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing report labels`,
    );
  }
});
