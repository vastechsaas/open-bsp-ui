import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  changeModulePermission,
  moduleRoles,
  readEffectiveModulePermissions,
} from "../src/utils/ModulePermissionUtils.ts";

void test("availability overrides every effective grant without changing the stored matrix", () => {
  const rows = moduleRoles.map((role) => ({
    role,
    can_view: true,
    can_manage: true,
  }));
  const before = structuredClone(rows);
  for (const row of rows) {
    const enabled = { enabled: true, revision: 3, ...row };
    assert.equal(readEffectiveModulePermissions(enabled).can_manage, true);
    assert.deepEqual(
      readEffectiveModulePermissions({ ...enabled, enabled: false }),
      {
        enabled: false,
        revision: 3,
        can_view: false,
        can_manage: false,
      },
    );
  }
  assert.deepEqual(rows, before);
});

void test("unknown/malformed availability fails closed; Manage never bypasses View", () => {
  for (const value of [
    null,
    {},
    { revision: 1, can_view: true, can_manage: true },
    { enabled: "true", revision: 1, can_view: true, can_manage: true },
    { enabled: true, revision: -1, can_view: true, can_manage: true },
  ]) {
    assert.throws(() => readEffectiveModulePermissions(value));
  }
  assert.equal(
    readEffectiveModulePermissions({
      enabled: true,
      revision: 1,
      can_view: false,
      can_manage: true,
    }).can_manage,
    false,
  );
});

test("View/Manage checkbox dependencies apply to every role, including Owner/Admin", () => {
  const rows = moduleRoles.map((role) => ({
    role,
    can_view: false,
    can_manage: false,
  }));
  for (const role of moduleRoles) {
    const enabled = changeModulePermission(rows, role, "can_manage", true);
    assert.deepEqual(
      enabled.find((row) => row.role === role),
      { role, can_view: true, can_manage: true },
    );
    const removed = changeModulePermission(enabled, role, "can_view", false);
    assert.deepEqual(
      removed.find((row) => row.role === role),
      { role, can_view: false, can_manage: false },
    );
    assert.equal(
      enabled.filter((row) => row.role !== role && row.can_view).length,
      0,
    );
  }
});

test("removing Manage retains View and never mutates the source matrix", () => {
  const rows = [{ role: "owner" as const, can_view: true, can_manage: true }];
  assert.equal(
    changeModulePermission(rows, "owner", "can_manage", false)[0].can_view,
    true,
  );
  assert.equal(rows[0].can_manage, true);
});

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("permission queries are user/organization scoped, cancel obsolete data and reconcile authoritative changes", () => {
  const query = source("src/queries/useModulePermissions.ts");
  assert.match(query, /orgId, "module-permissions", userId/);
  assert.match(query, /abortSignal\(signal\)/);
  assert.match(query, /module-permissions:\$\{orgId\}/);
  assert.match(query, /refetchOnWindowFocus: true/);
  assert.match(query, /refetchOnReconnect: true/);
  assert.match(query, /cancelQueries/);
  assert.match(query, /removeQueries/);
});

test("read-only builder protects graph changes, inspector, shortcuts and management dialogs", () => {
  const editor = source("src/routes/_auth/chatbots/$flowId.tsx");
  assert.match(editor, /nodesDraggable=\{canManage\}/);
  assert.match(editor, /nodesConnectable=\{canManage\}/);
  assert.match(editor, /fieldset\s+disabled=\{readOnly\}/);
  assert.match(editor, /if \(!canManage\) return;/);
  assert.match(
    editor,
    /if \(!canManage \|\| !actionAvailability.canSave\) return/,
  );
  assert.match(editor, /open=\{canManage && publishDialogOpen\}/);
  assert.match(editor, /open=\{canManage && deploymentOpen\}/);
  assert.match(editor, /webhookMocks: createWebhookSimulationMocks\(nodes\)/);
});

