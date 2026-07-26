import { useState } from "react";
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
  type Connection,
  type Node,
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
  X,
} from "lucide-react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  type ChatbotFlowEditorData,
  useChatbotFlowDraft,
} from "@/queries/useChatbotFlows";
import {
  normalizeChatbotEditorGraph,
  type ChatbotEditorGraph,
} from "@/utils/ChatbotFlowUtils";

export const Route = createFileRoute("/_auth/chatbots/$flowId")({
  component: ChatbotFlowEditor,
});

type MobilePanel = "library" | "inspector" | null;

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
  const [nodes, , onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;

  const onConnect = (connection: Connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  };

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
        />

        <main className="relative min-w-0 flex-1 bg-muted/20">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setMobilePanel(null);
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

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-[24px]">
              <div className="max-w-[380px] rounded-xl border border-dashed border-border bg-background/90 p-[22px] text-center shadow-sm backdrop-blur">
                <div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MousePointer2 className="h-[20px] w-[20px]" />
                </div>
                <h2 className="mt-[13px] text-[15px] font-semibold">
                  {t("Canvas listo")}
                </h2>
                <p className="mt-[5px] text-[12px] leading-relaxed text-muted-foreground">
                  {t(
                    "La biblioteca y el lienzo están preparados. Los primeros nodos se habilitarán en el próximo paso.",
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
        />
      </div>
    </div>
  );
}

function NodeLibrary({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const items = [
    { type: "START", label: t("Inicio"), icon: Play },
    { type: "MESSAGE", label: t("Enviar mensaje"), icon: MessageSquareText },
    { type: "END", label: t("Fin"), icon: CircleStop },
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
            {t("Los nodos se habilitarán en el próximo paso.")}
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
          <div
            key={item.type}
            aria-disabled="true"
            className="flex items-center gap-[10px] rounded-lg border border-border bg-background/45 p-[10px] opacity-75"
          >
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <item.icon className="h-[16px] w-[16px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium">{item.label}</div>
              <div className="mt-[1px] text-[10px] text-muted-foreground">
                {t("Próximamente")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto flex gap-[7px] border-t border-border p-[12px] text-[10px] leading-relaxed text-muted-foreground">
        <Info className="mt-[1px] h-[13px] w-[13px] shrink-0 text-primary" />
        {t(
          "Esta etapa prepara el espacio de trabajo sin adelantar la configuración de nodos.",
        )}
      </div>
    </aside>
  );
}

function NodeInspector({
  node,
  open,
  onClose,
}: {
  node: Node | null;
  open: boolean;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const nodeType =
    node && typeof node.data.nodeType === "string"
      ? node.data.nodeType
      : t("Nodo");

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
              {typeof node.data.label === "string" ? node.data.label : node.id}
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
          <p className="rounded-lg bg-muted/45 p-[10px] text-[11px] leading-relaxed text-muted-foreground">
            {t(
              "La configuración de este nodo se habilitará en su ticket de implementación.",
            )}
          </p>
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
