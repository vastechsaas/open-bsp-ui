import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useBoundStore from "@/stores/useBoundStore";
import { type Database, supabase } from "@/supabase/client";
import { queryKeys } from "./queryKeys";

export type OrganizationMediaStorage =
  Database["public"]["Functions"]["get_organization_media_storage"]["Returns"][number];
export type PlatformOrganizationMediaStorage =
  Database["public"]["Functions"]["get_platform_organization_media_storage"]["Returns"][number];
export type PlatformMediaStorageRow =
  Database["public"]["Functions"]["list_platform_media_storage_page"]["Returns"][number];

export type MediaStorageStatus = "safe" | "approaching" | "critical";

export function useOrganizationMediaStorage() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  return useQuery({
    queryKey: queryKeys.organizationMediaStorage.detail(organizationId),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("get_organization_media_storage", {
          p_organization_id: organizationId!,
        })
        .abortSignal(signal)
        .throwOnError();
      return result.data[0] as OrganizationMediaStorage;
    },
    enabled: !!organizationId,
  });
}

export function usePlatformMediaStoragePage(params: {
  page: number;
  pageSize: number;
  search?: string;
  status?: MediaStorageStatus;
}) {
  return useQuery({
    queryKey: queryKeys.platform.mediaStoragePage(params),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("list_platform_media_storage_page", {
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search,
          p_status: params.status,
        })
        .abortSignal(signal)
        .throwOnError();
      const rows = (result.data ?? []) as PlatformMediaStorageRow[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
  });
}

export function usePlatformOrganizationMediaStorage(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.platform.organizationMediaStorage(organizationId),
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("get_platform_organization_media_storage", {
          p_organization_id: organizationId,
        })
        .abortSignal(signal)
        .throwOnError();
      return result.data[0] as PlatformOrganizationMediaStorage;
    },
    enabled: !!organizationId,
  });
}

function useInvalidatePlatformMediaStorage(organizationId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.mediaStorage(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.organizationMediaStorage(organizationId),
      }),
    ]);
  };
}

export function useUpdatePlatformMediaStorageQuota(organizationId: string) {
  const invalidate = useInvalidatePlatformMediaStorage(organizationId);
  return useMutation({
    mutationFn: async (quotaGb: 25 | 50 | 75 | 100) => {
      const result = await supabase
        .rpc("update_platform_organization_media_storage_quota", {
          p_organization_id: organizationId,
          p_quota_gb: quotaGb,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data[0] as PlatformOrganizationMediaStorage;
    },
    onSuccess: invalidate,
  });
}

export function useReconcilePlatformMediaStorage(organizationId: string) {
  const invalidate = useInvalidatePlatformMediaStorage(organizationId);
  return useMutation({
    mutationFn: async () => {
      const result = await supabase
        .rpc("reconcile_platform_organization_media_storage", {
          p_organization_id: organizationId,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data[0] as PlatformOrganizationMediaStorage;
    },
    onSuccess: invalidate,
  });
}
