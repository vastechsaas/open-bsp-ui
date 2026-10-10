import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useChatbotPermissions } from "./useModulePermissions";
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
import {
  conversationRetry,
  type NodeConversationSnapshot,
} from "@/utils/NodeConversationUtils";
import {
  performTakeover,
  type ConversationActionRequest,
} from "@/utils/NodeTakeoverUtils";

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
export type NodeChatbotBridge =
  Database["public"]["Tables"]["chatbot_node_bridges"]["Row"];

export function useNodeChatbotBridges(flowId: string) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const permissions = useChatbotPermissions();
  return useQuery({
    queryKey: [orgId, "chatbot_flows", "node-bridges", flowId, userId],
    enabled:
      !!userId &&
      permissions.isSuccess &&
      permissions.data.can_view &&
      !!orgId &&
      !!flowId,
    queryFn: async ({ signal }) =>
      (
        await invokeChatbotManagement<{ bridges: NodeChatbotBridge[] }>(
          `flows/${flowId}/node-bridges?organization_id=${encodeURIComponent(orgId!)}`,
          undefined,
          "GET",
          signal,
        )
      ).bridges,
    refetchInterval: (query) =>
      query.state.data?.some((bridge) =>
        ["pending", "syncing"].includes(bridge.sync_status),
      )
        ? 5000
        : false,
  });
}

export function useRetryNodeChatbotBridge(flowId: string) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) =>
      invokeChatbotManagement(
        `flows/${flowId}/node-bridge/retry`,
        { organization_id: orgId, request_id: requestId },
        "POST",
      ),
    onSettled: async () => {
      await client.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "node-bridges"],
      });
      await client.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "serving"],
      });
    },
  });
}

