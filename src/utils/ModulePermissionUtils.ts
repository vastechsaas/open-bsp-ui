import type { Database } from "@/supabase/db_types";

export type ModuleRole = Database["public"]["Enums"]["role"];
export type ModulePermission = {
  role: ModuleRole;
  can_view: boolean;
  can_manage: boolean;
};
export type ModuleMatrix = {
  revision: number;
  permissions: ModulePermission[];
};
export type EffectiveModulePermissions = {
  revision: number;
  can_view: boolean;
  can_manage: boolean;
};
export const moduleRoles: ModuleRole[] = [
  "owner",
  "admin",
  "supervisor",
  "member",
  "agent",
];

export function changeModulePermission(
  rows: ModulePermission[],
  role: ModuleRole,
  permission: "can_view" | "can_manage",
  checked: boolean,
) {
  return rows.map((row) =>
    row.role !== role
      ? row
      : {
          ...row,
          [permission]: checked,
          ...(permission === "can_manage" && checked ? { can_view: true } : {}),
          ...(permission === "can_view" && !checked
            ? { can_manage: false }
            : {}),
        },
  );
}
