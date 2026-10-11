// Presentation only: routes, role definitions and permissions remain available.
export function isVisibleMemberRole(role: string): boolean {
  return role !== "admin";
}

export function isVisibleInvitationRole(role: string): boolean {
  return isVisibleMemberRole(role) && role !== "member";
}

export function isVisibleNavigationPath(path: string): boolean {
  return !["/stats", "/settings/webhooks", "/settings/api-keys"].includes(path);
}
