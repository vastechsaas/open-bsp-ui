import type { Database } from "../supabase/db_types";

export type OrganizationRole = Database["public"]["Enums"]["role"];

export type NavigationAccess =
  | "dashboard"
  | "conversations"
  | "contacts"
  | "campaigns"
  | "chatbots"
  | "templates"
  | "teamMembers"
  | "integrations"
  | "stats"
  | "whatsappManager"
  | "settings";

const allNavigationAccess: readonly NavigationAccess[] = [
  "dashboard",
  "conversations",
  "contacts",
  "campaigns",
  "chatbots",
  "templates",
  "teamMembers",
  "integrations",
  "stats",
  "whatsappManager",
  "settings",
];

export const roleAccess: Record<OrganizationRole, readonly NavigationAccess[]> =
  {
    owner: allNavigationAccess,
    admin: allNavigationAccess,
    member: allNavigationAccess,
    supervisor: ["dashboard", "conversations", "contacts", "teamMembers"],
  };

export function canAccessNavigation(
  role: OrganizationRole | null | undefined,
  access: NavigationAccess,
) {
  return role ? roleAccess[role].includes(access) : false;
}

export function canAccessPath(
  role: OrganizationRole | null | undefined,
  pathname: string,
) {
  if (!role) return false;
  if (role !== "supervisor") return true;

  return ["/dashboard", "/conversations", "/contacts", "/team-members"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
