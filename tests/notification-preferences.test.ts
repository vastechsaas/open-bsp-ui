import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canManageNotificationPreferences,
  notificationPreferenceKey,
  NOTIFICATION_TYPES,
} from "../src/utils/NotificationPreferenceUtils.ts";

const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("only the organization owner can manage notification preferences", () => {
  assert.equal(canManageNotificationPreferences("owner"), true);
  for (const role of [
    "admin",
    "supervisor",
    "member",
    "agent",
    "super_admin",
    undefined,
  ]) {
    assert.equal(canManageNotificationPreferences(role), false);
  }
});

void test("preferences expose exactly the four existing bell event types", () => {
  assert.deepEqual(
    NOTIFICATION_TYPES.map((item) => item.type),
    [
      "conversation_assigned",
      "conversation_transferred_to_agent",
      "conversation_transferred_to_queue",
      "private_note_mention",
    ],
  );
  assert.equal(new Set(NOTIFICATION_TYPES.map((item) => item.type)).size, 4);
});

void test("preference caches are isolated by organization and signed-in user", () => {
  assert.notDeepEqual(
    notificationPreferenceKey("org-a", "alice"),
    notificationPreferenceKey("org-b", "alice"),
  );
  assert.notDeepEqual(
    notificationPreferenceKey("org-a", "alice"),
    notificationPreferenceKey("org-a", "bob"),
  );
  const hook = source("../src/queries/useNotificationPreferences.ts");
  assert.match(hook, /abortSignal\(signal\)/);
  assert.match(hook, /enabled: canManage && !!organizationId && !!userId/);
  assert.match(hook, /current\.activeOrgId !== organizationId/);
  assert.match(hook, /current\.user\?\.id !== userId/);
  assert.match(hook, /refetchOnReconnect: "always"/);
  assert.match(hook, /refetchOnWindowFocus: "always"/);
  assert.doesNotMatch(hook, /placeholderData|keepPreviousData/);
});

void test("preferences use protected single-event saves and authoritative refresh", () => {
  const hook = source("../src/queries/useNotificationPreferences.ts");
  assert.match(hook, /get_organization_notification_preferences/);
  assert.match(hook, /update_organization_notification_preference/);
  assert.match(hook, /p_notification_type: type/);
  assert.match(hook, /p_enabled: enabled/);
  assert.match(hook, /cancelQueries/);
  assert.match(hook, /invalidateQueries/);
  assert.doesNotMatch(hook, /\.from\(/);
});

void test("Preferences groups Notification Type toggles without adding a Notifications settings tab", () => {
  const workspace = source(
    "../src/components/settings/SettingsWorkspaceLayout.tsx",
  );
  const panel = source("../src/components/settings/NotificationTypePanel.tsx");
  assert.match(workspace, /to: "\/settings\/preferences"/);
  assert.match(
    workspace,
    /item\.to !== "\/settings\/preferences" \|\| role === "owner"/,
  );
  assert.doesNotMatch(workspace, /\/settings\/notifications/);
  assert.match(panel, /t\("Tipo de notificación"\)/);
  assert.match(panel, /<Switch/);
  assert.match(panel, /role="switch"/);
  assert.match(panel, /aria-describedby/);
  assert.match(panel, /disabled=\{!!savingType \|\| !preference\}/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /onRetrySave/);
  assert.match(panel, /onRetry/);
});

void test("direct Preferences URLs are guarded and organization changes reset mutation state", () => {
  const route = source("../src/routes/_auth/settings/preferences.tsx");
  assert.match(route, /if \(!canManage\)/);
  assert.match(route, /key=\{`\$\{organizationId\}:\$\{userId\}`\}/);
  assert.match(route, /update\.mutate\(update\.variables\)/);
});

void test("notification preference copy exists in every supported locale", () => {
  const keys = [
    "Tipo de notificación",
    "Configuración general de tu organización.",
    "Notificaciones y preferencias generales de la organización.",
    "Elegí qué notificaciones reciben los usuarios de esta organización. Los cambios se guardan automáticamente y solo afectan las notificaciones futuras.",
    "Cargando preferencias...",
    "No se pudieron cargar las preferencias.",
    "No se pudo guardar la preferencia. Revisá la conexión o tus permisos.",
    "Preferencia guardada.",
    "Solo el propietario puede administrar las preferencias de notificación.",
    ...NOTIFICATION_TYPES.flatMap(({ label, description }) => [
      label,
      description,
    ]),
  ];
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      source(`../public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(translations[key], `${locale}: ${key}`);
  }
  const en = JSON.parse(source("../public/locales/en.json")) as Record<
    string,
    string
  >;
  assert.equal(en["Tipo de notificación"], "Notification Type");
});
