import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { type Database, supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import {
  createChatbotManagementError,
  type ChatbotEditorGraph,
  type ChatbotFlowStatus,
  type ChatbotFlowValidationResult,
} from "@/utils/ChatbotFlowUtils";
import type { ChatbotSimulationStep } from "@/utils/ChatbotSimulationUtils";
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

export type ChatbotFlowVersion = Pick<
  Database["public"]["Tables"]["chatbot_flow_versions"]["Row"],
  | "id"
  | "flow_id"
  | "version"
  | "status"
  | "editor_graph"
  | "published_at"
  | "created_at"
  | "updated_at"
>;

export type ChatbotFlowDeployment =
  Database["public"]["Tables"]["chatbot_flow_deployments"]["Row"];

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

type ValidateChatbotFlowInput = {
  flowId: string;
  editorGraph: ChatbotEditorGraph;
};

type PublishChatbotFlowInput = {
  flowId: string;
  versionId: string;
  expectedUpdatedAt: string;
};

type SimulateChatbotFlowInput = {
  flowId: string;
  editorGraph: ChatbotEditorGraph;
  currentNodeId?: string;
  variables: Record<string, unknown>;
  freeTextInput?: string;
};

type ActivateChatbotFlowInput = {
  flowId: string;
  organizationAddress: string;
  versionId: string;
  agentId: string;
};

type DeactivateChatbotFlowInput = {
  flowId: string;
  organizationAddress: string;
};

export type ChatbotFlowPublishResponse = {
  valid: true;
  outcome: "published";
  published_version_id: string;
  published_version: number;
  draft_id: string;
  draft_version: number;
  draft_updated_at: string;
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
  method: "DELETE" | "GET" | "POST" | "PUT" = "POST",
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

export function useValidateChatbotFlow() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({ flowId, editorGraph }: ValidateChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotFlowValidationResult>(
        `flows/${flowId}/validate`,
        {
          organization_id: orgId,
          editor_graph: editorGraph,
        },
      );
    },
  });
}

export function useSimulateChatbotFlow() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      flowId,
      editorGraph,
      currentNodeId,
      variables,
      freeTextInput,
    }: SimulateChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotSimulationStep>(
        `flows/${flowId}/simulate`,
        {
          organization_id: orgId,
          editor_graph: editorGraph,
          variables,
          ...(currentNodeId ? { current_node_id: currentNodeId } : {}),
          ...(freeTextInput === undefined
            ? {}
            : { free_text_input: freeTextInput }),
        },
      );
    },
  });
}

export function usePublishChatbotFlow() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      flowId,
      versionId,
      expectedUpdatedAt,
    }: PublishChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<ChatbotFlowPublishResponse>(
        `flows/${flowId}/publish`,
        {
          organization_id: orgId,
          version_id: versionId,
          expected_updated_at: expectedUpdatedAt,
        },
      );
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.chatbotFlows.draft(orgId, variables.flowId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.chatbotFlows.versions(orgId, variables.flowId),
        }),
        queryClient.invalidateQueries({
          queryKey: [orgId, "chatbot_flows", "page"],
        }),
      ]);
    },
  });
}

export function useChatbotFlowVersions(flowId: string, enabled = true) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery<ChatbotFlowVersion[]>({
    queryKey: queryKeys.chatbotFlows.versions(orgId, flowId),
    queryFn: async () => {
      const result = await supabase
        .from("chatbot_flow_versions")
        .select(
          "id, flow_id, version, status, editor_graph, published_at, created_at, updated_at",
        )
        .eq("organization_id", orgId!)
        .eq("flow_id", flowId)
        .order("version", { ascending: false })
        .throwOnError();

      return result.data;
    },
    enabled: !!orgId && !!flowId && enabled,
  });
}

export function useChatbotFlowDeployments(flowId: string, enabled = true) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useQuery<ChatbotFlowDeployment[]>({
    queryKey: queryKeys.chatbotFlows.deployments(orgId, flowId),
    queryFn: async () => {
      const response = await invokeChatbotManagement<{
        deployments: ChatbotFlowDeployment[];
      }>(
        `flows/${flowId}/deployments?organization_id=${encodeURIComponent(
          orgId!,
        )}`,
        undefined,
        "GET",
      );
      return response.deployments;
    },
    enabled: !!orgId && !!flowId && enabled,
  });
}

export function useActivateChatbotFlow() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      flowId,
      organizationAddress,
      versionId,
      agentId,
    }: ActivateChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<{
        deployment: ChatbotFlowDeployment;
      }>(
        `flows/${flowId}/deployment`,
        {
          organization_id: orgId,
          organization_address: organizationAddress,
          version_id: versionId,
          agent_id: agentId,
        },
        "PUT",
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.deployments(orgId, variables.flowId),
      });
    },
  });
}

export function useDeactivateChatbotFlow() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);

  return useMutation({
    mutationFn: async ({
      flowId,
      organizationAddress,
    }: DeactivateChatbotFlowInput) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<{ deactivated: true }>(
        `flows/${flowId}/deployment`,
        {
          organization_id: orgId,
          organization_address: organizationAddress,
        },
        "DELETE",
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.deployments(orgId, variables.flowId),
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
