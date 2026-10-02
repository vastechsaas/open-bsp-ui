import { useTranslation } from "@/hooks/useTranslation";
import {
  useNodeChatbotResume,
  useNodeConversationLifecycle,
} from "@/queries/useChatbotFlows";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  canResolveNodeConversation,
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
    lifecycle.action.error?.message ||
    lifecycle.status.error?.message ||
    (snapshot?.operation?.status === "failed"
      ? snapshot.operation.last_error
      : null) ||
    legacy.resume.error?.message;
  return (
    <div className="flex max-w-[250px] flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {(pending || snapshot?.state === "human_owned") && (
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
            disabled={pending || !canResolve}
            onClick={() => lifecycle.action.mutate("resolve-and-close")}
          >
            {pending
              ? t("Cerrando—sincronización pendiente")
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
              className="rounded-full p-1.5 hover:bg-muted"
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
            className="underline"
            disabled={lifecycle.action.isPending}
            onClick={() => {
              const operation = snapshot?.operation;
              if (
                operation &&
                operation.status !== "succeeded" &&
                (operation.action === "resolve-and-close"
                  ? snapshot.can_resolve
                  : manager)
              ) {
                lifecycle.action.mutate(operation.action);
              } else void lifecycle.status.refetch();
            }}
          >
            {t("Actualizar y reintentar")}
          </button>
        </div>
      )}
    </div>
  );
}
