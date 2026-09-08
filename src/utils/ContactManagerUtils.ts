export function isContactManagerWorkspacePath(pathname: string) {
  return pathname === "/contacts" || pathname.startsWith("/contacts/");
}
