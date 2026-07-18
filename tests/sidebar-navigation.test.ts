import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COLLAPSED_SIDEBAR_WIDTH,
  COMPACT_SIDEBAR_WIDTH,
  EXPANDED_SIDEBAR_WIDTH,
  getResizablePanelMaxWidth,
  getSidebarWidth,
  isSidebarExpanded,
} from "../src/utils/SidebarUtils.ts";

void test("sidebar width follows compact, collapsed, and expanded rules", () => {
  assert.equal(getSidebarWidth(800, false), COMPACT_SIDEBAR_WIDTH);
  assert.equal(getSidebarWidth(1440, true), COLLAPSED_SIDEBAR_WIDTH);
  assert.equal(getSidebarWidth(1440, false), EXPANDED_SIDEBAR_WIDTH);
  assert.equal(isSidebarExpanded(800, false), false);
  assert.equal(isSidebarExpanded(1440, false), true);
});

void test("resizable panels use the remaining width after the sidebar", () => {
  assert.equal(getResizablePanelMaxWidth(1440, 240), 600);
  assert.equal(getResizablePanelMaxWidth(1440, 64), 688);
});

void test("sidebar preference is persisted in the UI store", () => {
  const uiSlice = readFileSync(
    new URL("../src/stores/uiSlice.ts", import.meta.url),
    "utf8",
  );
  const boundStore = readFileSync(
    new URL("../src/stores/useBoundStore.ts", import.meta.url),
    "utf8",
  );
  assert.match(uiSlice, /sidebarCollapsed: false/);
  assert.match(uiSlice, /setSidebarCollapsed/);
  assert.match(boundStore, /sidebarCollapsed: state\.ui\.sidebarCollapsed/);
});

void test("sidebar keeps the approved grouping and bottom navigation order", () => {
  const menu = readFileSync(
    new URL("../src/components/Menu.tsx", import.meta.url),
    "utf8",
  );
  const workspaceIndex = menu.indexOf('t("Espacio de trabajo")');
  const messagesIndex = menu.indexOf('to="/conversations"');
  const teamIndex = menu.indexOf('to="/team-members"');
  const toolsIndex = menu.indexOf('t("Herramientas")');
  const integrationsIndex = menu.indexOf('to="/integrations"');
  const whatsappIndex = menu.indexOf('to="/whatsapp-manager"');
  const settingsIndex = menu.indexOf('to="/settings"');

  assert.ok(workspaceIndex >= 0 && messagesIndex > workspaceIndex);
  assert.ok(teamIndex > messagesIndex && toolsIndex > teamIndex);
  assert.ok(integrationsIndex > toolsIndex);
  assert.ok(whatsappIndex > integrationsIndex);
  assert.ok(settingsIndex > whatsappIndex);
});

void test("sidebar accessibility labels exist in every supported locale", () => {
  const keys = [
    "Espacio de trabajo",
    "Contraer navegación",
    "Expandir navegación",
    "Navegación principal",
    "Abrir menú de usuario",
    "Organizaciones",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing sidebar labels`,
    );
  }
});
