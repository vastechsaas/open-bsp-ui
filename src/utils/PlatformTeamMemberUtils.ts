import type { Database } from "../supabase/db_types";

export type PlatformMemberRole = Database["public"]["Enums"]["role"];
export const PLATFORM_MEMBER_ROLES = [
  { value: "owner", label: "Propietario" },
  { value: "supervisor", label: "Supervisor" },
  { value: "agent", label: "Agente" },
] as const;

export function canManagePlatformMember(role: PlatformMemberRole) {
  return PLATFORM_MEMBER_ROLES.some((option) => option.value === role);
}

export function platformMemberRoleLabel(role: PlatformMemberRole) {
  if (role === "admin") return "Administrador";
  if (role === "member") return "Miembro";
  return PLATFORM_MEMBER_ROLES.find((option) => option.value === role)!.label;
}

export function platformMemberError(error: unknown) {
  const message = (error as { message?: string } | null)?.message ?? "";
  if (message.includes("TEAM_MEMBER_ACTIVE_WORK"))
    return "Transferí o cerrá el trabajo activo antes de cambiar el rol, quitar colas o eliminar el acceso.";
  if (message.includes("TEAM_MEMBER_STALE"))
    return "La membresía cambió. Cerrá este diálogo y volvé a abrirlo para revisar los datos actuales.";
  if (message.includes("Cannot delete the last owner"))
    return "No se puede quitar ni cambiar el rol del último propietario aceptado.";
  if (message.includes("TEAM_MEMBER_READ_ONLY"))
    return "Administrador y Miembro son roles de solo lectura en esta pantalla.";
  if (message.includes("capacity has been reached"))
    return "La capacidad de agentes está completa";
  if (message.includes("already exists"))
    return "Ya existe una membresía o invitación para este correo en la organización.";
  if (
    message.includes("routing queues") ||
    message.includes("QUEUES_REQUIRE_AGENT") ||
    message.includes("pending Agents")
  )
    return "Solo los agentes aceptados pueden pertenecer a colas activas de esta organización.";
  return "No se pudo guardar la membresía. Revisá los datos, la conexión o tus permisos.";
}

// Same payload + same dialog scope keeps its request ID across ambiguous errors.
export function stableMemberRequest(
  previous: { fingerprint: string; id: string } | null,
  payload: object,
  createId: () => string = () => crypto.randomUUID(),
) {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, id: createId() };
}
