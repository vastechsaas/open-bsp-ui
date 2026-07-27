import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import {
  createFileRoute,
  useBlocker,
  useNavigate,
} from "@tanstack/react-router";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type NodeTypes,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Braces,
  Boxes,
  CircleStop,
  FileClock,
  FlaskConical,
  GitBranch,
  Info,
  MessageSquareText,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Play,
  RefreshCw,
  Rocket,
  RadioTower,
  Save,
  ShieldCheck,
  Copy,
  GripVertical,
  LockKeyhole,
  Plus,
  TextCursorInput,
  Trash2,
  X,
} from "lucide-react";
import { ChatbotFlowDeploymentDialog } from "@/components/chatbots/ChatbotFlowDeployment";
import { ChatbotFlowSimulator } from "@/components/chatbots/ChatbotFlowSimulator";
import {
  PublishChatbotDialog,
  ValidationResultsDialog,
  VersionHistoryPanel,
  VersionPreviewDialog,
} from "@/components/chatbots/ChatbotFlowPublication";
import ChatbotFlowNode from "@/components/chatbots/ChatbotFlowNode";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent, useCurrentAgents } from "@/queries/useAgents";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import {
  type ChatbotFlowEditorData,
  type ChatbotFlowVersion,
  useActivateChatbotFlow,
  useChatbotFlowDraft,
  useChatbotFlowDeployments,
  useChatbotFlowVersions,
  useDeactivateChatbotFlow,
  usePublishChatbotFlow,
  useSaveChatbotFlowDraft,
  useSimulateChatbotFlow,
  useValidateChatbotFlow,
} from "@/queries/useChatbotFlows";
import type { AIAgentRow } from "@/supabase/client";
import {
  appendChatbotSimulationInput,
  applyChatbotSimulationStep,
  createChatbotSimulationSession,
  type ChatbotSimulationSession,
} from "@/utils/ChatbotSimulationUtils";
import {
  addChatbotConditionBranch,
  ChatbotDraftConflictError,
  ChatbotPublishValidationError,
  CHATBOT_INPUT_MAX_LENGTH,
  CHATBOT_MESSAGE_MAX_LENGTH,
  chatbotConditionOperators,
  createChatbotNode,
  duplicateChatbotNode,
  ensureChatbotStartNode,
  getAvailableChatbotVariables,
  getChatbotConditionEdgeLabel,
  getChatbotDraftSaveStatus,
  getChatbotEditorActionAvailability,
  getChatbotEditorGraphFingerprint,
  getChatbotEditorShortcut,
  getChatbotEditorValidationFingerprint,
  isValidChatbotConnection,
  normalizeChatbotEditorGraph,
  removeChatbotConditionBranch,
  removeChatbotNode,
  type ChatbotConditionOperator,
  type ChatbotCoreNodeType,
  type ChatbotEditorGraph,
  type ChatbotFlowNode as ChatbotFlowNodeType,
  type ChatbotFlowValidationResult,
  serializeChatbotEditorGraph,
  updateChatbotCollectInputConfig,
  updateChatbotConditionBranch,
  updateChatbotConditionVariable,
  updateChatbotMessageText,
} from "@/utils/ChatbotFlowUtils";

export const Route = createFileRoute("/_auth/chatbots/$flowId")({
  component: ChatbotFlowEditor,
});

type MobilePanel = "library" | "inspector" | null;
const CHATBOT_NODE_DRAG_TYPE = "application/openbsp-chatbot-node";
const chatbotNodeTypes: NodeTypes = { chatbotNode: ChatbotFlowNode };

function ChatbotFlowEditor() {
  const { flowId } = Route.useParams();
  const navigate = useNavigate();
  const { translate: t } = useTranslation();
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [lastPublishedVersion, setLastPublishedVersion] = useState<
    number | null
  >(null);
  const { data: currentAgent, isLoading: agentLoading } = useCurrentAgent();
  const canManage =
    currentAgent?.extra?.role === "owner" ||
    currentAgent?.extra?.role === "admin";
  const draftQuery = useChatbotFlowDraft(flowId, canManage);

  const goBack = () => navigate({ to: "/chatbots" });
  const reloadDraft = async () => {
    const result = await draftQuery.refetch();
    if (!result.error) {
      setWorkspaceRevision((current) => current + 1);
    }
  };

  if (agentLoading) {
    return <EditorLoading label={t("Cargando editor")} />;
  }

  if (!canManage) {
    return (
      <EditorState
        title={t("No tenés permisos para editar este chatbot")}
        description={t(
          "Solo propietarios y administradores pueden abrir el editor de flujos.",
        )}
        actionLabel={t("Volver al listado")}
        onAction={() => void goBack()}
      />
    );
  }

  if (draftQuery.isLoading) {
    return <EditorLoading label={t("Cargando borrador")} />;
  }

  if (draftQuery.isError || !draftQuery.data) {
    return (
      <EditorState
        title={t("No se pudo cargar el borrador")}
        description={t(
          "Revisá el acceso al flujo e intentá cargarlo nuevamente.",
        )}
        actionLabel={t("Reintentar")}
        secondaryLabel={t("Volver al listado")}
        onAction={() => void draftQuery.refetch()}
        onSecondary={() => void goBack()}
      />
    );
  }

  return (
    <ReactFlowProvider>
      <FlowEditorWorkspace
        key={`${draftQuery.data.draft.id}:${workspaceRevision}`}
        editor={draftQuery.data}
        graph={normalizeChatbotEditorGraph(draftQuery.data.draft.editor_graph)}
        onBack={() => void goBack()}
        onRefresh={reloadDraft}
        refreshing={draftQuery.isFetching}
        lastPublishedVersion={lastPublishedVersion}
        onPublished={setLastPublishedVersion}
        onDismissPublished={() => setLastPublishedVersion(null)}
      />
    </ReactFlowProvider>
  );
}

