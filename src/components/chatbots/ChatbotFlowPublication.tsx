import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "@xyflow/react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  FileClock,
  RefreshCw,
  Rocket,
  X,
} from "lucide-react";
import ChatbotFlowNode from "@/components/chatbots/ChatbotFlowNode";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import type { ChatbotFlowVersion } from "@/queries/useChatbotFlows";
import {
  type ChatbotFlowValidationResult,
  normalizeChatbotEditorGraph,
} from "@/utils/ChatbotFlowUtils";

const chatbotNodeTypes: NodeTypes = { chatbotNode: ChatbotFlowNode };

export function ValidationResultsDialog({
  result,
  stale,
  onClose,
  onFocusNode,
}: {
  result: ChatbotFlowValidationResult | null;
  stale: boolean;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}) {
  const { translate: t } = useTranslation();
  if (!result) return null;

  return (
    <DialogShell
      labelledBy="chatbot-validation-title"
      maxWidth="max-w-[620px]"
      onClose={onClose}
    >
      <div className="flex items-start gap-[12px]">
        <div
          className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl ${
            result.valid
              ? "bg-emerald-500/12 text-emerald-500"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {result.valid ? (
            <CheckCircle2 className="h-[20px] w-[20px]" />
          ) : (
            <CircleAlert className="h-[20px] w-[20px]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="chatbot-validation-title" className="font-semibold">
            {result.valid
              ? t("El flujo es válido")
              : t("El flujo necesita correcciones")}
          </h2>
          <p className="mt-[4px] text-[12px] leading-relaxed text-muted-foreground">
            {result.valid
              ? t("La estructura actual está lista para publicarse.")
              : t(
                  "Corregí los problemas indicados y volvé a validar antes de publicar.",
                )}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      {stale && (
        <div className="mt-[14px] rounded-lg border border-amber-500/30 bg-amber-500/8 px-[11px] py-[9px] text-[11px] text-amber-600 dark:text-amber-400">
          {t(
            "El lienzo cambió después de esta validación. Validalo nuevamente para actualizar el resultado.",
          )}
        </div>
      )}

      {!result.valid && (
        <div className="mt-[16px] max-h-[48vh] space-y-[8px] overflow-y-auto pr-[3px]">
          {result.issues.map((issue, index) => (
            <button
              type="button"
              key={`${issue.code}:${issue.node_id ?? issue.edge_id ?? index}`}
              disabled={!issue.node_id}
              onClick={() => {
                if (!issue.node_id) return;
                onFocusNode(issue.node_id);
                onClose();
              }}
              className="block w-full rounded-xl border border-border bg-background/55 p-[12px] text-left transition hover:border-primary/45 hover:bg-muted/40 disabled:cursor-default disabled:hover:border-border disabled:hover:bg-background/55"
            >
              <div className="flex items-center justify-between gap-[12px]">
                <span className="text-[11px] font-semibold text-destructive">
                  {t("Problema")} {index + 1}
                </span>
                {issue.node_id && (
                  <span className="text-[10px] font-medium text-primary">
                    {t("Ir al nodo")}
                  </span>
                )}
              </div>
              <div className="mt-[4px] text-[12px] leading-relaxed">
                {issue.message}
              </div>
              <div className="mt-[5px] truncate font-mono text-[10px] text-muted-foreground">
                {issue.node_id
                  ? `${t("Nodo")}: ${issue.node_id}`
                  : issue.edge_id
                    ? `${t("Conexión")}: ${issue.edge_id}`
                    : issue.path.join(".")}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-[18px] flex justify-end">
        <button
          type="button"
          className="primary px-[16px] py-[8px] text-[12px]"
          onClick={onClose}
        >
          {t("Cerrar")}
        </button>
      </div>
    </DialogShell>
  );
}

export function PublishChatbotDialog({
  open,
  draftVersion,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  draftVersion: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { translate: t } = useTranslation();
  if (!open) return null;

  return (
    <DialogShell
      labelledBy="chatbot-publish-title"
      maxWidth="max-w-[460px]"
      onClose={pending ? undefined : onClose}
    >
      <div className="flex items-start gap-[12px]">
        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Rocket className="h-[20px] w-[20px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="chatbot-publish-title" className="font-semibold">
            {t("¿Publicar esta versión?")}
          </h2>
          <p className="mt-[5px] text-[12px] leading-relaxed text-muted-foreground">
            {t(
              "El borrador guardado se convertirá en una versión inmutable y se creará el siguiente borrador editable.",
            )}
          </p>
        </div>
        {!pending && <CloseButton onClick={onClose} />}
      </div>
      <div className="mt-[15px] rounded-lg border border-border bg-muted/35 px-[12px] py-[10px] text-[12px]">
        {t("Borrador")} v{draftVersion} → {t("Publicado")} v{draftVersion}
      </div>
      <div className="mt-[20px] flex justify-end gap-[8px]">
        <button
          type="button"
          disabled={pending}
          className="rounded-full border border-border px-[16px] py-[8px] text-[12px] hover:bg-muted disabled:opacity-50"
          onClick={onClose}
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          disabled={pending}
          className="primary flex min-w-[112px] items-center justify-center gap-[7px] px-[16px] py-[8px] text-[12px] disabled:opacity-50"
          onClick={onConfirm}
        >
          {pending ? (
            <RefreshCw className="h-[14px] w-[14px] animate-spin" />
          ) : (
            <Rocket className="h-[14px] w-[14px]" />
          )}
          {pending ? t("Publicando…") : t("Publicar")}
        </button>
      </div>
    </DialogShell>
  );
}

export function VersionHistoryPanel({
  open,
  versions,
  loading,
  error,
  onClose,
  onRetry,
  onPreview,
}: {
  open: boolean;
  versions: ChatbotFlowVersion[];
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
  onPreview: (version: ChatbotFlowVersion) => void;
}) {
  const { translate: t } = useTranslation();
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("Cerrar versiones")}
        className="absolute inset-0 z-30 bg-black/35"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 z-40 flex w-[min(390px,calc(100vw-24px))] flex-col border-l border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center gap-[10px] border-b border-border px-[16px] py-[14px]">
          <FileClock className="h-[18px] w-[18px] text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">{t("Versiones")}</div>
            <div className="mt-[1px] text-[10px] text-muted-foreground">
              {t("Historial inmutable de publicaciones")}
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-[12px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-[14px] text-[12px]">
              <div>{t("No se pudieron cargar las versiones")}</div>
              <button
                type="button"
                className="mt-[10px] font-medium text-primary"
                onClick={onRetry}
              >
                {t("Reintentar")}
              </button>
            </div>
          ) : (
            <div className="space-y-[9px]">
              {versions.map((version) => {
                const published = version.status === "published";
                const timestamp = version.published_at ?? version.updated_at;
                return (
                  <article
                    key={version.id}
                    className="rounded-xl border border-border bg-background/45 p-[12px]"
                  >
                    <div className="flex items-start justify-between gap-[10px]">
                      <div>
                        <div className="text-[13px] font-semibold">
                          v{version.version}
                        </div>
                        <div
                          className={`mt-[4px] inline-flex rounded-full px-[8px] py-[3px] text-[9px] font-semibold uppercase tracking-[0.08em] ${
                            published
                              ? "bg-emerald-500/12 text-emerald-500"
                              : "bg-amber-500/12 text-amber-500"
                          }`}
                        >
                          {published ? t("Publicado") : t("Borrador actual")}
                        </div>
                      </div>
                      {published && (
                        <button
                          type="button"
                          className="flex items-center gap-[5px] rounded-lg border border-border px-[9px] py-[6px] text-[10px] font-medium hover:bg-muted"
                          onClick={() => onPreview(version)}
                        >
                          <Eye className="h-[12px] w-[12px]" />
                          {t("Ver")}
                        </button>
                      )}
                    </div>
                    <div className="mt-[10px] flex items-center gap-[6px] text-[10px] text-muted-foreground">
                      <Clock3 className="h-[11px] w-[11px]" />
                      {formatVersionTimestamp(timestamp)}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function VersionPreviewDialog({
  version,
  onClose,
}: {
  version: ChatbotFlowVersion | null;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  if (!version) return null;
  const graph = normalizeChatbotEditorGraph(version.editor_graph);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-[10px] border-b border-border px-[14px] py-[11px] md:px-[20px]">
        <div className="flex h-[36px] w-[36px] items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-500">
          <Eye className="h-[17px] w-[17px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">
            {t("Versión publicada")} v{version.version}
          </div>
          <div className="mt-[1px] text-[10px] text-muted-foreground">
            {t("Vista de solo lectura")} ·{" "}
            {formatVersionTimestamp(version.published_at ?? version.updated_at)}
          </div>
        </div>
        <button
          type="button"
          className="flex h-[36px] items-center gap-[6px] rounded-lg border border-border px-[11px] text-[11px] hover:bg-muted"
          onClick={onClose}
        >
          <X className="h-[14px] w-[14px]" />
          {t("Cerrar")}
        </button>
      </header>
      <main className="min-h-0 flex-1 bg-muted/20">
        <ReactFlowProvider>
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={chatbotNodeTypes}
            defaultViewport={graph.viewport}
            fitView={!graph.viewport && graph.nodes.length > 0}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
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
            {graph.nodes.length > 0 && (
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
        </ReactFlowProvider>
      </main>
    </div>
  );
}

function DialogShell({
  labelledBy,
  maxWidth,
  onClose,
  children,
}: {
  labelledBy: string;
  maxWidth: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const { translate: t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-[16px] backdrop-blur-[2px]">
      {onClose && (
        <button
          type="button"
          aria-label={t("Cerrar")}
          className="absolute inset-0"
          onClick={onClose}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full ${maxWidth} rounded-2xl border border-border bg-popover p-[20px] text-popover-foreground shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const { translate: t } = useTranslation();
  return (
    <button
      type="button"
      title={t("Cerrar")}
      aria-label={t("Cerrar")}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted"
      onClick={onClick}
    >
      <X className="h-[14px] w-[14px]" />
    </button>
  );
}

function formatVersionTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
import type { ReactNode } from "react";
