import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canManagePlatformMember,
  platformMemberRoleLabel,
  platformMemberError,
  stableMemberRequest,
  PLATFORM_MEMBER_ROLES,
} from "../src/utils/PlatformTeamMemberUtils";
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("only Owner, Supervisor and Agent can be created or managed", () => {
  assert.deepEqual(
    PLATFORM_MEMBER_ROLES.map((r) => r.value),
    ["owner", "supervisor", "agent"],
  );
  for (const role of ["owner", "supervisor", "agent"] as const)
    assert.equal(canManagePlatformMember(role), true);
  for (const role of ["admin", "member"] as const)
    assert.equal(canManagePlatformMember(role), false);
  assert.equal(platformMemberRoleLabel("admin"), "Administrador");
  assert.equal(platformMemberRoleLabel("member"), "Miembro");
});
void test("stable retries keep their ID; changed input, organization or account gets a new ID", () => {
  let next = 0;
  const id = () => String(++next);
  const payload = {
    organizationId: "org-a",
    userId: "admin-a",
    role: "agent",
    name: "A",
  };
  const first = stableMemberRequest(null, payload, id);
  assert.equal(stableMemberRequest(first, { ...payload }, id), first);
  for (const change of [
    { role: "owner" },
    { organizationId: "org-b" },
    { userId: "admin-b" },
    { name: "B" },
  ]) {
    assert.notEqual(
      stableMemberRequest(first, { ...payload, ...change }, id).id,
      first.id,
    );
  }
});
void test("actionable errors never expose raw SQL or credentials", () => {
  for (const message of [
    "TEAM_MEMBER_ACTIVE_WORK",
    "TEAM_MEMBER_STALE",
    "TEAM_MEMBER_READ_ONLY",
    "Cannot delete the last owner",
    "organization Agent capacity has been reached",
    "already exists",
    "routing queues",
  ]) {
    assert.notEqual(
      platformMemberError({ message }),
      platformMemberError({ message: "unknown" }),
    );
    assert.doesNotMatch(platformMemberError({ message }), /TEAM_MEMBER_/);
  }
  assert.equal(
    platformMemberError({ message: "password=secret" }),
    platformMemberError(null),
  );
});
void test("all new labels and errors are translated in every supported locale", () => {
  const keys = [
    "Administrá las membresías, roles y acceso a colas de esta organización.",
    "Buscar miembro por nombre o correo",
    "No se encontraron miembros",
    "Quitar acceso a la organización",
    "Membresía pendiente creada",
    "Solo se crea una membresía pendiente. No se envía correo ni se crea una cuenta de acceso.",
    "Crear membresía pendiente",
    "Membresía actualizada",
    "Confirmo el cambio de rol. Cambiará los permisos y restablecerá la disponibilidad a Ausente.",
    "Solo los agentes aceptados pueden pertenecer a colas activas de esta organización.",
    "Se quitará solo esta membresía. La cuenta de acceso, otras organizaciones y el historial se conservan.",
    "Transferí o cerrá el trabajo activo antes de cambiar el rol, quitar colas o eliminar el acceso.",
    "La membresía cambió. Cerrá este diálogo y volvé a abrirlo para revisar los datos actuales.",
    "No se puede quitar ni cambiar el rol del último propietario aceptado.",
    "Administrador y Miembro son roles de solo lectura en esta pantalla.",
    "Ya existe una membresía o invitación para este correo en la organización.",
    "No se pudo guardar la membresía. Revisá los datos, la conexión o tus permisos.",
    "Acceso a la organización eliminado",
  ];
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      read("../public/locales/" + locale + ".json"),
    ) as Record<string, string>;
    for (const key of keys)
      assert.ok(translations[key], locale + " missing " + key);
  }
});
void test("team list uses paginated organization/account scope and aborts obsolete requests", () => {
  const query = read("../src/queries/usePlatformTeamMembers.ts");
  assert.match(query, /list_platform_organization_members_page/);
  assert.match(query, /p_page_size: params.pageSize/);
  assert.match(query, /p_search: params.search/);
  assert.match(query, /userId, params/);
  assert.match(query, /abortSignal\(signal\)/);
  assert.doesNotMatch(query, /\.slice\(|admin\.createUser|inviteUserByEmail/);
});
void test("mutations carry the original stale token and stable request ID; refresh related queries", () => {
  const query = read("../src/queries/usePlatformTeamMembers.ts");
  assert.match(query, /p_expected_updated_at: input.member.updated_at/);
  assert.match(query, /stableMemberRequest/);
  assert.match(query, /input.member.organization_id !== organizationId/);
  assert.match(query, /ui.user\?\.id !== userId/);
  for (const key of [
    "organizationAgents",
    "organizationQueues",
    "organizationAgentCapacity",
    "tenant",
    "agents.all",
    "members.all",
  ]) {
    assert.ok(query.includes(key));
  }
});
void test("existing route stays; email is read-only; role changes and removals require confirmation", () => {
  const ui = read("../src/components/platform/PlatformOrganizationAgents.tsx");
  const nav = read(
    "../src/components/platform/PlatformOrganizationDetailLayout.tsx",
  );
  assert.match(nav, /\/platform\/\$organizationId\/agents/);
  assert.match(nav, /Miembros del equipo/);
  assert.match(ui, /canManagePlatformMember\(agent.role\)/);
  assert.match(ui, /readOnly[\s\S]*value=\{agent.email/);
  assert.match(ui, /confirmedRoleChange/);
  assert.match(ui, /accepted && role === "agent"/);
  assert.match(ui, /Solo se crea una membresía pendiente/);
  assert.match(ui, /Quitar acceso a la organización/);
  assert.match(ui, /Cancelar invitación/);
});
void test("team changes reuse private permission refresh for current role and presence", () => {
  const query = read("../src/queries/useModulePermissions.ts");
  for (const key of [
    "agents.all(orgId)",
    "members.all(orgId)",
    "organizations.all()",
    "assignmentPresence.current(orgId)",
  ]) {
    assert.ok(query.includes(key));
  }
});
