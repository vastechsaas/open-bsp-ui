import { useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRightLeft, X } from "lucide-react";
import { message } from "antd";
import { useNavigate } from "@tanstack/react-router";
import useBoundStore from "@/stores/useBoundStore";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  useTransferableRoutingQueueOptions,
  useTransferConversationToQueue,
} from "@/queries/useRoutingQueues";
import { useTranslation } from "@/hooks/useTranslation";

export default function QueueTransferDialog({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: currentAgent } = useCurrentAgent();
  const {
    data: queues = [],
    isLoading,
    error,
  } = useTransferableRoutingQueueOptions(conversationId);
  const transfer = useTransferConversationToQueue();
  const pushConversations = useBoundStore(
    (state) => state.chat.pushConversations,
  );
  const pushMessages = useBoundStore((state) => state.chat.pushMessages);
  const removeConversations = useBoundStore(
    (state) => state.chat.removeConversations,
  );
  const [targetQueueId, setTargetQueueId] = useState("");
  const [explanation, setExplanation] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = explanation.trim();
    if (!targetQueueId || !text || transfer.isPending) return;

    try {
      const result = await transfer.mutateAsync({
        conversationId,
        targetRoutingQueueId: targetQueueId,
        text,
      });

      pushConversations([result.conversation]);
      pushMessages([result.note]);

      if (currentAgent?.extra?.role === "agent") {
        removeConversations([result.conversation.id]);
        await navigate({ to: "/conversations", hash: "" });
      } else {
        onClose();
      }

      void message.success(t("Conversación transferida a la cola"));
    } catch {
      void message.error(
        t("No se pudo transferir la conversación. No se realizaron cambios."),
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <ArrowRightLeft className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-semibold">
              {t("Transferir conversación a otra cola")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("Seleccioná el equipo que continuará la conversación.")}
            </p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 hover:bg-muted"
            onClick={onClose}
            aria-label={t("Cerrar")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium">
          {t("Cola de destino")}
          <select
            autoFocus
            value={targetQueueId}
            onChange={(event) => setTargetQueueId(event.target.value)}
            disabled={isLoading || !!error || queues.length === 0}
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60"
          >
            <option value="">{t("Seleccioná una cola")}</option>
            {queues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </select>
        </label>

        {isLoading && (
          <p className="mt-2 text-sm text-muted-foreground">{t("Cargando…")}</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-destructive">
            {t("No se pudieron cargar las colas disponibles.")}
          </p>
        )}
        {!isLoading && !error && queues.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("No hay otras colas activas disponibles.")}
          </p>
        )}

        <label className="mt-5 block text-sm font-medium">
          {t("Explicación")}
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            placeholder={t("Explicá por qué se transfiere esta conversación.")}
            rows={4}
            className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>

        <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-foreground">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden
          />
          <p>
            {t("La conversación quedará sin asignar en la cola de destino.")}
          </p>
        </div>

        {transfer.error && (
          <p className="mt-3 text-sm text-destructive">
            {transfer.error.message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            disabled={transfer.isPending}
            onClick={onClose}
          >
            {t("Cancelar")}
          </button>
          <button
            type="submit"
            className="primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            disabled={
              transfer.isPending || !targetQueueId || !explanation.trim()
            }
          >
            <ArrowRightLeft className="h-4 w-4" aria-hidden />
            {transfer.isPending ? t("Transfiriendo…") : t("Transferir")}
          </button>
        </div>
      </form>
    </div>
  );
}
