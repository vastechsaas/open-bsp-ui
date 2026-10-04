import { useTranslation } from "@/hooks/useTranslation";
import {
  useNodeChatbotResume,
  useNodeConversationLifecycle,
} from "@/queries/useChatbotFlows";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  canResolveNodeConversation,
  canTakeOverNodeConversation,
  isConversationManager,
} from "@/utils/NodeConversationUtils";
import useBoundStore from "@/stores/useBoundStore";
import { Dropdown, Popover } from "antd";
import { AlertCircle, LoaderCircle, MoreHorizontal } from "lucide-react";

export default function ResolveConversationControls({
  conversationId,
}: {
  conversationId?: string;
}) {
  const { translate: t } = useTranslation();
  const lifecycle = useNodeConversationLifecycle(conversationId);
  const legacy = useNodeChatbotResume(conversationId);
  const { data: agent } = useCurrentAgent();
  const messages = useBoundStore((state) =>
    state.chat.messages.get(conversationId || ""),
  );
  const visibleInbound = Array.from(messages?.values() || [])
    .filter((message) => message.direction === "incoming")
    .map((message) => message.external_id)
    .filter((id): id is string => !!id);
  const snapshot = lifecycle.status.data;
  const pending =
    !!lifecycle.mapping.data?.pending_request_id || lifecycle.action.isPending;
  const canResolve = canResolveNodeConversation(snapshot, visibleInbound);
  const waiting = snapshot?.support_request?.status === "waiting";
  const syncingSupport =
    !!snapshot?.takeover_enabled && !!snapshot.takeover_sync_pending;
  const canTakeOver = canTakeOverNodeConversation(snapshot);
  const takingOver =
    (lifecycle.action.variables === "takeover" && lifecycle.action.isPending) ||
    (pending && snapshot?.operation?.action === "takeover");
  const manager = isConversationManager(agent?.extra?.role);
  const canReturn =
    manager &&
    !pending &&
    (snapshot?.enabled
      ? snapshot.can_resume &&
        snapshot.state === "human_owned" &&
        !!snapshot.last_inbound_wamid &&
        visibleInbound.includes(snapshot.last_inbound_wamid)
      : !!legacy.mapping.data);
  if (!pending && !snapshot?.enabled && !canReturn) return null;
  const error =
    (lifecycle.action.variables === "takeover" &&
    snapshot?.state === "human_owned"
      ? null
      : lifecycle.action.error?.message) ||
    lifecycle.status.error?.message ||
    (snapshot?.operation?.status === "failed"
      ? snapshot.operation.last_error
      : null) ||
    legacy.resume.error?.message;
  const actionLabel = waiting
    ? t("Tomar control del chat")
    : t("Resolver y cerrar");
  const progressLabel = pending
    ? takingOver
      ? t("Tomando control—sincronización pendiente")
      : t("Cerrando—sincronización pendiente")
    : syncingSupport
      ? t("Sincronizando solicitud de soporte…")
      : actionLabel;
  const supportStatus = waiting
    ? t("Esperando soporte · Chatbot activo")
    : snapshot?.support_request?.status === "handling"
      ? snapshot.support_request.handled_by_agent_id === agent?.id
        ? t("Estás atendiendo este chat · Chatbot pausado")
        : t("Soporte humano activo · Chatbot pausado")
      : "";
  const supportHint = [
    supportStatus,
    waiting && snapshot.support_request?.reason
      ? `${t("Solicitud original")}: ${snapshot.support_request.reason}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <div className="flex h-8 shrink-0 items-center gap-1" title={supportHint}>
      <span role="status" className="sr-only" aria-live="polite">
        {pending || syncingSupport ? progressLabel : supportStatus}
      </span>
      {(pending || waiting || snapshot?.state === "human_owned") && (
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted/70 px-3 text-xs font-medium leading-none text-foreground transition-colors enabled:hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          aria-label={progressLabel}
          aria-busy={pending || syncingSupport}
          title={
            pending || syncingSupport
              ? progressLabel
              : supportHint || actionLabel
          }
          disabled={
            pending || syncingSupport || (waiting ? !canTakeOver : !canResolve)
          }
          onClick={() =>
            lifecycle.action.mutate(waiting ? "takeover" : "resolve-and-close")
          }
        >
          {(pending || syncingSupport) && (
            <LoaderCircle
              className="h-3.5 w-3.5 shrink-0 animate-spin"
              aria-hidden
            />
          )}
          {actionLabel}
        </button>
      )}
      {canReturn && (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "return-to-chatbot",
                label: t("Volver al chatbot"),
                onClick: () =>
                  snapshot?.enabled
                    ? lifecycle.action.mutate("resume")
                    : legacy.resume.mutate(),
              },
            ],
          }}
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("Más acciones de conversación")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </Dropdown>
      )}
      {error && (
        <Popover
          trigger={["click"]}
          placement="bottomRight"
          content={
            <div
              role="alert"
              className="max-w-72 break-words text-xs text-destructive"
            >
              {error}{" "}
              <button
                type="button"
                className="text-destructive underline"
                disabled={lifecycle.action.isPending}
                onClick={() => {
                  const operation = snapshot?.operation;
                  if (
                    operation &&
                    operation.status !== "succeeded" &&
                    (operation.action === "takeover"
                      ? snapshot.can_takeover
                      : operation.action === "resolve-and-close"
                        ? snapshot.can_resolve
                        : manager)
                  ) {
                    lifecycle.action.mutate(operation.action);
                  } else void lifecycle.status.refetch();
                }}
              >
                {snapshot?.operation?.action === "takeover"
                  ? t("Reintentar toma de control")
                  : t("Actualizar y reintentar")}
              </button>
            </div>
          }
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-destructive hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("Actualizar y reintentar")}
            title={error}
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
          </button>
        </Popover>
      )}
    </div>
  );
}
