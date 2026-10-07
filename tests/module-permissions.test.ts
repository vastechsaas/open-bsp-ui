import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  changeModulePermission,
  moduleRoles,
} from "../src/utils/ModulePermissionUtils.ts";

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
