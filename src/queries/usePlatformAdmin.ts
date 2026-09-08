import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Database, supabase } from "@/supabase/client";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import { getAuthenticatedHomePath } from "@/utils/PlatformAdminUtils";
import { queryKeys } from "./queryKeys";

export type PlatformOverview =
  Database["public"]["Functions"]["get_platform_overview"]["Returns"][number];
export type PlatformOrganization =
  Database["public"]["Functions"]["list_platform_organizations_page"]["Returns"][number];
export type PlatformTenantSummary =
  Database["public"]["Functions"]["get_platform_tenant_summary"]["Returns"][number];

export async function fetchIsPlatformAdmin() {
  const result = await supabase.rpc("is_platform_admin").throwOnError();
  return result.data === true;
}

export async function resolveAuthenticatedHome() {
  return getAuthenticatedHomePath(await fetchIsPlatformAdmin());
}

export function usePlatformOverview() {
  return useQuery({
    queryKey: queryKeys.platform.overview(),
    queryFn: async () => {
      const result = await supabase.rpc("get_platform_overview").throwOnError();
      return result.data[0] as PlatformOverview;
    },
  });
}

export function usePlatformOrganizations(params: DataTablePageParams) {
  return useQuery({
    queryKey: queryKeys.platform.organizations(params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_platform_organizations_page", {
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
        })
        .throwOnError();

      const rows = result.data as PlatformOrganization[];
      return {
        rows,
        total: rows[0]?.total_count || 0,
      };
    },
  });
}

export function usePlatformTenantSummary(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.platform.tenant(organizationId),
    queryFn: async () => {
      const result = await supabase
        .rpc("get_platform_tenant_summary", {
          p_organization_id: organizationId,
        })
        .throwOnError();
      return result.data[0] as PlatformTenantSummary;
    },
    enabled: !!organizationId,
  });
}

export function usePlatformAccessAudit(
  scope: "global" | "tenant",
  organizationId: string | null,
  enabled: boolean,
) {
  const accessKey = `${scope}:${organizationId || "all"}`;
  const requestId = useMemo(
    () => ({ accessKey, requestId: crypto.randomUUID() }),
    [accessKey],
  ).requestId;

  return useQuery({
    queryKey: queryKeys.platform.access(scope, organizationId, requestId),
    queryFn: async () => {
      const result = await supabase
        .rpc("record_platform_access", {
          p_organization_id: organizationId || undefined,
          p_scope: scope,
          p_request_id: requestId,
        })
        .throwOnError();
      return result.data;
    },
    enabled,
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
