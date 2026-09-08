import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

void test("appearance exposes five presets without an arbitrary color picker", () => {
  const route = read("../src/routes/_auth/settings/appearance.tsx");

  for (const theme of ["orange", "green", "blue", "purple", "teal"]) {
    assert.match(route, new RegExp(`value: "${theme}"`));
  }
  assert.doesNotMatch(route, /type=["']color["']/);
  assert.match(route, /Vista previa/);
});

void test("appearance reads and updates a tenant-scoped setting optimistically", () => {
  const query = read("../src/queries/useOrganizationAppearance.ts");
  const keys = read("../src/queries/queryKeys.ts");

  assert.match(query, /get_organization_ui_settings/);
  assert.match(query, /update_organization_chat_bubble_theme/);
  assert.match(query, /onMutate/);
  assert.match(query, /context\?\.previous/);
  assert.match(keys, /\[orgId, "organization_ui_settings"\]/);
});

void test("the organization theme is applied globally and reset while switching", () => {
  const layout = read("../src/routes/_auth.tsx");
  const styles = read("../src/global.css");

  assert.match(layout, /document\.documentElement\.dataset\.chatBubbleTheme/);
  assert.match(layout, /appearanceSettings\?\.chat_bubble_theme \?\? "orange"/);
  assert.match(layout, /activeOrgId, appearanceSettings\?\.chat_bubble_theme/);
  assert.match(styles, /data-chat-bubble-theme="green"/);
  assert.match(styles, /data-chat-bubble-theme="blue"/);
  assert.match(styles, /data-chat-bubble-theme="purple"/);
  assert.match(styles, /data-chat-bubble-theme="teal"/);
});

void test("only Owner, Admin and Supervisor can manage appearance", () => {
  const route = read("../src/routes/_auth/settings/appearance.tsx");
  const layout = read("../src/components/settings/SettingsWorkspaceLayout.tsx");
  const access = read("../src/utils/RoleAccess.ts");

  assert.match(
    route,
    /role === "owner" \|\| role === "admin" \|\| role === "supervisor"/,
  );
  assert.match(layout, /\/settings\/appearance/);
  assert.match(layout, /role === "member"/);
  assert.match(access, /pathname\.startsWith\("\/settings\/appearance"\)/);
});

void test("appearance labels exist in every supported locale", () => {
  const keys = [
    "Apariencia",
    "Color de la burbuja de respuesta",
    "Naranja",
    "Verde",
    "Azul",
    "Morado",
    "Turquesa",
    "Vista previa",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${language}.json`),
    ) as Record<string, string>;
    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing Appearance labels`,
    );
  }
});
