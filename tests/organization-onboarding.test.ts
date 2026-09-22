import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildOrganizationProvisioningPayload,
  getOrganizationProvisioningFingerprint,
  type OrganizationProvisioningDraft,
  validateOrganizationProvisioningDraft,
} from "../src/utils/OrganizationProvisioningUtils.ts";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const validDraft = (): OrganizationProvisioningDraft => ({
  organizationName: "Example Tenant",
  ownerName: "Owner User",
  ownerEmail: " Owner@Example.com ",
  members: [
    {
      id: "member-1",
      name: "Agent User",
      email: " agent@example.com ",
      role: "agent",
    },
  ],
  maxAgentSeats: "2",
  storageQuotaGb: 25,
  autoAssign: true,
});

void test("organization onboarding validates team emails and agent capacity", () => {
  assert.deepEqual(validateOrganizationProvisioningDraft(validDraft()), []);

  const duplicate = validDraft();
  duplicate.members[0].email = "owner@example.com";
  assert.ok(
    validateOrganizationProvisioningDraft(duplicate).includes(
      "duplicate_email",
    ),
  );

  const overCapacity = validDraft();
  overCapacity.maxAgentSeats = "1";
  overCapacity.members.push({
    id: "member-2",
    name: "Supervisor User",
    email: "supervisor@example.com",
    role: "supervisor",
  });
  assert.ok(
    validateOrganizationProvisioningDraft(overCapacity).includes(
      "agent_capacity_exceeded",
    ),
  );
});

void test("organization onboarding normalizes payloads and keeps retries idempotent", () => {
  const payload = buildOrganizationProvisioningPayload(
    validDraft(),
    "00000000-0000-4000-8000-000000000001",
  );
  assert.equal(payload.organization_name, "Example Tenant");
  assert.equal(payload.owner.email, "owner@example.com");
  assert.equal(payload.members[0].email, "agent@example.com");
  assert.equal(payload.max_agent_seats, 2);

  assert.equal(
    getOrganizationProvisioningFingerprint(payload),
    getOrganizationProvisioningFingerprint({
      ...payload,
      request_id: "00000000-0000-4000-8000-000000000002",
    }),
  );
});

void test("Super Admin onboarding uses the protected function and paginated history", () => {
  const component = read(
    "../src/components/platform/PlatformOrganizationOnboarding.tsx",
  );
  const query = read("../src/queries/usePlatformOrganizationProvisioning.ts");
  const layout = read("../src/components/platform/PlatformLayout.tsx");

  assert.match(component, /buildOrganizationProvisioningPayload/);
  assert.match(component, /DataTablePagination/);
  assert.match(query, /functions\.invoke\("organization-provisioning"/);
  assert.match(query, /list_platform_organization_provisioning_page/);
  assert.match(query, /get_platform_organization_provisioning/);
  assert.match(query, /request_id: provisioning\.request_id/);
  assert.match(layout, /to="\/platform\/onboarding"/);
});

void test("organization onboarding labels exist in every locale", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of [
      "Incorporar organización",
      "Organización y propietario",
      "Equipo inicial",
      "Configuración inicial",
      "Historial de incorporación",
      "Crear e invitar",
      "Solicitud reintentada correctamente",
    ]) {
      assert.ok(translations[key], `${locale} is missing ${key}`);
    }
  }
});
