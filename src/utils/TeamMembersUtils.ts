import type { OrganizationRole } from "./RoleAccess";

export type TeamMemberRole = OrganizationRole;
export type TeamMemberStatus = "active" | "pending" | "rejected";

export type TeamMemberPermissionsInput = {
  currentMemberId?: string | null;
  currentRole?: TeamMemberRole | null;
  memberId: string;
  memberRole: TeamMemberRole;
  isLastOwner: boolean;
};

const allTeamMemberRoles: TeamMemberRole[] = [
  "member",
  "supervisor",
  "admin",
  "owner",
];

export function getInvitableTeamMemberRoles(
  currentRole?: TeamMemberRole | null,
): TeamMemberRole[] {
  if (currentRole === "owner") return allTeamMemberRoles;
  if (currentRole === "admin" || currentRole === "supervisor") {
    return ["member"];
  }
  return [];
}

export function isTeamMembersWorkspacePath(pathname: string) {
  return pathname === "/team-members" || pathname.startsWith("/team-members/");
}

export function getTeamMemberPermissions({
  currentMemberId,
  currentRole,
  memberId,
  memberRole,
  isLastOwner,
}: TeamMemberPermissionsInput) {
  const isOwner = currentRole === "owner";
  const isSelf = currentMemberId === memberId;
  const canManageMember =
    memberRole === "member" &&
    (currentRole === "admin" || currentRole === "supervisor");
  const canShowRemove = isOwner || isSelf || canManageMember;

  return {
    canEditName: isOwner || isSelf || canManageMember,
    canEditRole: isOwner && !isLastOwner,
    canRemove: canShowRemove && !isLastOwner,
    canShowRemove,
    isSelf,
  };
}
