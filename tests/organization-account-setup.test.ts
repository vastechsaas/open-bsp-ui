import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  buildOrganizationSetupPayload,
  directSetupValid,
  setupPersonReady,
  setupPersonLabel,
  type OrganizationSetupPerson,
} from "../src/utils/OrganizationSetupUtils.ts";
import {
  createOrganizationProvisioningDraft,
  getOrganizationProvisioningFingerprint,
} from "../src/utils/OrganizationProvisioningUtils.ts";
const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
void test("independent setup modes default to invitation and never serialize credentials", () => {
  const draft = {
    ...createOrganizationProvisioningDraft(),
    organizationName: "Example",
    ownerName: "Owner",
    ownerEmail: "owner@example.test",
    members: [
      { id: "a", name: "A", email: "a@example.test", role: "agent" as const },
      {
        id: "b",
        name: "B",
        email: "b@example.test",
        role: "supervisor" as const,
        setupMode: "pending" as const,
      },
    ],
  };
  const payload = buildOrganizationSetupPayload(draft, "direct", "request");
  assert.equal(payload.owner.mode, "direct");
  assert.equal(payload.members[0].mode, "invitation");
  assert.equal(payload.members[1].mode, "pending");
  assert.equal(payload.members[0].client_key, "a");
  assert.doesNotMatch(JSON.stringify(payload), /password|confirmation/);
  assert.equal(
    getOrganizationProvisioningFingerprint(payload),
    getOrganizationProvisioningFingerprint({ ...payload, request_id: "retry" }),
  );
});
void test("readiness does not require recipients to join and direct setup requires explicit matching confirmation", () => {
  const person = { status: "invitation_sent" } as OrganizationSetupPerson;
  assert.equal(setupPersonReady(person), true);
  assert.equal(setupPersonLabel(person), "Invitación enviada");
  assert.equal(setupPersonReady({ ...person, status: "failed" }), false);
  assert.equal(
    setupPersonReady({ ...person, status: "pending_membership" }),
    true,
  );
  for (const secret of [
    undefined,
    { password: "", confirmation: "", confirmed: true },
    { password: "a", confirmation: "b", confirmed: true },
    { password: "a", confirmation: "a", confirmed: false },
  ])
    assert.equal(directSetupValid(secret), false);
  assert.equal(
    directSetupValid({ password: "a", confirmation: "a", confirmed: true }),
    true,
  );
});
void test("wizard reuses shared fields, locks ambiguous creates and separates legacy history retries", () => {
  const wizard = read(
    "src/components/platform/PlatformOrganizationOnboarding.tsx",
  );
  for (const text of [
    "<AccountSetupFields",
    "<InitialAccountSetup",
    "createLocked",
    "processingSecrets.current.clear()",
    "item.setup_version!==2",
    "<OrganizationSetupProgress",
  ])
    assert.ok(
      wizard.replace(/\s+/g, "").includes(text.replace(/\s+/g, "")),
      text,
    );
  const query = read("src/queries/useOrganizationSetup.ts");
  assert.match(query, /userId,provisioningId|userId, provisioningId/);
  assert.match(query, /abortSignal|signal/);
  const progress = read(
    "src/components/platform/OrganizationSetupProgress.tsx",
  );
  for (const text of [
    "setupPersonReady",
    "secrets?.delete",
    "secrets?.clear",
    "AbortController",
    "queueMicrotask",
    "ui.user?.id",
  ])
    assert.ok(progress.includes(text), text);
});
void test("all new setup labels are translated", () => {
  const keys = [
    "Pendiente de configuración",
    "Continuar configuración",
    "Reintentar configuración",
    "Ver configuración de acceso",
    "Organización creada. La configuración de acceso se muestra por persona.",
    "No se pudo cargar la configuración de acceso.",
    "La organización está creada. Revisá el acceso de cada persona; una invitación enviada no significa que ya se haya unido.",
    "No se pudo confirmar la configuración. Consultá el estado antes de reintentar.",
    "Confirmá las contraseñas y la creación directa de cada persona.",
    "No se pudo confirmar la creación. Reintentá la misma solicitud antes de cambiar los datos.",
    "Creá la organización y configurá el acceso del propietario y del equipo inicial desde un solo lugar.",
    "Elegí cómo configurar el acceso del propietario.",
    "La organización se crea una sola vez. Los errores de acceso se reintentan por persona desde el historial.",
  ];
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const messages = JSON.parse(
      read(`public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(messages[key], `${locale}: ${key}`);
  }
});
