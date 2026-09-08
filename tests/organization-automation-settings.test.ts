import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("tenant Automation is available to Owner, Admin and Supervisor", () => {
  const layout = read("../src/components/settings/SettingsWorkspaceLayout.tsx");
  const route = read("../src/routes/_auth/settings/automation.tsx");
  const roleAccess = read("../src/utils/RoleAccess.ts");
  const switchControl = read("../src/components/Switch.tsx");

  assert.match(layout, /\/settings\/automation/);
  assert.match(layout, /item\.to === "\/settings\/automation"/);
  assert.match(route, /\["owner", "admin", "supervisor"\]/);
  assert.match(route, /Solo propietarios, administradores y supervisores/);
  assert.match(roleAccess, /pathname\.startsWith\("\/settings\/automation"\)/);
  assert.match(switchControl, /absolute inset-0 z-10 h-full w-full/);
});

void test("tenant setting is immediately saved with optimistic rollback", () => {
  const query = read("../src/queries/useOrganizationAutomation.ts");

  assert.match(query, /get_organization_automation_settings/);
  assert.match(query, /update_organization_contact_auto_save/);
  assert.match(query, /onMutate/);
  assert.match(query, /context\?\.previous/);
  assert.match(query, /setQueryData/);
  assert.match(query, /abortSignal\(signal\)/);
});

void test("the contact-only explanation is present and auto assignment is absent", () => {
  const panel = read(
    "../src/components/settings/OrganizationAutomationPanel.tsx",
  );

  assert.match(panel, /Guardar automáticamente nuevos contactos de WhatsApp/);
  assert.match(panel, /Los contactos existentes nunca se eliminan/);
  assert.match(panel, /volver a activarlo no completa clientes anteriores/);
  assert.doesNotMatch(panel, /Automatic Assignment|Asignación automática/);
});

void test("Automation labels exist in every supported locale", () => {
  const keys = [
    "Automatización",
    "Controlá los comportamientos automáticos de tu organización.",
    "Guardar automáticamente nuevos contactos de WhatsApp",
    "No se pudo cargar la configuración de automatización.",
    "Automatización actualizada",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${language}.json`),
    ) as Record<string, string>;
    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing Automation labels`,
    );
  }
});