function FlowEditorWorkspace({
  editor,
  graph,
  onBack,
  onRefresh,
  refreshing,
  lastPublishedVersion,
  onPublished,
  onDismissPublished,
}: {
  editor: ChatbotFlowEditorData;
  graph: ChatbotEditorGraph;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  lastPublishedVersion: number | null;
  onPublished: (version: number) => void;
  onDismissPublished: () => void;
}) {
  const { translate: t } = useTranslation();
  const initialGraph = ensureChatbotStartNode(graph);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [viewport, setViewport] = useState(graph.viewport);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(
    editor.draft.updated_at,
  );
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    getChatbotEditorGraphFingerprint(graph),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [pendingProtectedAction, setPendingProtectedAction] = useState<
    "back" | "reload" | null
  >(null);
  const [validationSnapshot, setValidationSnapshot] = useState<{
    fingerprint: string;
    result: ChatbotFlowValidationResult;
  } | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [deploymentOpen, setDeploymentOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulationSession, setSimulationSession] =
    useState<ChatbotSimulationSession>(createChatbotSimulationSession);
  const [previewVersion, setPreviewVersion] =
    useState<ChatbotFlowVersion | null>(null);
  const saveDraft = useSaveChatbotFlowDraft();
  const validateDraft = useValidateChatbotFlow();
  const publishDraft = usePublishChatbotFlow();
  const activateFlow = useActivateChatbotFlow();
  const deactivateFlow = useDeactivateChatbotFlow();
  const simulateFlow = useSimulateChatbotFlow();
  const versionsQuery = useChatbotFlowVersions(
    editor.flow.id,
    versionsOpen || deploymentOpen,
  );
  const deploymentsQuery = useChatbotFlowDeployments(editor.flow.id);
  const addressesQuery = useOrganizationsAddresses();
  const agentsQuery = useCurrentAgents();
  const connectedWhatsAppAddresses = (addressesQuery.data ?? []).filter(
    (address) =>
      address.service === "whatsapp" && address.status === "connected",
  );
  const activeAiAgents = (agentsQuery.data ?? []).filter(
    (agent): agent is AIAgentRow =>
      agent.ai && agent.extra?.mode !== "inactive",
  );
  const { fitView, screenToFlowPosition, setCenter } = useReactFlow();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const availableVariables = selectedNode
    ? getAvailableChatbotVariables(selectedNode.id, nodes, edges)
    : [];
  const editorGraph = useMemo(
    () => serializeChatbotEditorGraph({ nodes, edges, viewport }),
    [edges, nodes, viewport],
  );
  const currentFingerprint = useMemo(
    () => getChatbotEditorGraphFingerprint(editorGraph),
    [editorGraph],
  );
  const currentValidationFingerprint = useMemo(
    () => getChatbotEditorValidationFingerprint(editorGraph),
    [editorGraph],
  );
  const dirty = currentFingerprint !== savedFingerprint;
  const conflict =
    saveDraft.error instanceof ChatbotDraftConflictError ||
    publishDraft.error instanceof ChatbotDraftConflictError;
  const saveStatus = getChatbotDraftSaveStatus({
    dirty,
    saving: saveDraft.isPending,
    failed: saveDraft.isError,
    conflict,
  });

  const runSimulation = async (
    baseSession: ChatbotSimulationSession,
    freeTextInput?: string,
  ) => {
    const requestSession =
      freeTextInput === undefined
        ? baseSession
        : appendChatbotSimulationInput(baseSession, freeTextInput);
    setSimulationSession(requestSession);

    try {
      const step = await simulateFlow.mutateAsync({
        flowId: editor.flow.id,
        editorGraph,
        currentNodeId: requestSession.currentNodeId,
        variables: requestSession.variables,
        freeTextInput,
      });
      setSimulationSession((current) =>
        applyChatbotSimulationStep(current, step),
      );
    } catch {
      // The mutation error is rendered in the simulator panel.
    }
  };

  const startSimulation = () => {
    const session = createChatbotSimulationSession();
    simulateFlow.reset();
    setSimulationSession(session);
    setSimulatorOpen(true);
    setMobilePanel(null);
    void runSimulation(session);
  };
  const shouldBlockNavigation = useCallback(() => dirty, [dirty]);
  const navigationBlocker = useBlocker({
    shouldBlockFn: shouldBlockNavigation,
    enableBeforeUnload: dirty,
    disabled: !dirty,
    withResolver: true,
  });
  const validationResult =
    publishDraft.error instanceof ChatbotPublishValidationError
      ? {
          valid: false as const,
          issues: publishDraft.error.issues,
        }
      : (validationSnapshot?.result ?? null);
  const validationIsStale =
    validationSnapshot !== null &&
    validationSnapshot.fingerprint !== currentValidationFingerprint;
  const actionAvailability = getChatbotEditorActionAvailability({
    dirty,
    saving: saveDraft.isPending,
    validating: validateDraft.isPending,
    publishing: publishDraft.isPending,
    conflict,
    archived: editor.flow.status === "archived",
    selectedNodeType: selectedNode?.data.node_type,
  });

  const saveEditorGraph = useCallback(async () => {
    if (!actionAvailability.canSave) return;
    try {
      const savedDraft = await saveDraft.mutateAsync({
        flowId: editor.flow.id,
        versionId: editor.draft.id,
        expectedUpdatedAt,
        editorGraph,
      });
      setExpectedUpdatedAt(savedDraft.updated_at);
      setSavedFingerprint(currentFingerprint);
    } catch {
      // The mutation state renders the actionable save error.
    }
  }, [
    actionAvailability.canSave,
    currentFingerprint,
    editor.draft.id,
    editor.flow.id,
    editorGraph,
    expectedUpdatedAt,
    saveDraft,
  ]);

  const validateEditorGraph = async () => {
    try {
      const result = await validateDraft.mutateAsync({
        flowId: editor.flow.id,
        editorGraph,
      });
      setValidationSnapshot({
        fingerprint: currentValidationFingerprint,
        result,
      });
      setValidationDialogOpen(true);
    } catch {
      // The mutation state renders the validation request failure.
    }
  };

  const focusValidationNode = (nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    setMobilePanel(null);
    void setCenter(node.position.x + 110, node.position.y + 48, {
      zoom: 1.15,
      duration: 300,
    });
  };

  const publishEditorDraft = async () => {
    try {
      const result = await publishDraft.mutateAsync({
        flowId: editor.flow.id,
        versionId: editor.draft.id,
        expectedUpdatedAt,
      });
      onPublished(result.published_version);
      setPublishDialogOpen(false);
      setValidationSnapshot(null);
    } catch (error) {
      setPublishDialogOpen(false);
      if (error instanceof ChatbotPublishValidationError) {
        setValidationSnapshot({
          fingerprint: currentValidationFingerprint,
          result: { valid: false, issues: error.issues },
        });
        setValidationDialogOpen(true);
      }
    }
  };

  const runProtectedAction = async (action: "back" | "reload") => {
    setPendingProtectedAction(null);
    if (action === "back") {
      if (navigationBlocker.status === "blocked") {
        navigationBlocker.proceed();
      } else {
        onBack();
      }
      return;
    }
    await onRefresh();
  };

  const requestProtectedAction = (action: "back" | "reload") => {
    if (action === "back") {
      onBack();
      return;
    }
    if (dirty) {
      setPendingProtectedAction(action);
      return;
    }
    void runProtectedAction(action);
  };

  const addNode = useCallback(
    (type: ChatbotCoreNodeType, position?: XYPosition) => {
      if (
        type === "start" &&
        nodes.some((node) => node.data.node_type === "start")
      ) {
        return;
      }

      const fallbackPosition = {
        x: 80 + nodes.length * 300,
        y: 160,
      };
      const newNode = createChatbotNode(type, position ?? fallbackPosition);
      setNodes((currentNodes) => [...currentNodes, newNode]);
      setSelectedNodeId(newNode.id);
      setMobilePanel(null);
      if (!position) {
        requestAnimationFrame(() => {
          void fitView({ padding: 0.2, duration: 250 });
        });
      }
    },
    [fitView, nodes, setNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidChatbotConnection(connection, nodes, edges)) return;
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const conditionBranch =
        sourceNode?.data.node_type === "condition"
          ? sourceNode.data.branches?.find(
              (branch) => branch.id === connection.sourceHandle,
            )
          : undefined;
      const edgeData =
        sourceNode?.data.node_type === "condition" &&
        connection.sourceHandle !== "default" &&
        conditionBranch
          ? {
              kind: "condition" as const,
              operator: conditionBranch.operator,
              value: conditionBranch.value,
            }
          : { kind: "default" as const };
      const isConditionEdge = sourceNode?.data.node_type === "condition";

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            id: `edge-${crypto.randomUUID()}`,
            type: "smoothstep",
            data: edgeData,
            ...(isConditionEdge
              ? {
                  label: getChatbotConditionEdgeLabel(
                    edgeData.kind,
                    "operator" in edgeData ? edgeData.operator : undefined,
                    "value" in edgeData ? edgeData.value : undefined,
                  ),
                  labelStyle: {
                    fontSize: 10,
                    fontWeight: 600,
                    fill: "var(--foreground)",
                  },
                  labelBgStyle: {
                    fill: "var(--card)",
                    stroke: "var(--border)",
                  },
                  labelBgPadding: [6, 4] as [number, number],
                  labelBgBorderRadius: 6,
                }
              : {}),
          },
          currentEdges,
        ),
      );
    },
    [edges, nodes, setEdges],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(CHATBOT_NODE_DRAG_TYPE);
      if (
        type !== "send_message" &&
        type !== "collect_input" &&
        type !== "condition" &&
        type !== "end"
      ) {
        return;
      }

      addNode(
        type,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
    },
    [addNode, screenToFlowPosition],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const sourceNode = nodes.find((node) => node.id === nodeId);
      if (!sourceNode) return;
      const duplicatedNode = duplicateChatbotNode(sourceNode);
      if (!duplicatedNode) return;

      setNodes((currentNodes) => [...currentNodes, duplicatedNode]);
      setSelectedNodeId(duplicatedNode.id);
    },
    [nodes, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const updatedGraph = removeChatbotNode({ nodes, edges }, nodeId);
      if (updatedGraph.nodes === nodes) return;

      setNodes(updatedGraph.nodes);
      setEdges(updatedGraph.edges);
      setSelectedNodeId((current) => (current === nodeId ? null : current));
    },
    [edges, nodes, setEdges, setNodes],
  );

  const updateMessageText = useCallback(
    (nodeId: string, text: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId ? updateChatbotMessageText(node, text) : node,
        ),
      );
    },
    [setNodes],
  );

  const updateCollectInput = useCallback(
    (nodeId: string, updates: Record<string, unknown>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? updateChatbotCollectInputConfig(node, updates)
            : node,
        ),
      );
    },
    [setNodes],
  );

  const updateConditionVariable = useCallback(
    (nodeId: string, variable: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? updateChatbotConditionVariable(node, variable)
            : node,
        ),
      );
    },
    [setNodes],
  );

  const addConditionBranch = useCallback(
    (nodeId: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId ? addChatbotConditionBranch(node) : node,
        ),
      );
    },
    [setNodes],
  );

  const updateConditionBranch = useCallback(
    (
      nodeId: string,
      branchId: string,
      updates: { operator?: ChatbotConditionOperator; value?: string },
    ) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? updateChatbotConditionBranch(node, branchId, updates)
            : node,
        ),
      );
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.source !== nodeId || edge.sourceHandle !== branchId) {
            return edge;
          }
          const operator =
            updates.operator ??
            (typeof edge.data?.operator === "string"
              ? (edge.data.operator as ChatbotConditionOperator)
              : "equals");
          const value =
            updates.value ??
            (typeof edge.data?.value === "string" ? edge.data.value : "");
          return {
            ...edge,
            data: { ...edge.data, kind: "condition", operator, value },
            label: getChatbotConditionEdgeLabel("condition", operator, value),
          };
        }),
      );
    },
    [setEdges, setNodes],
  );

  const removeConditionBranch = useCallback(
    (nodeId: string, branchId: string) => {
      const conditionNode = nodes.find((node) => node.id === nodeId);
      if ((conditionNode?.data.branches?.length ?? 0) <= 1) return;
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? removeChatbotConditionBranch(node, branchId)
            : node,
        ),
      );
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) => !(edge.source === nodeId && edge.sourceHandle === branchId),
        ),
      );
    },
    [nodes, setEdges, setNodes],
  );

  useEffect(() => {
    const handleEditorKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const shortcut = getChatbotEditorShortcut({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        editableTarget: Boolean(
          target?.closest("input, textarea, select, [contenteditable='true']"),
        ),
        composing: event.isComposing,
      });

      if (shortcut === "save") {
        event.preventDefault();
        if (actionAvailability.canSave) void saveEditorGraph();
        return;
      }

      if (
        shortcut === "delete-selected" &&
        selectedNodeId &&
        actionAvailability.canDeleteSelected
      ) {
        event.preventDefault();
        deleteNode(selectedNodeId);
        return;
      }

      if (
        shortcut === "dismiss" &&
        (selectedNodeId ||
          mobilePanel ||
          validationDialogOpen ||
          publishDialogOpen ||
          versionsOpen ||
          simulatorOpen ||
          previewVersion)
      ) {
        event.preventDefault();
        setSelectedNodeId(null);
        setMobilePanel(null);
        setValidationDialogOpen(false);
        setPublishDialogOpen(false);
        setVersionsOpen(false);
        setSimulatorOpen(false);
        setPreviewVersion(null);
      }
    };

    window.addEventListener("keydown", handleEditorKeyDown);
    return () => window.removeEventListener("keydown", handleEditorKeyDown);
  }, [
    actionAvailability.canDeleteSelected,
    actionAvailability.canSave,
    deleteNode,
    mobilePanel,
    previewVersion,
    publishDialogOpen,
    saveEditorGraph,
    selectedNodeId,
    simulatorOpen,
    validationDialogOpen,
    versionsOpen,
  ]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-[10px] border-b border-border px-[12px] py-[10px] md:px-[18px]">
        <button
          type="button"
          title={t("Volver a chatbots")}
          aria-label={t("Volver a chatbots")}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border hover:bg-muted"
          onClick={() => requestProtectedAction("back")}
        >
          <ArrowLeft className="h-[17px] w-[17px]" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">
            {editor.flow.name}
          </div>
          <div className="mt-[1px] flex items-center gap-[7px] text-[11px] text-muted-foreground">
            <span>
              {t("Borrador")} v{editor.draft.version}
            </span>
            <span aria-hidden="true">•</span>
            <SaveStatusLabel status={saveStatus} />
          </div>
        </div>
        <div className="flex items-center gap-[7px]">
          <button
            type="button"
            title={t("Biblioteca de nodos")}
            aria-label={t("Biblioteca de nodos")}
            className={`flex h-[36px] w-[36px] items-center justify-center rounded-lg border lg:hidden ${
              mobilePanel === "library"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
            onClick={() =>
              setMobilePanel((current) =>
                current === "library" ? null : "library",
              )
            }
          >
            <PanelLeft className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            title={t("Inspector")}
            aria-label={t("Inspector")}
            className={`flex h-[36px] w-[36px] items-center justify-center rounded-lg border lg:hidden ${
              mobilePanel === "inspector"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
            onClick={() =>
              setMobilePanel((current) =>
                current === "inspector" ? null : "inspector",
              )
            }
          >
            <PanelRight className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            title={t("Simular flujo")}
            aria-label={t("Simular flujo")}
            className={`flex h-[36px] items-center gap-[7px] rounded-lg border px-[10px] text-[12px] ${
              simulatorOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
            onClick={startSimulation}
          >
            <FlaskConical className="h-[15px] w-[15px]" />
            <span className="hidden xl:inline">{t("Simular")}</span>
          </button>
          <button
            type="button"
            title={t("Versiones")}
            aria-label={t("Versiones")}
            className="flex h-[36px] items-center gap-[7px] rounded-lg border border-border px-[10px] text-[12px] hover:bg-muted"
            onClick={() => setVersionsOpen(true)}
          >
            <FileClock className="h-[15px] w-[15px]" />
            <span className="hidden xl:inline">{t("Versiones")}</span>
          </button>
          <button
            type="button"
            title={t("Validar flujo")}
            aria-label={t("Validar flujo")}
            disabled={!actionAvailability.canValidate}
            className="flex h-[36px] items-center gap-[7px] rounded-lg border border-border px-[10px] text-[12px] hover:bg-muted disabled:opacity-50"
            onClick={() => void validateEditorGraph()}
          >
            {validateDraft.isPending ? (
              <RefreshCw className="h-[15px] w-[15px] animate-spin" />
            ) : (
              <ShieldCheck className="h-[15px] w-[15px]" />
            )}
            <span className="hidden xl:inline">
              {validateDraft.isPending ? t("Validando…") : t("Validar")}
            </span>
          </button>
          <button
            type="button"
            title={t("Recargar borrador")}
            aria-label={t("Recargar borrador")}
            disabled={refreshing}
            className="flex h-[36px] items-center gap-[7px] rounded-lg border border-border px-[10px] text-[12px] hover:bg-muted disabled:opacity-50"
            onClick={() => requestProtectedAction("reload")}
          >
            <RefreshCw
              className={`h-[15px] w-[15px] ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{t("Recargar")}</span>
          </button>
          <button
            type="button"
            title={`${t("Guardar borrador")} (Ctrl/⌘ S)`}
            aria-label={t("Guardar borrador")}
            disabled={!actionAvailability.canSave}
            className="primary flex h-[36px] min-w-[96px] items-center justify-center gap-[7px] px-[12px] text-[12px] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => void saveEditorGraph()}
          >
            {saveDraft.isPending ? (
              <RefreshCw className="h-[15px] w-[15px] animate-spin" />
            ) : (
              <Save className="h-[15px] w-[15px]" />
            )}
            <span>{saveDraft.isPending ? t("Guardando…") : t("Guardar")}</span>
          </button>
          <button
            type="button"
            title={
              dirty
                ? t("Guardá los cambios antes de publicar")
                : t("Publicar flujo")
            }
            aria-label={t("Publicar flujo")}
            disabled={!actionAvailability.canPublish}
            className="primary flex h-[36px] min-w-[42px] items-center justify-center gap-[7px] px-[12px] text-[12px] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => setPublishDialogOpen(true)}
          >
            {publishDraft.isPending ? (
              <RefreshCw className="h-[15px] w-[15px] animate-spin" />
            ) : (
              <Rocket className="h-[15px] w-[15px]" />
            )}
            <span className="hidden sm:inline">{t("Publicar")}</span>
          </button>
          <button
            type="button"
            title={t("Activar chatbot")}
            aria-label={t("Activar chatbot")}
            className="flex h-[36px] min-w-[42px] items-center justify-center gap-[7px] rounded-lg border border-primary/45 px-[12px] text-[12px] text-primary hover:bg-primary/10"
            onClick={() => setDeploymentOpen(true)}
          >
            <RadioTower className="h-[15px] w-[15px]" />
            <span className="hidden xl:inline">
              {deploymentsQuery.data?.length
                ? `${t("Activo")} (${deploymentsQuery.data.length})`
                : t("Activar")}
            </span>
          </button>
        </div>
      </header>

      {(saveStatus === "error" || saveStatus === "conflict") && (
        <div
          role="alert"
          className="flex shrink-0 flex-wrap items-center gap-[8px] border-b border-destructive/30 bg-destructive/8 px-[14px] py-[8px] text-[11px] text-destructive md:px-[18px]"
        >
          <span className="min-w-0 flex-1">
            {saveStatus === "conflict"
              ? t(
                  "Otra persona guardó cambios en este borrador. Recargalo antes de continuar.",
                )
              : t(
                  "No se pudo guardar el borrador. Revisá tu conexión e intentá nuevamente.",
                )}
          </span>
          {saveStatus === "conflict" && (
            <button
              type="button"
              className="rounded-full border border-destructive/35 px-[10px] py-[5px] font-medium hover:bg-destructive/10"
              onClick={() => requestProtectedAction("reload")}
            >
              {t("Recargar borrador del servidor")}
            </button>
          )}
        </div>
      )}

      {validateDraft.isError && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-[8px] border-b border-destructive/30 bg-destructive/8 px-[14px] py-[8px] text-[11px] text-destructive md:px-[18px]"
        >
          <span className="min-w-0 flex-1">
            {t(
              "No se pudo validar el flujo. Revisá tu conexión e intentá nuevamente.",
            )}
          </span>
          <button
            type="button"
            className="rounded-full border border-destructive/35 px-[10px] py-[5px] font-medium hover:bg-destructive/10"
            onClick={() => void validateEditorGraph()}
          >
            {t("Reintentar")}
          </button>
        </div>
      )}

      {publishDraft.isError &&
        !(publishDraft.error instanceof ChatbotDraftConflictError) &&
        !(publishDraft.error instanceof ChatbotPublishValidationError) && (
          <div
            role="alert"
            className="shrink-0 border-b border-destructive/30 bg-destructive/8 px-[14px] py-[8px] text-[11px] text-destructive md:px-[18px]"
          >
            {t(
              "No se pudo publicar el flujo. Revisá tu conexión e intentá nuevamente.",
            )}
          </div>
        )}

      {lastPublishedVersion !== null && (
        <div className="flex shrink-0 items-center gap-[8px] border-b border-emerald-500/25 bg-emerald-500/8 px-[14px] py-[8px] text-[11px] text-emerald-600 dark:text-emerald-400 md:px-[18px]">
          <span className="min-w-0 flex-1">
            {t("La versión se publicó correctamente.")} v{lastPublishedVersion}.{" "}
            {t("Ya podés continuar editando el siguiente borrador.")}
          </span>
          <button
            type="button"
            title={t("Cerrar")}
            aria-label={t("Cerrar")}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-md hover:bg-emerald-500/10"
            onClick={onDismissPublished}
          >
            <X className="h-[13px] w-[13px]" />
          </button>
        </div>
      )}

      {validationSnapshot && (
        <div
          className={`flex shrink-0 flex-wrap items-center gap-[8px] border-b px-[14px] py-[7px] text-[11px] md:px-[18px] ${
            validationSnapshot.result.valid
              ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/25 bg-destructive/8 text-destructive"
          }`}
        >
          <span className="min-w-0 flex-1">
            {validationSnapshot.result.valid
              ? validationIsStale
                ? t("El flujo cambió después de la última validación.")
                : t("El flujo está validado y listo para publicar.")
              : t("El flujo tiene problemas que deben corregirse.")}
          </span>
          <button
            type="button"
            className="rounded-full border border-current/25 px-[10px] py-[4px] font-medium hover:bg-background/25"
            onClick={() => setValidationDialogOpen(true)}
          >
            {t("Ver resultado")}
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {mobilePanel && (
          <button
            type="button"
            aria-label={t("Cerrar panel")}
            className="absolute inset-0 z-20 bg-black/35 lg:hidden"
            onClick={() => setMobilePanel(null)}
          />
        )}

        <NodeLibrary
          open={mobilePanel === "library"}
          onClose={() => setMobilePanel(null)}
          onAddNode={addNode}
        />

        <main className="relative min-w-0 flex-1 bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={chatbotNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={(connection) =>
              isValidChatbotConnection(connection, nodes, edges)
            }
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={onDrop}
            onNodeClick={(_, node) => {
              setSimulatorOpen(false);
              setSelectedNodeId(node.id);
              setMobilePanel(null);
            }}
            onNodesDelete={(deletedNodes) => {
              if (deletedNodes.some((node) => node.id === selectedNodeId)) {
                setSelectedNodeId(null);
              }
            }}
            onPaneClick={() => setSelectedNodeId(null)}
            onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
            defaultViewport={graph.viewport}
            fitView={!graph.viewport && nodes.length > 0}
            minZoom={0.25}
            maxZoom={2}
            deleteKeyCode={null}
            colorMode={
              document.documentElement.classList.contains("dark")
                ? "dark"
                : "light"
            }
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.25}
              color="var(--border)"
            />
            <Controls position="bottom-left" />
            {nodes.length > 0 && (
              <MiniMap
                className="hidden md:block"
                position="bottom-right"
                pannable
                zoomable
                nodeColor="var(--primary)"
                maskColor="color-mix(in oklch, var(--background) 78%, transparent)"
              />
            )}
          </ReactFlow>

          {nodes.length === 1 &&
            nodes[0]?.data.node_type === "start" &&
            edges.length === 0 && (
              <div className="pointer-events-none absolute left-1/2 top-[18px] -translate-x-1/2 px-[16px]">
                <div className="w-[min(380px,calc(100vw-48px))] rounded-xl border border-dashed border-border bg-background/90 p-[16px] text-center shadow-sm backdrop-blur">
                  <div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MousePointer2 className="h-[20px] w-[20px]" />
                  </div>
                  <h2 className="mt-[13px] text-[15px] font-semibold">
                    {t("Agregá tu primer paso")}
                  </h2>
                  <p className="mt-[5px] text-[12px] leading-relaxed text-muted-foreground">
                    {t(
                      "Arrastrá un nodo desde la biblioteca y conectalo con Inicio.",
                    )}
                  </p>
                </div>
              </div>
            )}
        </main>

        {simulatorOpen ? (
          <ChatbotFlowSimulator
            session={simulationSession}
            pending={simulateFlow.isPending}
            error={simulateFlow.isError}
            onSend={(text) => void runSimulation(simulationSession, text)}
            onReset={startSimulation}
            onClose={() => setSimulatorOpen(false)}
          />
        ) : (
          <NodeInspector
            node={selectedNode}
            open={mobilePanel === "inspector"}
            onClose={() => setMobilePanel(null)}
            onMessageTextChange={updateMessageText}
            onCollectInputChange={updateCollectInput}
            availableVariables={availableVariables}
            onConditionVariableChange={updateConditionVariable}
            onConditionBranchAdd={addConditionBranch}
            onConditionBranchChange={updateConditionBranch}
            onConditionBranchRemove={removeConditionBranch}
            onDuplicate={duplicateNode}
            onDelete={deleteNode}
          />
        )}
      </div>
      <UnsavedChangesDialog
        action={
          pendingProtectedAction ??
          (navigationBlocker.status === "blocked" ? "back" : null)
        }
        onClose={() => {
          setPendingProtectedAction(null);
          if (navigationBlocker.status === "blocked") {
            navigationBlocker.reset();
          }
        }}
        onConfirm={(action) => void runProtectedAction(action)}
      />
      <ValidationResultsDialog
        result={validationDialogOpen ? validationResult : null}
        stale={validationIsStale}
        onClose={() => setValidationDialogOpen(false)}
        onFocusNode={focusValidationNode}
      />
      <PublishChatbotDialog
        open={publishDialogOpen}
        draftVersion={editor.draft.version}
        pending={publishDraft.isPending}
        onClose={() => setPublishDialogOpen(false)}
        onConfirm={() => void publishEditorDraft()}
      />
      <VersionHistoryPanel
        open={versionsOpen}
        versions={versionsQuery.data ?? []}
        loading={versionsQuery.isLoading}
        error={versionsQuery.isError}
        onClose={() => setVersionsOpen(false)}
        onRetry={() => void versionsQuery.refetch()}
        onPreview={(version) => setPreviewVersion(version)}
      />
      <VersionPreviewDialog
        version={previewVersion}
        onClose={() => setPreviewVersion(null)}
      />
      <ChatbotFlowDeploymentDialog
        open={deploymentOpen}
        deployments={deploymentsQuery.data ?? []}
        versions={versionsQuery.data ?? []}
        addresses={connectedWhatsAppAddresses}
        agents={activeAiAgents}
        loading={
          deploymentsQuery.isLoading ||
          versionsQuery.isLoading ||
          addressesQuery.isLoading ||
          agentsQuery.isLoading
        }
        error={
          deploymentsQuery.isError ||
          versionsQuery.isError ||
          addressesQuery.isError ||
          agentsQuery.isError
        }
        actionError={activateFlow.isError || deactivateFlow.isError}
        pending={activateFlow.isPending || deactivateFlow.isPending}
        onClose={() => {
          activateFlow.reset();
          deactivateFlow.reset();
          setDeploymentOpen(false);
        }}
        onRetry={() => {
          void Promise.all([
            deploymentsQuery.refetch(),
            versionsQuery.refetch(),
            addressesQuery.refetch(),
            agentsQuery.refetch(),
          ]);
        }}
        onActivate={(input) =>
          activateFlow.mutate({
            flowId: editor.flow.id,
            ...input,
          })
        }
        onDeactivate={(organizationAddress) =>
          deactivateFlow.mutate({
            flowId: editor.flow.id,
            organizationAddress,
          })
        }
      />
    </div>
  );
}

