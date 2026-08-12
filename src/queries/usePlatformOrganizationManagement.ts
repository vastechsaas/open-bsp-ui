import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Database, supabase } from "@/supabase/client";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import { queryKeys } from "./queryKeys";

export type PlatformRoutingQueueRow =
  Database["public"]["Functions"]["list_platform_routing_queues_page"]["Returns"][number];
export type PlatformOrganizationAgentRow =
  Database["public"]["Functions"]["list_platform_organization_agents_page"]["Returns"][number];
export type RoutingQueue =
  Database["public"]["Tables"]["routing_queues"]["Row"];

export function usePlatformRoutingQueuesPage(
  organizationId: string,
  params: DataTablePageParams & { status?: "active" | "archived" },
) {
  return useQuery({
    queryKey: queryKeys.platform.organizationQueuesPage(organizationId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_platform_routing_queues_page", {
          p_organization_id: organizationId,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_status: params.status || undefined,
        })
        .throwOnError();
      const rows = result.data as PlatformRoutingQueueRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
    enabled: !!organizationId,
  });
}

export function usePlatformOrganizationAgentsPage(
  organizationId: string,
  params: DataTablePageParams,
) {
  return useQuery({
    queryKey: queryKeys.platform.organizationAgentsPage(organizationId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_platform_organization_agents_page", {
          p_organization_id: organizationId,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
        })
        .throwOnError();
      const rows = result.data as PlatformOrganizationAgentRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
    enabled: !!organizationId,
  });
}

function useInvalidatePlatformOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.organizationQueues(organizationId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.platform.organizationAgents(organizationId),
      }),
    ]);
  };
}

export function useCreatePlatformRoutingQueue(organizationId: string) {
  const invalidate = useInvalidatePlatformOrganization(organizationId);
  return useMutation({
    mutationFn: async ({
      name,
      agentIds,
    }: {
      name: string;
      agentIds: string[];
    }) => {
      const result = await supabase
        .rpc("create_platform_routing_queue", {
          p_organization_id: organizationId,
          p_name: name,
          p_agent_ids: agentIds,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data as RoutingQueue;
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePlatformRoutingQueue(organizationId: string) {
  const invalidate = useInvalidatePlatformOrganization(organizationId);
  return useMutation({
    mutationFn: async ({
      id,
      name,
      status,
      agentIds,
    }: {
      id: string;
      name: string;
      status: "active" | "archived";
      agentIds: string[];
    }) => {
      const result = await supabase
        .rpc("update_platform_routing_queue", {
          p_routing_queue_id: id,
          p_name: name,
          p_status: status,
          p_agent_ids: agentIds,
          p_request_id: crypto.randomUUID(),
        })
        .throwOnError();
      return result.data as RoutingQueue;
    },
    onSuccess: invalidate,
  });
}
