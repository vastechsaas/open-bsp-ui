import type { Database } from "@/supabase/db_types";

export type ModuleRole = Database["public"]["Enums"]["role"];
export type ModulePermission = {
  role: ModuleRole;
  can_view: boolean;
  can_manage: boolean;
};
export type ModuleMatrix = {
  enabled: boolean;
  revision: number;
  permissions: ModulePermission[];
};
export type EffectiveModulePermissions = {
  enabled: boolean;
  revision: number;
  can_view: boolean;
  can_manage: boolean;
};

// Unknown availability must never briefly grant builder access. Reject malformed
// responses so the existing loading/error/Retry UI remains authoritative.
export function readEffectiveModulePermissions(
  value: unknown,
): EffectiveModulePermissions {
  const data = value as Partial<EffectiveModulePermissions> | null;
  if (
    !data ||
    typeof data.enabled !== "boolean" ||
    typeof data.can_view !== "boolean" ||
    typeof data.can_manage !== "boolean" ||
    typeof data.revision !== "number" ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 0
  ) {
    throw new Error("Invalid module permissions response");
  }
  return {
    enabled: data.enabled,
    revision: data.revision,
    can_view: data.enabled && data.can_view,
    can_manage: data.enabled && data.can_view && data.can_manage,
  };
}
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
