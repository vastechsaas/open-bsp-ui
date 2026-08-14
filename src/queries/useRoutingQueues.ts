import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ConversationRow,
  type Database,
  type MessageRow,
  supabase,
} from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { DataTablePageParams } from "@/utils/DataTableUtils";
import { queryKeys } from "./queryKeys";

export type RoutingQueue =
  Database["public"]["Tables"]["routing_queues"]["Row"];
export type RoutingQueueListRow =
  Database["public"]["Functions"]["list_routing_queues_page"]["Returns"][number];
export type RoutingQueueOption =
  Database["public"]["Functions"]["list_routing_queue_options"]["Returns"][number];
export type TransferableRoutingQueueOption =
  Database["public"]["Functions"]["list_transferable_routing_queue_options"]["Returns"][number];
export type ConversationRoutingEvent =
  Database["public"]["Tables"]["conversation_routing_events"]["Row"];

export type QueueTransferResult = {
  conversation: ConversationRow;
  note: MessageRow;
  routing_event: ConversationRoutingEvent;
};

export function useRoutingQueuesPage(params: DataTablePageParams) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.routingQueues.page(organizationId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_routing_queues_page", {
          p_organization_id: organizationId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
        })
        .throwOnError();
      const rows = result.data as RoutingQueueListRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
    enabled: !!organizationId,
  });
}

export function useRoutingQueueOptions() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.routingQueues.options(organizationId),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_routing_queue_options", {
          p_organization_id: organizationId!,
        })
        .throwOnError();
      return result.data as RoutingQueueOption[];
    },
    enabled: !!organizationId,
  });
}

export function useTransferableRoutingQueueOptions(
  conversationId: string | null | undefined,
  enabled = true,
) {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery({
    queryKey: queryKeys.routingQueues.transferableOptions(
      organizationId,
      conversationId,
    ),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_transferable_routing_queue_options", {
          p_conversation_id: conversationId!,
        })
        .throwOnError();
      return result.data as TransferableRoutingQueueOption[];
    },
    enabled: enabled && !!organizationId && !!conversationId,
  });
}

export function useTransferConversationToQueue() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      targetRoutingQueueId,
      text,
    }: {
      conversationId: string;
      targetRoutingQueueId: string;
      text: string;
    }) => {
      const result = await supabase
        .rpc("transfer_conversation_to_queue_with_private_note", {
          p_conversation_id: conversationId,
          p_target_routing_queue_id: targetRoutingQueueId,
          p_text: text,
        })
        .throwOnError();

      return result.data as unknown as QueueTransferResult;
    },
  });
}

function useInvalidateRoutingQueues() {
  const queryClient = useQueryClient();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.routingQueues.all(organizationId),
    });
}

export function useCreateRoutingQueue() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const invalidate = useInvalidateRoutingQueues();

  return useMutation({
    mutationFn: async ({
      name,
      agentIds,
    }: {
      name: string;
      agentIds: string[];
    }) => {
      if (!organizationId) throw new Error("No active organization");
      const result = await supabase
        .rpc("create_routing_queue", {
          p_organization_id: organizationId,
          p_name: name,
          p_agent_ids: agentIds,
        })
        .throwOnError();
      return result.data as RoutingQueue;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateRoutingQueue() {
  const invalidate = useInvalidateRoutingQueues();

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
        .rpc("update_routing_queue", {
          p_routing_queue_id: id,
          p_name: name,
          p_status: status,
          p_agent_ids: agentIds,
        })
        .throwOnError();
      return result.data as RoutingQueue;
    },
    onSuccess: invalidate,
  });
}