void test("view-only users can open flows from desktop and mobile listing names", () => {
  const listing = source("src/routes/_auth/chatbots/index.tsx");
  for (const [start, end] of [
    ["function FlowTableRow(", "function FlowCard("],
    ["function FlowCard(", "type FlowActionsProps"],
  ]) {
    const row = listing.slice(listing.indexOf(start), listing.indexOf(end));
    assert.match(row, /<button[^>]*onClick=\{onOpen\}[^>]*>\s*\{flow.name\}/);
    assert.doesNotMatch(row, /\{canManage \?/);
  }
});

void test("Open is available without Manage while duplicate and lifecycle actions stay restricted", () => {
  const listing = source("src/routes/_auth/chatbots/index.tsx");
  const actions = listing.slice(
    listing.indexOf("function FlowActionButtons("),
    listing.indexOf("function FlowVersions("),
  );
  assert.doesNotMatch(actions, /if \(!canManage\)/);
  const managementGate = actions.indexOf("{canManage && (");
  assert.ok(managementGate > actions.indexOf("onClick={onOpen}"));
  assert.ok(actions.indexOf("onClick={onDuplicate}") > managementGate);
  assert.ok(actions.indexOf("onClick={() => onLifecycle") > managementGate);
  assert.match(actions, /<Eye /);
  assert.match(actions, /canManage \? "hidden 2xl:inline" : undefined/);
});

test("Super Admin form has explicit save, revision checks, stable retry IDs and conflict handling", () => {
  const query = source("src/queries/useModulePermissions.ts");
  const form = source("src/components/platform/PlatformModulePermissions.tsx");
  assert.match(query, /p_expected_revision: input.revision/);
  assert.match(query, /p_request_id: input.requestId/);
  assert.match(form, /type="checkbox"/);
  assert.match(form, /useBlocker/);
  assert.match(form, /"40001"/);
  assert.match(form, /Guardar cambios/);
});

void test("availability uses the existing revision-checked save and preserves disabled role choices", () => {
  const query = source("src/queries/useModulePermissions.ts");
  const form = source("src/components/platform/PlatformModulePermissions.tsx");
  assert.match(query, /p_enabled: input.enabled/);
  assert.match(query, /readEffectiveModulePermissions\(data\)/);
  assert.match(form, /useState\(initial.enabled\)/);
  assert.match(form, /enabled !== initial.enabled/);
  assert.match(form, /disabled=\{save.isPending \|\| conflict \|\| !enabled\}/);
  const toggle = form.slice(
    form.indexOf("<Switch"),
    form.indexOf("</label>", form.indexOf("<Switch")),
  );
  assert.match(toggle, /setEnabled\(checked\)/);
  assert.doesNotMatch(toggle, /setRows/);
  assert.match(toggle, /setRequestId\(crypto.randomUUID\(\)\)/);
});

void test("direct URLs explain unavailability and unmount the editable workspace on revocation", () => {
  const editor = source("src/routes/_auth/chatbots/$flowId.tsx");
  const listing = source("src/routes/_auth/chatbots/index.tsx");
  for (const route of [editor, listing]) {
    assert.match(route, /if \(!permissions.data.enabled\)/);
    assert.match(route, /El constructor de chatbots no está disponible/);
    assert.ok(
      route.indexOf("if (permissions.isError)") <
        route.indexOf("if (!permissions.data.enabled)"),
    );
  }
  assert.ok(
    editor.indexOf("if (!permissions.data.enabled)") <
      editor.indexOf("<FlowEditorWorkspace"),
  );
  const layout = source("src/routes/_auth.tsx");
  assert.match(
    layout,
    /isChatbotWorkspacePath\(pathname\)\s*\|\|\s*canAccessPath/,
  );
  const menu = source("src/components/Menu.tsx");
  assert.match(
    menu,
    /chatbotPermissions.isSuccess && chatbotPermissions.data.can_view/,
  );
});

void test("every shipped language has availability labels and the runtime-preservation explanation", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      source(`public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of [
      "Constructor de chatbots habilitado",
      "Deshabilitar elimina el acceso al constructor para todos los roles sin borrar sus permisos. Los chatbots activos y las operaciones ya aceptadas continúan.",
      "El constructor de chatbots no está disponible para esta organización.",
      "Los chatbots activos continúan funcionando. Los cambios sin guardar no se guardaron.",
    ]) {
      assert.ok(translations[key], `${locale}: ${key}`);
      assert.notEqual(translations[key], key);
    }
  }
});
