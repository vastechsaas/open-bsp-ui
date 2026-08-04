import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getInvitableTeamMemberRoles,
  getTeamMemberPermissions,
  isTeamMembersWorkspacePath,
} from "../src/utils/TeamMembersUtils.ts";

void test("Team Members uses the full-width workspace only for its routes", () => {
  assert.equal(isTeamMembersWorkspacePath("/team-members"), true);
  assert.equal(isTeamMembersWorkspacePath("/team-members/"), true);
  assert.equal(isTeamMembersWorkspacePath("/settings/members"), false);
});

void test("member action permissions preserve owner and self-service rules", () => {
  assert.deepEqual(
    getTeamMemberPermissions({
      currentMemberId: "owner-1",
      currentRole: "owner",
      memberId: "member-1",
      memberRole: "member",
      isLastOwner: false,
    }),
    {
      canEditName: true,
      canEditRole: true,
      canRemove: true,
      canShowRemove: true,
      isSelf: false,
    },
  );

  assert.deepEqual(
    getTeamMemberPermissions({
      currentMemberId: "member-1",
      currentRole: "member",
      memberId: "member-1",
      memberRole: "member",
      isLastOwner: false,
    }),
    {
      canEditName: true,
      canEditRole: false,
      canRemove: true,
      canShowRemove: true,
      isSelf: true,
    },
  );
});

void test("the final owner cannot be downgraded or removed", () => {
  const permissions = getTeamMemberPermissions({
    currentMemberId: "owner-1",
    currentRole: "owner",
    memberId: "owner-1",
    memberRole: "owner",
    isLastOwner: true,
  });
  assert.equal(permissions.canEditName, true);
  assert.equal(permissions.canEditRole, false);
  assert.equal(permissions.canRemove, false);
  assert.equal(permissions.canShowRemove, true);
});

void test("Supervisors can manage Members without privilege escalation", () => {
  const memberPermissions = getTeamMemberPermissions({
    currentMemberId: "supervisor-1",
    currentRole: "supervisor",
    memberId: "member-1",
    memberRole: "member",
    isLastOwner: false,
  });
  assert.equal(memberPermissions.canEditName, true);
  assert.equal(memberPermissions.canEditRole, false);
  assert.equal(memberPermissions.canRemove, true);

  for (const memberRole of ["supervisor", "admin", "owner"] as const) {
    const permissions = getTeamMemberPermissions({
      currentMemberId: "supervisor-1",
      currentRole: "supervisor",
      memberId: `target-${memberRole}`,
      memberRole,
      isLastOwner: false,
    });
    assert.equal(permissions.canEditName, false, memberRole);
    assert.equal(permissions.canEditRole, false, memberRole);
    assert.equal(permissions.canRemove, false, memberRole);
  }

  assert.deepEqual(getInvitableTeamMemberRoles("supervisor"), ["member"]);
  assert.deepEqual(getInvitableTeamMemberRoles("admin"), ["member"]);
  assert.deepEqual(getInvitableTeamMemberRoles("member"), []);
});

void test("Team Members is canonical in the sidebar and Settings", () => {
  const menu = readFileSync(
    new URL("../src/components/Menu.tsx", import.meta.url),
    "utf8",
  );
  const settings = readFileSync(
    new URL("../src/routes/_auth/settings/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(menu, /to="\/team-members"/);
  assert.match(settings, /to: "\/team-members"/);
});

void test("owners can select and filter the Supervisor role", () => {
  const teamMembers = readFileSync(
    new URL("../src/routes/_auth/team-members/index.tsx", import.meta.url),
    "utf8",
  );
  const roleTypes = readFileSync(
    new URL("../src/supabase/types/ui_types.ts", import.meta.url),
    "utf8",
  );

  assert.match(teamMembers, /value: "supervisor", label: t\("Supervisor"\)/);
  assert.match(teamMembers, /supervisor: t\("Supervisor"\)/);
  assert.match(roleTypes, /"supervisor"/);
});

void test("Team Members labels exist in every supported locale", () => {
  const keys = [
    "Miembros del equipo",
    "Invitar miembro",
    "Buscar por nombre o correo",
    "Todos los roles",
    "Supervisor",
    "Último propietario",
    "Cancelar invitación",
    "Eliminar miembro",
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
      `${language} is missing Team Members labels`,
    );
  }
});
