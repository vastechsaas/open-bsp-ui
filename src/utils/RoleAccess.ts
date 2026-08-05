import type { Database } from "../supabase/db_types";

export type OrganizationRole = Database["public"]["Enums"]["role"];

export type NavigationAccess =
  | "dashboard"
  | "conversations"
  | "contacts"
  | "agents"
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
  "agents",
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
    agent: ["conversations", "contacts"],
  };

const pathAccess: readonly [string, NavigationAccess][] = [
  ["/dashboard", "dashboard"],
  ["/conversations", "conversations"],
  ["/contacts", "contacts"],
  ["/agents", "agents"],
  ["/campaigns", "campaigns"],
  ["/chatbots", "chatbots"],
  ["/templates", "templates"],
  ["/team-members", "teamMembers"],
  ["/integrations", "integrations"],
  ["/stats", "stats"],
  ["/whatsapp-manager", "whatsappManager"],
  ["/settings", "settings"],
];

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
  const route = pathAccess.find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`),
  );
  return route ? canAccessNavigation(role, route[1]) : true;
}

export function getDefaultPathForRole(
  role: OrganizationRole | null | undefined,
) {
  return role === "agent" ? "/conversations" : "/dashboard";
}
