import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
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
      isLastOwner: false,
    }),
    {
      canEditName: true,
      canEditRole: true,
      canRemove: true,
      isSelf: false,
    },
  );

  assert.deepEqual(
    getTeamMemberPermissions({
      currentMemberId: "member-1",
      currentRole: "member",
      memberId: "member-1",
      isLastOwner: false,
    }),
    {
      canEditName: true,
      canEditRole: false,
      canRemove: true,
      isSelf: true,
    },
  );
});

void test("the final owner cannot be downgraded or removed", () => {
  const permissions = getTeamMemberPermissions({
    currentMemberId: "owner-1",
    currentRole: "owner",
    memberId: "owner-1",
    isLastOwner: true,
  });
  assert.equal(permissions.canEditName, true);
  assert.equal(permissions.canEditRole, false);
  assert.equal(permissions.canRemove, false);
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

void test("Team Members labels exist in every supported locale", () => {
  const keys = [
    "Miembros del equipo",
    "Invitar miembro",
    "Buscar por nombre o correo",
    "Todos los roles",
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