function NodeLibrary({
  open,
  onClose,
  onAddNode,
}: {
  open: boolean;
  onClose: () => void;
  onAddNode: (type: ChatbotCoreNodeType) => void;
}) {
  const { translate: t } = useTranslation();
  const items = [
    {
      type: "start" as const,
      label: t("Inicio"),
      description: t("Punto de entrada único"),
      icon: Play,
      locked: true,
    },
    {
      type: "send_message" as const,
      label: t("Enviar mensaje"),
      description: t("Envía un mensaje de texto"),
      icon: MessageSquareText,
      locked: false,
    },
    {
      type: "collect_input" as const,
      label: t("Recopilar respuesta"),
      description: t("Pregunta y guarda una variable"),
      icon: TextCursorInput,
      locked: false,
    },
    {
      type: "condition" as const,
      label: t("Condición"),
      description: t("Divide el flujo según una variable"),
      icon: GitBranch,
      locked: false,
    },
    {
      type: "end" as const,
      label: t("Fin"),
      description: t("Finaliza la conversación"),
      icon: CircleStop,
      locked: false,
    },
  ];

  return (
    <aside
      className={`absolute inset-y-0 left-0 z-30 flex w-[260px] shrink-0 flex-col border-r border-border bg-card shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-start gap-[8px] border-b border-border p-[15px]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[7px] text-[13px] font-semibold">
            <Boxes className="h-[16px] w-[16px] text-primary" />
            {t("Biblioteca de nodos")}
          </div>
          <p className="mt-[4px] text-[11px] leading-relaxed text-muted-foreground">
            {t("Arrastrá un nodo al lienzo o hacé clic para agregarlo.")}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("Cerrar panel")}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-md hover:bg-muted lg:hidden"
          onClick={onClose}
        >
          <X className="h-[15px] w-[15px]" />
        </button>
      </div>
      <div className="space-y-[8px] overflow-y-auto p-[10px]">
        {items.map((item) => (
          <button
            type="button"
            key={item.type}
            draggable={!item.locked}
            disabled={item.locked}
            onDragStart={(event) => {
              event.dataTransfer.setData(CHATBOT_NODE_DRAG_TYPE, item.type);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onAddNode(item.type)}
            className="flex w-full items-center gap-[10px] rounded-lg border border-border bg-background/45 p-[10px] text-left transition hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-65"
          >
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <item.icon className="h-[16px] w-[16px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium">{item.label}</div>
              <div className="mt-[1px] text-[10px] text-muted-foreground">
                {item.description}
              </div>
            </div>
            {item.locked ? (
              <LockKeyhole className="h-[13px] w-[13px] text-muted-foreground" />
            ) : (
              <GripVertical className="h-[14px] w-[14px] text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-auto space-y-[9px] border-t border-border p-[12px] text-[10px] leading-relaxed text-muted-foreground">
        <div className="flex gap-[7px]">
          <Info className="mt-[1px] h-[13px] w-[13px] shrink-0 text-primary" />
          {t(
            "Inicio es único y está protegido. Guardá el borrador para conservar los cambios.",
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[5px] border-t border-border/70 pt-[9px]">
          <span>
            <kbd className="rounded border border-border bg-muted px-[4px] py-[1px] font-mono">
              Ctrl/⌘ S
            </kbd>{" "}
            {t("Guardar")}
          </span>
          <span>
            <kbd className="rounded border border-border bg-muted px-[4px] py-[1px] font-mono">
              Del
            </kbd>{" "}
            {t("Eliminar")}
          </span>
          <span>
            <kbd className="rounded border border-border bg-muted px-[4px] py-[1px] font-mono">
              Esc
            </kbd>{" "}
            {t("Cerrar")}
          </span>
        </div>
      </div>
    </aside>
  );
}

function NodeInspector({
  node,
  open,
  onClose,
  onMessageTextChange,
  onCollectInputChange,
  availableVariables,
  onConditionVariableChange,
  onConditionBranchAdd,
  onConditionBranchChange,
  onConditionBranchRemove,
  onDuplicate,
  onDelete,
}: {
  node: ChatbotFlowNodeType | null;
  open: boolean;
  onClose: () => void;
  onMessageTextChange: (nodeId: string, text: string) => void;
  onCollectInputChange: (
    nodeId: string,
    updates: Record<string, unknown>,
  ) => void;
  availableVariables: string[];
  onConditionVariableChange: (nodeId: string, variable: string) => void;
  onConditionBranchAdd: (nodeId: string) => void;
  onConditionBranchChange: (
    nodeId: string,
    branchId: string,
    updates: { operator?: ChatbotConditionOperator; value?: string },
  ) => void;
  onConditionBranchRemove: (nodeId: string, branchId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}) {
  const { translate: t } = useTranslation();
  const nodeType = node?.data.node_type ?? t("Nodo");
  const isStart = nodeType === "start";
  const isMessage = nodeType === "send_message";
  const isCollectInput = nodeType === "collect_input";
  const isCondition = nodeType === "condition";
  const messageText =
    isMessage && typeof node?.data.config.text === "string"
      ? node.data.config.text
      : "";
  const messageIsEmpty = isMessage && !messageText.trim();

  return (
    <aside
      className={`absolute inset-y-0 right-0 z-30 flex w-[290px] shrink-0 flex-col border-l border-border bg-card shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center gap-[8px] border-b border-border p-[15px]">
        <PanelRight className="h-[16px] w-[16px] text-primary" />
        <div className="flex-1 text-[13px] font-semibold">{t("Inspector")}</div>
        <button
          type="button"
          aria-label={t("Cerrar panel")}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-md hover:bg-muted lg:hidden"
          onClick={onClose}
        >
          <X className="h-[15px] w-[15px]" />
        </button>
      </div>
      {node ? (
        <div className="flex-1 space-y-[14px] overflow-y-auto p-[15px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("Nodo seleccionado")}
            </div>
            <div className="mt-[5px] truncate text-[13px] font-medium">
              {typeof node.data.label === "string"
                ? t(node.data.label)
                : node.id}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-[8px] rounded-lg border border-border bg-background/45 p-[10px] text-[11px]">
            <div>
              <dt className="text-muted-foreground">{t("Tipo")}</dt>
              <dd className="mt-[2px] truncate font-medium">{nodeType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("Posición")}</dt>
              <dd className="mt-[2px] font-medium">
                {Math.round(node.position.x)}, {Math.round(node.position.y)}
              </dd>
            </div>
          </dl>
          {isMessage ? (
            <label className="block">
              <span className="text-[11px] font-medium">
                {t("Texto del mensaje")}
              </span>
              <textarea
                value={messageText}
                maxLength={CHATBOT_MESSAGE_MAX_LENGTH}
                rows={7}
                aria-invalid={messageIsEmpty}
                onChange={(event) =>
                  onMessageTextChange(node.id, event.target.value)
                }
                placeholder={t("Escribí el mensaje que recibirá el contacto")}
                className={`mt-[6px] w-full resize-y rounded-lg border bg-background px-[10px] py-[9px] text-[12px] leading-relaxed outline-none transition focus:ring-2 focus:ring-primary/20 ${
                  messageIsEmpty
                    ? "border-destructive"
                    : "border-border focus:border-primary"
                }`}
              />
              <span className="mt-[4px] flex justify-between gap-[8px] text-[10px]">
                <span
                  className={
                    messageIsEmpty
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {messageIsEmpty
                    ? t("El mensaje es obligatorio")
                    : t("Mensaje listo")}
                </span>
                <span className="text-muted-foreground">
                  {messageText.length}/{CHATBOT_MESSAGE_MAX_LENGTH}
                </span>
              </span>
            </label>
          ) : isCollectInput ? (
            <CollectInputInspector
              node={node}
              onChange={(updates) => onCollectInputChange(node.id, updates)}
            />
          ) : isCondition ? (
            <ConditionInspector
              node={node}
              availableVariables={availableVariables}
              onVariableChange={(variable) =>
                onConditionVariableChange(node.id, variable)
              }
              onBranchAdd={() => onConditionBranchAdd(node.id)}
              onBranchChange={(branchId, updates) =>
                onConditionBranchChange(node.id, branchId, updates)
              }
              onBranchRemove={(branchId) =>
                onConditionBranchRemove(node.id, branchId)
              }
            />
          ) : (
            <p className="rounded-lg bg-muted/45 p-[10px] text-[11px] leading-relaxed text-muted-foreground">
              {isStart
                ? t(
                    "Inicio recibe la conversación y debe conectarse con un único paso siguiente.",
                  )
                : t(
                    "Fin completa la conversación y no permite conexiones salientes.",
                  )}
            </p>
          )}
          {!isStart && (
            <div className="grid grid-cols-2 gap-[8px] border-t border-border pt-[14px]">
              <button
                type="button"
                className="flex items-center justify-center gap-[6px] rounded-lg border border-border px-[9px] py-[8px] text-[11px] font-medium hover:bg-muted"
                onClick={() => onDuplicate(node.id)}
              >
                <Copy className="h-[13px] w-[13px]" />
                {t("Duplicar")}
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-[6px] rounded-lg border border-destructive/35 px-[9px] py-[8px] text-[11px] font-medium text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(node.id)}
              >
                <Trash2 className="h-[13px] w-[13px]" />
                {t("Eliminar")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-[24px] text-center">
          <MousePointer2 className="h-[24px] w-[24px] text-muted-foreground" />
          <div className="mt-[10px] text-[12px] font-medium">
            {t("Seleccioná un nodo")}
          </div>
          <p className="mt-[4px] text-[11px] leading-relaxed text-muted-foreground">
            {t("Sus datos básicos aparecerán en este panel.")}
          </p>
        </div>
      )}
    </aside>
  );
}

function CollectInputInspector({
  node,
  onChange,
}: {
  node: ChatbotFlowNodeType;
  onChange: (updates: Record<string, unknown>) => void;
}) {
  const { translate: t } = useTranslation();
  const prompt =
    typeof node.data.config.prompt === "string" ? node.data.config.prompt : "";
  const variable =
    typeof node.data.config.variable === "string"
      ? node.data.config.variable
      : "";
  const required = node.data.config.required !== false;
  const minLength =
    typeof node.data.config.min_length === "number"
      ? node.data.config.min_length
      : undefined;
  const maxLength =
    typeof node.data.config.max_length === "number"
      ? node.data.config.max_length
      : undefined;
  const variableIsValid = /^[a-z][a-z0-9_]*$/.test(variable);
  const lengthsAreValid =
    minLength === undefined ||
    maxLength === undefined ||
    minLength <= maxLength;

  return (
    <div className="space-y-[13px]">
      <label className="block">
        <span className="text-[11px] font-medium">{t("Pregunta")}</span>
        <textarea
          value={prompt}
          maxLength={CHATBOT_MESSAGE_MAX_LENGTH}
          rows={4}
          aria-invalid={!prompt.trim()}
          onChange={(event) => onChange({ prompt: event.target.value })}
          placeholder={t("Escribí la pregunta que recibirá el contacto")}
          className={`mt-[6px] w-full resize-y rounded-lg border bg-background px-[10px] py-[9px] text-[12px] outline-none focus:ring-2 focus:ring-primary/20 ${
            prompt.trim() ? "border-border" : "border-destructive"
          }`}
        />
        {!prompt.trim() && (
          <span className="mt-[4px] block text-[10px] text-destructive">
            {t("La pregunta es obligatoria")}
          </span>
        )}
      </label>

      <label className="block">
        <span className="flex items-center gap-[5px] text-[11px] font-medium">
          <Braces className="h-[12px] w-[12px] text-amber-500" />
          {t("Guardar en variable")}
        </span>
        <input
          value={variable}
          maxLength={64}
          aria-invalid={!variableIsValid}
          onChange={(event) => onChange({ variable: event.target.value })}
          placeholder="customer_name"
          className={`mt-[6px] h-[36px] w-full rounded-lg border bg-background px-[10px] font-mono text-[12px] outline-none focus:ring-2 focus:ring-primary/20 ${
            variableIsValid ? "border-border" : "border-destructive"
          }`}
        />
        {!variableIsValid && (
          <span className="mt-[4px] block text-[10px] leading-relaxed text-destructive">
            {t(
              "Usá minúsculas, números y guiones bajos; comenzá con una letra.",
            )}
          </span>
        )}
      </label>

      <label className="flex items-center justify-between gap-[12px] rounded-lg border border-border bg-background/45 p-[10px]">
        <span>
          <span className="block text-[11px] font-medium">
            {t("Respuesta obligatoria")}
          </span>
          <span className="mt-[2px] block text-[10px] text-muted-foreground">
            {t("El flujo espera una respuesta no vacía.")}
          </span>
        </span>
        <input
          type="checkbox"
          checked={required}
          onChange={(event) => onChange({ required: event.target.checked })}
          className="h-[16px] w-[16px] accent-primary"
        />
      </label>

      <div>
        <div className="text-[11px] font-medium">
          {t("Longitud de respuesta")}
        </div>
        <div className="mt-[6px] grid grid-cols-2 gap-[8px]">
          <label>
            <span className="text-[10px] text-muted-foreground">
              {t("Mínima")}
            </span>
            <input
              type="number"
              min={0}
              max={CHATBOT_INPUT_MAX_LENGTH}
              value={minLength ?? ""}
              onChange={(event) =>
                onChange({
                  min_length:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              className="mt-[4px] h-[34px] w-full rounded-lg border border-border bg-background px-[9px] text-[11px]"
            />
          </label>
          <label>
            <span className="text-[10px] text-muted-foreground">
              {t("Máxima")}
            </span>
            <input
              type="number"
              min={0}
              max={CHATBOT_INPUT_MAX_LENGTH}
              value={maxLength ?? ""}
              onChange={(event) =>
                onChange({
                  max_length:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              className="mt-[4px] h-[34px] w-full rounded-lg border border-border bg-background px-[9px] text-[11px]"
            />
          </label>
        </div>
        {!lengthsAreValid && (
          <span className="mt-[5px] block text-[10px] text-destructive">
            {t("La longitud máxima debe ser mayor o igual que la mínima.")}
          </span>
        )}
      </div>
    </div>
  );
}

function ConditionInspector({
  node,
  availableVariables,
  onVariableChange,
  onBranchAdd,
  onBranchChange,
  onBranchRemove,
}: {
  node: ChatbotFlowNodeType;
  availableVariables: string[];
  onVariableChange: (variable: string) => void;
  onBranchAdd: () => void;
  onBranchChange: (
    branchId: string,
    updates: { operator?: ChatbotConditionOperator; value?: string },
  ) => void;
  onBranchRemove: (branchId: string) => void;
}) {
  const { translate: t } = useTranslation();
  const variable =
    typeof node.data.config.variable === "string"
      ? node.data.config.variable
      : "";
  const variableIsAvailable = availableVariables.includes(variable);
  const branches = node.data.branches ?? [];

  return (
    <div className="space-y-[14px]">
      <label className="block">
        <span className="text-[11px] font-medium">
          {t("Variable a evaluar")}
        </span>
        <select
          value={variableIsAvailable ? variable : ""}
          onChange={(event) => onVariableChange(event.target.value)}
          className={`mt-[6px] h-[36px] w-full rounded-lg border bg-background px-[9px] text-[11px] ${
            variableIsAvailable ? "border-border" : "border-destructive"
          }`}
        >
          <option value="">
            {availableVariables.length > 0
              ? t("Seleccioná una variable")
              : t("Conectá primero un nodo Recopilar respuesta")}
          </option>
          {availableVariables.map((availableVariable) => (
            <option key={availableVariable} value={availableVariable}>
              {availableVariable}
            </option>
          ))}
        </select>
        {!variableIsAvailable && (
          <span className="mt-[4px] block text-[10px] leading-relaxed text-destructive">
            {t(
              "La condición solo puede usar variables recopiladas en todos los caminos anteriores.",
            )}
          </span>
        )}
      </label>

      <div>
        <div className="flex items-center justify-between gap-[8px]">
          <div>
            <div className="text-[11px] font-medium">
              {t("Ramas condicionales")}
            </div>
            <div className="mt-[2px] text-[10px] text-muted-foreground">
              {t("Conectá cada salida desde su punto en el nodo.")}
            </div>
          </div>
          <button
            type="button"
            title={t("Agregar rama")}
            aria-label={t("Agregar rama")}
            onClick={onBranchAdd}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <Plus className="h-[13px] w-[13px]" />
          </button>
        </div>

        <div className="mt-[8px] space-y-[8px]">
          {branches.map((branch, index) => (
            <div
              key={branch.id}
              className="rounded-lg border border-border bg-background/45 p-[9px]"
            >
              <div className="flex items-center justify-between gap-[8px]">
                <span className="text-[10px] font-semibold text-orange-500">
                  {t("Rama")} {index + 1}
                </span>
                <button
                  type="button"
                  disabled={branches.length <= 1}
                  title={t("Eliminar rama")}
                  aria-label={`${t("Eliminar rama")} ${index + 1}`}
                  onClick={() => onBranchRemove(branch.id)}
                  className="flex h-[24px] w-[24px] items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:opacity-30"
                >
                  <Trash2 className="h-[12px] w-[12px]" />
                </button>
              </div>
              <select
                value={branch.operator}
                onChange={(event) =>
                  onBranchChange(branch.id, {
                    operator: event.target.value as ChatbotConditionOperator,
                  })
                }
                className="mt-[6px] h-[34px] w-full rounded-lg border border-border bg-background px-[8px] text-[11px]"
              >
                {chatbotConditionOperators.map((operator) => (
                  <option key={operator} value={operator}>
                    {getConditionOperatorLabel(operator, t)}
                  </option>
                ))}
              </select>
              <input
                value={branch.value}
                onChange={(event) =>
                  onBranchChange(branch.id, { value: event.target.value })
                }
                placeholder={t("Valor de comparación")}
                className="mt-[6px] h-[34px] w-full rounded-lg border border-border bg-background px-[8px] text-[11px]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/35 p-[10px]">
        <div className="text-[10px] font-semibold">{t("Fallback")}</div>
        <div className="mt-[3px] text-[10px] leading-relaxed text-muted-foreground">
          {t("Esta salida se usa cuando ninguna rama condicional coincide.")}
        </div>
      </div>
    </div>
  );
}

function getConditionOperatorLabel(
  operator: ChatbotConditionOperator,
  t: (value: string) => string,
) {
  if (operator === "equals") return t("Igual a");
  if (operator === "not_equals") return t("Distinto de");
  if (operator === "contains") return t("Contiene");
  if (operator === "starts_with") return t("Comienza con");
  return t("Termina con");
}

function SaveStatusLabel({
  status,
}: {
  status: ReturnType<typeof getChatbotDraftSaveStatus>;
}) {
  const { translate: t } = useTranslation();
  const label =
    status === "saving"
      ? t("Guardando…")
      : status === "conflict"
        ? t("Conflicto de edición")
        : status === "error"
          ? t("Error al guardar")
          : status === "dirty"
            ? t("Cambios sin guardar")
            : t("Guardado");

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={
        status === "saved"
          ? "text-emerald-500"
          : status === "dirty"
            ? "text-amber-500"
            : status === "saving"
              ? "text-primary"
              : "text-destructive"
      }
    >
      {label}
    </span>
  );
}

function UnsavedChangesDialog({
  action,
  onClose,
  onConfirm,
}: {
  action: "back" | "reload" | null;
  onClose: () => void;
  onConfirm: (action: "back" | "reload") => void;
}) {
  const { translate: t } = useTranslation();
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-[16px] backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-unsaved-dialog-title"
        className="w-full max-w-[440px] rounded-2xl border border-border bg-popover p-[20px] text-popover-foreground shadow-2xl"
      >
        <h2 id="chatbot-unsaved-dialog-title" className="font-semibold">
          {action === "back"
            ? t("¿Salir sin guardar?")
            : t("¿Descartar cambios locales?")}
        </h2>
        <p className="mt-[6px] text-[13px] leading-relaxed text-muted-foreground">
          {action === "back"
            ? t("Los cambios sin guardar se perderán si salís del editor.")
            : t(
                "Se reemplazará el lienzo actual con el último borrador guardado en el servidor.",
              )}
        </p>
        <div className="mt-[20px] flex justify-end gap-[8px]">
          <button
            type="button"
            className="rounded-full border border-border px-[16px] py-[8px] text-[13px] hover:bg-muted"
            onClick={onClose}
          >
            {t("Seguir editando")}
          </button>
          <button
            type="button"
            className="destructive px-[16px] py-[8px] text-[13px]"
            onClick={() => onConfirm(action)}
          >
            {action === "back"
              ? t("Salir sin guardar")
              : t("Descartar y recargar")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[12px] bg-background text-foreground">
      <Spinner />
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  );
}

function EditorState({
  title,
  description,
  actionLabel,
  secondaryLabel,
  onAction,
  onSecondary,
}: {
  title: string;
  description: string;
  actionLabel: string;
  secondaryLabel?: string;
  onAction: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-background p-[24px] text-foreground">
      <div className="max-w-[430px] rounded-xl border border-border bg-card p-[24px] text-center">
        <div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Info className="h-[20px] w-[20px]" />
        </div>
        <h1 className="mt-[13px] text-[17px] font-semibold">{title}</h1>
        <p className="mt-[6px] text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-[18px] flex flex-col justify-center gap-[8px] sm:flex-row">
          <button
            type="button"
            className="primary px-[18px] py-[9px] text-[13px]"
            onClick={onAction}
          >
            {actionLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              className="rounded-full border border-border px-[18px] py-[9px] text-[13px] hover:bg-muted"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