export function useNodeChatbotResume(conversationId?: string) {
  const request = useRef<{ key: string; id: string } | null>(null);
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const client = useQueryClient();
  const mapping = useQuery({
    queryKey: ["node-chatbot-resume", orgId, conversationId],
    enabled: !!orgId && !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_node_conversations")
        .select("node_conversation_id")
        .eq("organization_id", orgId!)
        .eq("conversation_id", conversationId!)
        .eq("human_owned", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });
  const resume = useMutation({
    mutationFn: async () => {
      const key = `${orgId}:${conversationId}`;
      if (request.current?.key !== key)
        request.current = { key, id: crypto.randomUUID() };
      return await invokeChatbotManagement(
        `conversations/${conversationId}/resume`,
        { organization_id: orgId, request_id: request.current.id },
        "POST",
      );
    },
    onSettled: () =>
      client.invalidateQueries({ queryKey: ["node-chatbot-resume"] }),
  });
  return { mapping, resume };
}

export function useNodeConversationLifecycle(conversationId?: string) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const request = useRef<ConversationActionRequest | null>(null);
  const client = useQueryClient();
  const key = ["node-conversation-lifecycle", userId, orgId, conversationId];
  const status = useQuery<NodeConversationSnapshot>({
    queryKey: key,
    enabled: !!userId && !!orgId && !!conversationId,
    refetchInterval: (query) =>
      query.state.data?.enabled
        ? query.state.data.pending_request_id || query.state.data.sync_pending
          ? 2000
          : 20000
        : false,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    staleTime: 0,
    retry: 1,
    queryFn: async ({ signal }) => {
      const fresh = await invokeChatbotManagement<NodeConversationSnapshot>(
        `conversations/${conversationId}/lifecycle?organization_id=${encodeURIComponent(orgId!)}`,
        undefined,
        "GET",
        signal,
      );
      const pending = client.getQueryData<NodeConversationSnapshot>(key);
      // A poll or Realtime invalidation must not remove the shared sending
      // fence while the POST (including its fresh preflight) is still running.
      return client.isMutating({ mutationKey: key }) &&
        pending?.optimistic_action
        ? {
            ...fresh,
            pending_request_id: fresh.pending_request_id ?? "submitting",
            optimistic_action: pending.optimistic_action,
          }
        : fresh;
    },
  });
  // One query owns the header/composer snapshot. This adapter keeps legacy
  // callers compatible without a second, independently stale mapping read.
  const mapping = {
    data: status.data?.enabled
      ? {
          lifecycle_enabled: status.data.lifecycle_enabled ?? true,
          human_owned:
            status.data.human_owned ?? status.data.state === "human_owned",
          pending_request_id: status.data.pending_request_id ?? null,
          sync_pending: status.data.sync_pending || status.isError,
        }
      : null,
  };
  const action = useMutation({
    mutationKey: key,
    onMutate: async (actionName) => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<NodeConversationSnapshot>(key, (snapshot) =>
        snapshot
          ? {
              ...snapshot,
              pending_request_id: "submitting",
              optimistic_action: actionName,
            }
          : snapshot,
      );
    },
    mutationFn: async (
      actionName: "resolve-and-close" | "resume" | "takeover",
    ) => {
      if (actionName === "takeover") {
        const supportRequestId = status.data?.support_request?.id;
        if (!userId || !orgId || !conversationId || !supportRequestId)
          throw new Error("Refresh conversation state before continuing");
        const ensureScope = () => {
          const state = useBoundStore.getState();
          if (
            state.ui.user?.id !== userId ||
            state.ui.activeOrgId !== orgId ||
            state.ui.activeConvId !== conversationId
          )
            throw new Error("Conversation changed. No takeover was submitted.");
        };
        const result = await performTakeover({
          scope: `${userId}:${orgId}:${conversationId}`,
          organizationId: orgId,
          supportRequestId,
          request,
          ensureScope,
          snapshot: async () => {
            const fresh =
              await invokeChatbotManagement<NodeConversationSnapshot>(
                `conversations/${conversationId}/lifecycle?organization_id=${encodeURIComponent(orgId)}`,
                undefined,
                "GET",
              );
            ensureScope();
            return fresh;
          },
          submit: (body) =>
            invokeChatbotManagement(
              `conversations/${conversationId}/takeover`,
              body,
              "POST",
            ),
        });
        if (result.status === "failed")
          throw new Error(result.last_error || "Conversation action failed");
        return result;
      }
      const snapshot = await invokeChatbotManagement<NodeConversationSnapshot>(
        `conversations/${conversationId}/lifecycle?organization_id=${encodeURIComponent(orgId!)}`,
        undefined,
        "GET",
      );
      const current = useBoundStore.getState();
      if (
        current.ui.user?.id !== userId ||
        current.ui.activeOrgId !== orgId ||
        current.ui.activeConvId !== conversationId
      )
        throw new Error("Conversation changed. No action was submitted.");
      if (
        !snapshot?.enabled ||
        !snapshot.last_inbound_wamid ||
        !snapshot.revision
      )
        throw new Error("Refresh conversation state before continuing");
      const requestKey = `${userId}:${orgId}:${conversationId}:${actionName}`;
      if (
        snapshot.operation?.request_id === request.current?.id &&
        snapshot.operation?.status === "succeeded"
      ) {
        request.current = null;
        return snapshot.operation;
      }
      const retry = conversationRetry(snapshot, actionName);
      if (
        retry ||
        request.current?.key !== requestKey ||
        !request.current.body
      ) {
        const id = retry?.request_id ?? crypto.randomUUID();
        request.current = {
          key: requestKey,
          id,
          body: {
            organization_id: orgId!,
            request_id: id,
            observed_last_inbound_wamid:
              retry?.observed_last_inbound_wamid ?? snapshot.last_inbound_wamid,
            expected_revision: retry?.expected_revision ?? snapshot.revision,
          },
        };
      }
      // Preserve the exact request and observations across ambiguous network
      // failures; a retry must reconcile that operation, not invent another.
      const result = await invokeChatbotManagement<{
        request_id: string;
        status: string;
        last_error?: string;
      }>(
        `conversations/${conversationId}/${actionName}`,
        request.current.body,
        "POST",
      );
      if (result.status === "failed") {
        request.current = null;
        throw new Error(result.last_error || "Conversation action failed");
      }
      if (result.status === "succeeded") request.current = null;
      return result;
    },
    onError: (error) => {
      // Only a definite reservation rejection permits a fresh request.
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined;
      if (
        code &&
        [
          "OWNERSHIP_CHANGED",
          "SUPPORT_STATE_CHANGED",
          "HUMAN_SEND_PENDING",
          "NEW_CUSTOMER_MESSAGE",
          "CONVERSATION_ACTION_REJECTED",
        ].includes(code)
      )
        request.current = null;
    },
    onSettled: async () => {
      client.setQueryData<NodeConversationSnapshot>(key, (snapshot) =>
        snapshot
          ? {
              ...snapshot,
              optimistic_action: undefined,
              pending_request_id:
                snapshot.pending_request_id === "submitting"
                  ? null
                  : snapshot.pending_request_id,
              sync_pending: true,
            }
          : snapshot,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ["node-chatbot-resume"] }),
        client.invalidateQueries({ queryKey: [orgId, "conversation_queues"] }),
        client.invalidateQueries({
          queryKey: [orgId, "support-inbox", userId],
        }),
      ]);
    },
  });
  return { mapping, status, action };
}
export type ChatbotWebhookCredential = Pick<
  Database["public"]["Tables"]["chatbot_webhook_credentials"]["Row"],
  "id" | "name" | "created_at" | "updated_at"
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
  optionInput?: {
    kind: "button" | "list_selection";
    id: string;
  };
  webhookMocks?: Record<
    string,
    {
      outcome: "success" | "error";
      status_code: number;
      body: unknown;
    }
  >;
};

