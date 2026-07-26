import { useCallback, useState, type DragEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Boxes,
  CircleStop,
  Info,
  MessageSquareText,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Play,
  RefreshCw,
  Copy,
  GripVertical,
  LockKeyhole,
  Trash2,
  X,
} from "lucide-react";
import ChatbotFlowNode from "@/components/chatbots/ChatbotFlowNode";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  type ChatbotFlowEditorData,
  useChatbotFlowDraft,
} from "@/queries/useChatbotFlows";
import {
  CHATBOT_MESSAGE_MAX_LENGTH,
  createChatbotNode,
  duplicateChatbotNode,
  ensureChatbotStartNode,
  isValidChatbotConnection,
  normalizeChatbotEditorGraph,
  removeChatbotNode,
  type ChatbotCoreNodeType,
  type ChatbotEditorGraph,
  type ChatbotFlowNode as ChatbotFlowNodeType,
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
  const { data: currentAgent, isLoading: agentLoading } = useCurrentAgent();
  const canManage =
    currentAgent?.extra?.role === "owner" ||
    currentAgent?.extra?.role === "admin";
  const draftQuery = useChatbotFlowDraft(flowId, canManage);

  const goBack = () => navigate({ to: "/chatbots" });

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
        key={`${draftQuery.data.draft.id}:${draftQuery.data.draft.updated_at}`}
        editor={draftQuery.data}
        graph={normalizeChatbotEditorGraph(draftQuery.data.draft.editor_graph)}
        onBack={() => void goBack()}
        onRefresh={() => void draftQuery.refetch()}
        refreshing={draftQuery.isFetching}
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
}: {
  editor: ChatbotFlowEditorData;
  graph: ChatbotEditorGraph;
  onBack: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { translate: t } = useTranslation();
  const initialGraph = ensureChatbotStartNode(graph);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;

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

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            id: `edge-${crypto.randomUUID()}`,
            type: "smoothstep",
            data: { kind: "default" },
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
      if (type !== "send_message" && type !== "end") return;

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-[10px] border-b border-border px-[12px] py-[10px] md:px-[18px]">
        <button
          type="button"
          title={t("Volver a chatbots")}
          aria-label={t("Volver a chatbots")}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border hover:bg-muted"
          onClick={onBack}
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
            <span>{t("Estructura local")}</span>
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
            title={t("Recargar borrador")}
            aria-label={t("Recargar borrador")}
            disabled={refreshing}
            className="flex h-[36px] items-center gap-[7px] rounded-lg border border-border px-[10px] text-[12px] hover:bg-muted disabled:opacity-50"
            onClick={onRefresh}
          >
            <RefreshCw
              className={`h-[15px] w-[15px] ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{t("Recargar")}</span>
          </button>
        </div>
      </header>

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
              setSelectedNodeId(node.id);
              setMobilePanel(null);
            }}
            onNodesDelete={(deletedNodes) => {
              if (deletedNodes.some((node) => node.id === selectedNodeId)) {
                setSelectedNodeId(null);
              }
            }}
            onPaneClick={() => setSelectedNodeId(null)}
            defaultViewport={graph.viewport}
            fitView={!graph.viewport && nodes.length > 0}
            minZoom={0.25}
            maxZoom={2}
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
                      "Arrastrá Enviar mensaje o Fin desde la biblioteca y conectalo con Inicio.",
                    )}
                  </p>
                </div>
              </div>
            )}
        </main>

        <NodeInspector
          node={selectedNode}
          open={mobilePanel === "inspector"}
          onClose={() => setMobilePanel(null)}
          onMessageTextChange={updateMessageText}
          onDuplicate={duplicateNode}
          onDelete={deleteNode}
        />
      </div>
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
      <div className="mt-auto flex gap-[7px] border-t border-border p-[12px] text-[10px] leading-relaxed text-muted-foreground">
        <Info className="mt-[1px] h-[13px] w-[13px] shrink-0 text-primary" />
        {t(
          "Inicio es único y está protegido. Los cambios permanecen locales hasta habilitar el guardado.",
        )}
      </div>
    </aside>
  );
}

function NodeInspector({
  node,
  open,
  onClose,
  onMessageTextChange,
  onDuplicate,
  onDelete,
}: {
  node: ChatbotFlowNodeType | null;
  open: boolean;
  onClose: () => void;
  onMessageTextChange: (nodeId: string, text: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}) {
  const { translate: t } = useTranslation();
  const nodeType = node?.data.node_type ?? t("Nodo");
  const isStart = nodeType === "start";
  const isMessage = nodeType === "send_message";
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
        <div className="space-y-[14px] p-[15px]">
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
