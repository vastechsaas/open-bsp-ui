// Presentation only: routes, role definitions and permissions remain available.
export function isVisibleMemberRole(role: string): boolean {
  return role !== "admin";
}

export function isVisibleNavigationPath(path: string): boolean {
  return !["/stats", "/settings/webhooks", "/settings/api-keys"].includes(path);
}