type ActivateChatbotFlowInput = {
  flowId: string;
  organizationAddress: string;
  versionId: string;
  engine?: "native" | "node";
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
  signal?: AbortSignal,
) {
  const { data, error } = await supabase.functions.invoke<T>(
    `chatbot-management/${path}`,
    {
      method,
      signal,
      ...(body ? { body } : {}),
    },
  );

  if (error) throw await normalizeChatbotManagementError(error);
  if (!data) throw new Error("Chatbot management request failed");

  return data;
}

export function useChatbotFlowDraft(flowId: string, enabled = true) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const permissions = useChatbotPermissions();

  return useQuery<ChatbotFlowEditorData>({
    queryKey: [...queryKeys.chatbotFlows.draft(orgId, flowId), userId],
    queryFn: async ({ signal }) => {
      const [flowResult, draft] = await Promise.all([
        supabase
          .from("chatbot_flows")
          .select("id, name, status")
          .eq("organization_id", orgId!)
          .eq("id", flowId)
          .abortSignal(signal)
          .throwOnError()
          .single(),
        invokeChatbotManagement<ChatbotFlowDraft>(
          `flows/${flowId}/draft?organization_id=${encodeURIComponent(orgId!)}`,
          undefined,
          "GET",
          signal,
        ),
      ]);

      if (!flowResult.data) {
        throw new Error("Chatbot flow not found");
      }

      return { flow: flowResult.data, draft };
    },
    enabled:
      !!userId &&
      permissions.isSuccess &&
      permissions.data.can_view &&
      !!orgId &&
      !!flowId &&
      enabled,
  });
}

export function useSaveChatbotFlowDraft() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);

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
        [...queryKeys.chatbotFlows.draft(orgId, variables.flowId), userId],
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
      optionInput,
      webhookMocks,
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
          ...(optionInput === undefined ? {} : { option_input: optionInput }),
          webhook_mocks: webhookMocks ?? {},
        },
      );
    },
  });
}

export function useChatbotWebhookCredentials() {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const permissions = useChatbotPermissions();
  return useQuery<ChatbotWebhookCredential[]>({
    queryKey: [...queryKeys.chatbotFlows.webhookCredentials(orgId), userId],
    queryFn: async ({ signal }) => {
      const response = await invokeChatbotManagement<{
        credentials: ChatbotWebhookCredential[];
      }>(
        `webhook-credentials?organization_id=${encodeURIComponent(orgId!)}`,
        undefined,
        "GET",
        signal,
      );
      return response.credentials;
    },
    enabled:
      !!userId && permissions.isSuccess && permissions.data.can_view && !!orgId,
  });
}

