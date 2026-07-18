export type TeamMemberRole = "owner" | "admin" | "member";
export type TeamMemberStatus = "active" | "pending" | "rejected";

export type TeamMemberPermissionsInput = {
  currentMemberId?: string | null;
  currentRole?: TeamMemberRole | null;
  memberId: string;
  isLastOwner: boolean;
};

export function isTeamMembersWorkspacePath(pathname: string) {
  return pathname === "/team-members" || pathname.startsWith("/team-members/");
}

export function getTeamMemberPermissions({
  currentMemberId,
  currentRole,
  memberId,
  isLastOwner,
}: TeamMemberPermissionsInput) {
  const isOwner = currentRole === "owner";
  const isSelf = currentMemberId === memberId;

  return {
    canEditName: isOwner || isSelf,
    canEditRole: isOwner && !isLastOwner,
    canRemove: (isOwner || isSelf) && !isLastOwner,
    isSelf,
  };
}
