import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

test("Agent availability lives beside notifications and heartbeats every 30 seconds", () => {
  const header = read("../src/components/Header.tsx");
  const control = read("../src/components/AssignmentAvailabilityControl.tsx");
  const query = read("../src/queries/useAssignmentPresence.ts");
  assert.match(
    header,
    /AssignmentAvailabilityControl[\s\S]*NotificationCenter/,
  );
  assert.match(control, /extra\?\.role === "agent"/);
  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(header, /truncate whitespace-nowrap/);
  assert.match(header, /!w-\[38px\]/);
  assert.match(header, /min-w-max shrink-0/);
  assert.match(control, /assignment-availability-label/);
  assert.match(query, /30_000/);
  assert.match(query, /visibilitychange/);
  assert.match(query, /heartbeat_my_assignment_availability/);
});

test("organization and Platform automation expose the master switch", () => {
  const panel = read(
    "../src/components/settings/OrganizationAutomationPanel.tsx",
  );
  const query = read("../src/queries/useOrganizationAutomation.ts");
  assert.match(panel, /autoAssignmentEnabled/);
  assert.match(query, /update_organization_auto_assignment/);
  assert.match(query, /update_platform_organization_auto_assignment/);
});

test("tenant and Platform queue editors configure Round Robin and eligible count", () => {
  const dialog = read(
    "../src/components/routing-queues/RoutingQueueEditorDialog.tsx",
  );
  const tenant = read("../src/routes/_auth/settings/routing-queues.tsx");
  const platform = read(
    "../src/components/platform/PlatformOrganizationQueues.tsx",
  );
  assert.match(dialog, /round_robin/);
  assert.match(tenant, /eligible_member_count/);
  assert.match(platform, /eligible_member_count/);
  assert.match(tenant, /useUpdateRoutingQueueAssignmentStrategy/);
  assert.match(platform, /useUpdatePlatformRoutingQueueAssignmentStrategy/);
});

test("automatic assignments render an internal timeline label", () => {
  const message = read("../src/components/Message/Message.tsx");
  const types = read("../src/supabase/types/message_types.ts");
  assert.match(message, /assignment_event/);
  assert.match(types, /AssignmentEventPart/);
});
