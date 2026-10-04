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
import { Dropdown } from "antd";
import { MoreHorizontal } from "lucide-react";

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
  return (
    <div className="flex max-w-[250px] flex-col items-end gap-1">
      {waiting && (
        <div role="status" className="text-xs font-medium text-foreground">
          {t("Esperando soporte · Chatbot activo")}
        </div>
      )}
      {snapshot?.support_request?.status === "handling" && (
        <div role="status" className="text-xs font-medium text-foreground">
          {snapshot.support_request.handled_by_agent_id === agent?.id
            ? t("Estás atendiendo este chat · Chatbot pausado")
            : t("Soporte humano activo · Chatbot pausado")}
        </div>
      )}
      {waiting && snapshot.support_request?.reason && (
        <div
          className="max-w-[250px] truncate text-xs text-muted-foreground"
          title={snapshot.support_request.reason}
        >
          {t("Solicitud original")}: {snapshot.support_request.reason}
        </div>
      )}
      <div className="flex items-center gap-1">
        {(pending || waiting || snapshot?.state === "human_owned") && (
          <button
            type="button"
            className="inline-flex min-h-8 items-center rounded-full border border-border bg-muted/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors enabled:hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            disabled={
              pending ||
              syncingSupport ||
              (waiting ? !canTakeOver : !canResolve)
            }
            onClick={() =>
              lifecycle.action.mutate(
                waiting ? "takeover" : "resolve-and-close",
              )
            }
          >
            {pending
              ? takingOver
                ? t("Tomando control—sincronización pendiente")
                : t("Cerrando—sincronización pendiente")
              : syncingSupport
                ? t("Sincronizando solicitud de soporte…")
                : waiting
                  ? t("Tomar control del chat")
                  : t("Resolver y cerrar")}
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
              className="rounded-full p-1.5 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("Más acciones de conversación")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </Dropdown>
        )}
      </div>
      {error && (
        <div role="alert" className="text-xs text-destructive">
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
      )}
    </div>
  );
}
