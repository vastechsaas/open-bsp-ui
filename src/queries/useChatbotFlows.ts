import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { type Database, supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  createChatbotManagementError,
  type ChatbotEditorGraph,
  type ChatbotFlowStatus,
} from "@/utils/ChatbotFlowUtils";
import type {
  DataTablePage,
  DataTablePageParams,
} from "@/utils/DataTableUtils";
import { queryKeys } from "./queryKeys";

export type ChatbotFlowListRow =
  Database["public"]["Functions"]["list_chatbot_flows_page"]["Returns"][number];

export type ChatbotFlowDraft = Pick<
  Database["public"]["Tables"]["chatbot_flow_versions"]["Row"],
  | "id"
  | "flow_id"
  | "version"
  | "status"
  | "editor_graph"
  | "created_at"
  | "updated_at"
>;

export type ChatbotFlowEditorData = {
  flow: Pick<
    Database["public"]["Tables"]["chatbot_flows"]["Row"],
    "id" | "name" | "status"
  >;
  draft: ChatbotFlowDraft;
};

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

type SaveChatbotFlowDraftInput = {
  flowId: string;
  versionId: string;
  expectedUpdatedAt: string;
  editorGraph: ChatbotEditorGraph;
};

async function normalizeChatbotManagementError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    let payload: unknown;
    try {
      payload = await response?.clone().json();
    } catch {
      // Keep the generic Edge Function error when no JSON body is available.
    }
    return createChatbotManagementError(response?.status, payload);
  }

  return error instanceof Error
    ? error
    : new Error("Chatbot management request failed");
}

async function invokeChatbotManagement<T>(
  path: string,
  body?: Record<string, unknown>,
  method: "GET" | "POST" | "PUT" = "POST",
) {
  const { data, error } = await supabase.functions.invoke<T>(
    `chatbot-management/${path}`,
    {
      method,
      ...(body ? { body } : {}),
    },
  );

  if (error) throw await normalizeChatbotManagementError(error);
  if (!data) throw new Error("Chatbot management request failed");

  return data;
}

export function useChatbotFlowDraft(flowId: string, enabled = true) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery<ChatbotFlowEditorData>({
    queryKey: queryKeys.chatbotFlows.draft(orgId, flowId),
    queryFn: async () => {
      const [flowResult, draft] = await Promise.all([
        supabase
          .from("chatbot_flows")
          .select("id, name, status")
          .eq("organization_id", orgId!)
          .eq("id", flowId)
          .throwOnError()
          .single(),
        invokeChatbotManagement<ChatbotFlowDraft>(
          `flows/${flowId}/draft?organization_id=${encodeURIComponent(orgId!)}`,
          undefined,
          "GET",
        ),
      ]);

      if (!flowResult.data) {
        throw new Error("Chatbot flow not found");
      }

      return { flow: flowResult.data, draft };
    },
    enabled: !!orgId && !!flowId && enabled,
  });
}

export function useSaveChatbotFlowDraft() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      flowId,
      versionId,
      expectedUpdatedAt,
      editorGraph,
    }: SaveChatbotFlowDraftInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotFlowDraft>(
        `flows/${flowId}/draft`,
        {
          organization_id: orgId,
          version_id: versionId,
          expected_updated_at: expectedUpdatedAt,
          editor_graph: editorGraph,
        },
        "PUT",
      );
    },
    onSuccess: async (draft, variables) => {
      queryClient.setQueryData<ChatbotFlowEditorData>(
        queryKeys.chatbotFlows.draft(orgId, variables.flowId),
        (current) => (current ? { ...current, draft } : current),
      );
      await queryClient.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "page"],
      });
    },
  });
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
