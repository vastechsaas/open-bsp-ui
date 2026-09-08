export function isSettingsWorkspacePath(pathname: string) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}
