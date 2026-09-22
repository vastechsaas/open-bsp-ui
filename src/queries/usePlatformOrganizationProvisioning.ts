import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, type Database } from "@/supabase/client";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import type { OrganizationProvisioningPayload } from "@/utils/OrganizationProvisioningUtils";
import { queryKeys } from "./queryKeys";

export type OrganizationProvisioningStatus =
  | "pending_invitation"
  | "completed"
  | "failed";

export type PlatformOrganizationProvisioning = Omit<
  Database["public"]["Functions"]["list_platform_organization_provisioning_page"]["Returns"][number],
  "completed_at" | "last_error" | "organization_id"
> & {
  completed_at: string | null;
  last_error: string | null;
  organization_id: string | null;
};

type ProvisioningRecord =
  Database["public"]["Tables"]["organization_provisioning"]["Row"];

export function usePlatformOrganizationProvisioning(
  params: DataTablePageParams & { status?: OrganizationProvisioningStatus },
) {
  return useQuery({
    queryKey: queryKeys.platform.organizationProvisioning(params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_platform_organization_provisioning_page", {
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_status: params.status,
        })
        .throwOnError();
      const rows = result.data as PlatformOrganizationProvisioning[];
      return { rows, total: rows[0]?.total_count || 0 };
    },
  });
}

async function invokeOrganizationProvisioning(
  payload: OrganizationProvisioningPayload,
) {
  const result = await supabase.functions.invoke("organization-provisioning", {
    body: payload,
  });
  if (result.error) throw result.error;
  return result.data as ProvisioningRecord;
}

function useProvisioningMutation<TInput>(
  mutationFn: (input: TInput) => Promise<ProvisioningRecord>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.platform.root(),
      });
    },
  });
}

export function useProvisionPlatformOrganization() {
  return useProvisioningMutation(invokeOrganizationProvisioning);
}

export function useRetryPlatformOrganizationProvisioning() {
  return useProvisioningMutation(async (provisioningId: string) => {
    const result = await supabase
      .rpc("get_platform_organization_provisioning", {
        p_provisioning_id: provisioningId,
      })
      .throwOnError();
    const provisioning = result.data as ProvisioningRecord;
    const request = provisioning.request_payload as unknown as Omit<
      OrganizationProvisioningPayload,
      "request_id"
    >;
    return await invokeOrganizationProvisioning({
      ...request,
      request_id: provisioning.request_id,
    });
  });
}