export function useCreateChatbotWebhookCredential() {
  const queryClient = useQueryClient();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  return useMutation({
    mutationFn: async ({
      name,
      headers,
    }: {
      name: string;
      headers: Record<string, string>;
    }) => {
      if (!orgId) throw new Error("No active organization");
      return await invokeChatbotManagement<{
        credential: ChatbotWebhookCredential;
      }>("webhook-credentials", {
        organization_id: orgId,
        name,
        headers,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.webhookCredentials(orgId),
      });
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
      await queryClient.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "node-bridges"],
      });
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
  const userId = useBoundStore((state) => state.ui.user?.id);
  const permissions = useChatbotPermissions();

  return useQuery<ChatbotFlowVersion[]>({
    queryKey: [...queryKeys.chatbotFlows.versions(orgId, flowId), userId],
    queryFn: async ({ signal }) => {
      const result = await supabase
        .from("chatbot_flow_versions")
        .select(
          "id, flow_id, version, status, editor_graph, published_at, created_at, updated_at",
        )
        .eq("organization_id", orgId!)
        .eq("flow_id", flowId)
        .order("version", { ascending: false })
        .abortSignal(signal)
        .throwOnError();

      return result.data;
    },
    enabled:
      !!userId &&
      permissions.isSuccess &&
      permissions.data.can_view &&
      !!orgId &&
      !!flowId &&
      enabled,
  });
}

export function useChatbotFlowDeployments(flowId: string, enabled = true) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const permissions = useChatbotPermissions();

  return useQuery<ChatbotFlowDeployment[]>({
    queryKey: [...queryKeys.chatbotFlows.deployments(orgId, flowId), userId],
    queryFn: async ({ signal }) => {
      const response = await invokeChatbotManagement<{
        deployments: ChatbotFlowDeployment[];
      }>(
        `flows/${flowId}/deployments?organization_id=${encodeURIComponent(
          orgId!,
        )}`,
        undefined,
        "GET",
        signal,
      );
      return response.deployments;
    },
    enabled:
      !!userId &&
      permissions.isSuccess &&
      permissions.data.can_view &&
      !!orgId &&
      !!flowId &&
      enabled,
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
      engine = "node",
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
          engine,
          ...(engine === "node" ? { request_id: crypto.randomUUID() } : {}),
        },
        "PUT",
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "node-bridges"],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.deployments(orgId, variables.flowId),
      });
      await queryClient.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "serving"],
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
        queryKey: [orgId, "chatbot_flows", "node-bridges"],
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatbotFlows.deployments(orgId, variables.flowId),
      });
      await queryClient.invalidateQueries({
        queryKey: [orgId, "chatbot_flows", "serving"],
      });
    },
  });
}

export function useChatbotFlows(params: ChatbotFlowPageParams) {
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  const permissions = useChatbotPermissions();

  return useQuery<DataTablePage<ChatbotFlowListRow>>({
    queryKey: [...queryKeys.chatbotFlows.page(orgId, params), userId],
    queryFn: async ({ signal }) => {
      const result = await supabase
        .rpc("list_chatbot_flows_page", {
          p_organization_id: orgId!,
          p_page: params.page,
          p_page_size: params.pageSize,
          p_search: params.search || undefined,
          p_status: params.status,
        })
        .abortSignal(signal)
        .throwOnError();

      const rows = result.data as ChatbotFlowListRow[];
      return {
        rows,
        total: rows[0]?.total_count || 0,
      };
    },
    enabled:
      !!userId && permissions.isSuccess && permissions.data.can_view && !!orgId,
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

export function useChatbotBuilderOptions() {
  const orgId = useBoundStore((s) => s.ui.activeOrgId);
  const userId = useBoundStore((s) => s.ui.user?.id);
  const permissions = useChatbotPermissions();
  return useQuery({
    queryKey: [orgId, "chatbot_flows", "options", userId],
    enabled:
      !!orgId && !!userId && permissions.isSuccess && permissions.data.can_view,
    queryFn: ({ signal }) =>
      invokeChatbotManagement<{
        agents: { id: string; name: string }[];
        queues: { id: string; name: string }[];
      }>(
        `builder-options?organization_id=${encodeURIComponent(orgId!)}`,
        undefined,
        "GET",
        signal,
      ),
  });
}
