import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  integrationEnabled,
  integrationSaveRows,
  managementIntegration,
} from "../src/utils/IntegrationAvailabilityUtils.ts";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
void test("availability fails closed when unknown and independently evaluates providers", () => {
  assert.equal(integrationEnabled(undefined, "whatsapp"), false);
  const settings = {
    revision: 1,
    integrations: [
      { id: "whatsapp", name: "WhatsApp", enabled: false },
      { id: "instagram", name: "Instagram", enabled: true },
    ],
  };
  assert.equal(integrationEnabled(settings, "whatsapp"), false);
  assert.equal(integrationEnabled(settings, "instagram"), true);
  assert.equal(integrationEnabled(settings, "future_connector"), false);
  assert.deepEqual(integrationSaveRows(settings), [
    { id: "whatsapp", enabled: false },
    { id: "instagram", enabled: true },
  ]);
});
void test("management gates cover setup, profile, onboarding and Manager but never operational templates or messages", () => {
  for (const path of [
    "/integrations/whatsapp",
    "/integrations/whatsapp/new",
    "/integrations/whatsapp/onboarding/new",
    "/integrations/whatsapp/number/profile",
    "/whatsapp-manager",
  ])
    assert.equal(managementIntegration(path), "whatsapp");
  for (const path of [
    "/integrations/instagram",
    "/integrations/instagram/new",
    "/integrations/instagram/onboarding/token",
  ])
    assert.equal(managementIntegration(path), "instagram");
  for (const path of [
    "/conversations",
    "/campaigns",
    "/integrations",
    "/templates",
    "/integrations/whatsapp/number/templates",
    "/integrations/whatsapp/number/templates/new",
    "/integrations/whatsapp/number/templates/id",
  ])
    assert.equal(managementIntegration(path), null);
});
void test("queries isolate users/organizations, abort obsolete requests and re-fetch authoritative availability", () => {
  const query = source("src/queries/useIntegrationAvailability.ts");
  assert.match(query, /orgId, "integration-availability", userId/);
  for (const text of [
    "abortSignal(signal)",
    "cancelQueries",
    "removeQueries",
    "private: true",
    "refetchOnWindowFocus: true",
    "refetchOnReconnect: true",
    "invalidateQueries",
  ])
    assert.ok(query.includes(text));
  assert.match(query, /p_request_id: input.requestId/);
  assert.match(query, /p_expected_revision: input.revision/);
});
void test("shared boundary unmounts management content on revocation and shows loading/retry separately", () => {
  const gate = source("src/components/IntegrationManagementGate.tsx");
  assert.ok(
    gate.indexOf("if (!query.isSuccess)") < gate.indexOf("return children"),
  );
  assert.match(gate, /!integrationEnabled/);
  assert.match(gate, /query.refetch/);
  const layout = source("src/routes/_auth.tsx");
  assert.match(layout, /useIntegrationAvailabilityRefresh\(\)/);
  assert.match(layout, /IntegrationManagementGate integration=\{integration\}/);
  assert.match(
    source("src/components/Menu.tsx"),
    /integrationEnabled\(integrationAvailability.data, "whatsapp"\)/,
  );
});
void test("Super Admin form has toggles, explicit save, safe disabling warning, unsaved and conflict states", () => {
  const form = source(
    "src/components/platform/PlatformIntegrationAvailability.tsx",
  );
  for (const text of [
    "<Switch",
    "Guardar cambios",
    "useBlocker",
    '"40001"',
    "connected_count",
    "solicitudes de configuración ya aceptadas",
    "requestId",
    "onReload",
  ])
    assert.ok(form.includes(text));
  assert.match(
    source("src/components/platform/PlatformOrganizationDetailLayout.tsx"),
    /organizationId\/integrations/,
  );
});
void test("new UI strings are translated in every supported locale", () => {
  const paths = [
    "src/components/IntegrationManagementGate.tsx",
    "src/components/platform/PlatformIntegrationAvailability.tsx",
    "src/routes/_auth/integrations/index.tsx",
  ];
  const keys = paths.flatMap((path) =>
    [...source(path).matchAll(/t\("([^"\n]+)"\)/g)].map((match) => match[1]),
  );
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      source(`public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(translations[key], `${locale}: ${key}`);
  }
});
