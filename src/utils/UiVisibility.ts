// Presentation only: routes, role definitions and permissions remain available.
export function isVisibleMemberRole(role: string): boolean {
  return role !== "admin";
}

export function isVisibleInvitationRole(role: string): boolean {
  return isVisibleMemberRole(role) && role !== "member";
}

export function isVisibleNavigationPath(
  path: string,
  organizationExtra?: unknown,
): boolean {
  if (["/stats", "/settings/webhooks", "/settings/api-keys"].includes(path))
    return false;

  // Optional organization metadata controls presentation, never authorization.
  // Missing or malformed configuration preserves the existing navigation.
  if (!isRecord(organizationExtra)) return true;
  const visibility = organizationExtra.ui_visibility;
  if (!isRecord(visibility)) return true;
  if (
    Array.isArray(visibility.hidden_paths) &&
    visibility.hidden_paths.includes(path)
  )
    return false;
  if (
    path.startsWith("/settings/") &&
    Array.isArray(visibility.settings_visible_paths)
  )
    return visibility.settings_visible_paths.includes(path);
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
