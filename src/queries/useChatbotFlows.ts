import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Database, supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import type { ChatbotFlowStatus } from "@/utils/ChatbotFlowUtils";
import type {
  DataTablePage,
  DataTablePageParams,
} from "@/utils/DataTableUtils";
import { queryKeys } from "./queryKeys";

export type ChatbotFlowListRow =
  Database["public"]["Functions"]["list_chatbot_flows_page"]["Returns"][number];

export type ChatbotFlowPageParams = DataTablePageParams & {
  status?: ChatbotFlowStatus;
};

type ChatbotFlowCreateResponse = {
  flow_id: string;
  version_id: string;
  version: number;
  updated_at: string;
};

type ChatbotFlowLifecycleResponse = {
  id: string;
  status: ChatbotFlowStatus;
  archived_at: string | null;
  updated_at: string;
};

type CreateChatbotFlowInput = {
  name: string;
};

type DuplicateChatbotFlowInput = {
  flowId: string;
  name: string;
};

async function invokeChatbotManagement<T>(
  path: string,
  body: Record<string, string>,
) {
  const { data, error } = await supabase.functions.invoke<T>(
    `chatbot-management/${path}`,
    { method: "POST", body },
  );

  if (error || !data) {
    throw error || new Error("Chatbot management request failed");
  }

  return data;
}

export function useChatbotFlows(params: ChatbotFlowPageParams) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery<DataTablePage<ChatbotFlowListRow>>({
    queryKey: queryKeys.chatbotFlows.page(orgId, params),
    queryFn: async () => {
      const result = await supabase
        .rpc("list_chatbot_flows_page", {
          p_organization_id: orgId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_status: params.status,
        })
        .throwOnError();

      const rows = result.data as ChatbotFlowListRow[];
      return {
        rows,
        total: rows[0]?.total_count || 0,
      };
    },
    enabled: !!orgId,
  });
}

export function useCreateChatbotFlow() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ name }: CreateChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotFlowCreateResponse>("flows", {
        organization_id: orgId,
        name,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.all(orgId),
      });
    },
  });
}

export function useDuplicateChatbotFlow() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ flowId, name }: DuplicateChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotFlowCreateResponse>(
        `flows/${flowId}/duplicate`,
        {
          organization_id: orgId,
          name,
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.all(orgId),
      });
    },
  });
}

function useChatbotFlowLifecycle(action: "archive" | "restore") {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async (flowId: string) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotFlowLifecycleResponse>(
        `flows/${flowId}/${action}`,
        { organization_id: orgId },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.all(orgId),
      });
    },
  });
}

export function useArchiveChatbotFlow() {
  return useChatbotFlowLifecycle("archive");
}

export function useRestoreChatbotFlow() {
  return useChatbotFlowLifecycle("restore");
}
