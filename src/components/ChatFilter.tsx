import { useEffect } from "react";
import useBoundStore from "@/stores/useBoundStore";
import { useConversationQueues } from "@/queries/useConversationQueues";
import { useConversationQueueCounts } from "@/queries/useConversationQueueCounts";
import { useTranslation } from "@/hooks/useTranslation";

export default function ChatFilter() {
  const { translate: t } = useTranslation();
  const appliedQueueKey = useBoundStore(
    (state) => state.ui.conversationQueueKey,
  );
  const setConversationQueueKey = useBoundStore(
    (state) => state.ui.setConversationQueueKey,
  );
  const {
    data: queues = [],
    isLoading,
    isError,
    refetch,
  } = useConversationQueues();
  const counts = useConversationQueueCounts();
  useEffect(() => {
    if (queues.length && !queues.some((queue) => queue.key === appliedQueueKey))
      setConversationQueueKey(queues[0].key);
  }, [appliedQueueKey, queues, setConversationQueueKey]);
  return (
    <div className="flex min-w-0 items-center gap-3 border-t border-border px-3 sm:px-5">
      <nav
        aria-label={t("Vistas de conversaciones")}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5"
      >
        {isLoading && (
          <span role="status" className="py-3 text-xs text-muted-foreground">
            {t("Cargando...")}
          </span>
        )}
        {queues.map((queue) => (
          <button
            key={queue.key}
            type="button"
            aria-current={queue.key === appliedQueueKey ? "page" : undefined}
            onClick={() => setConversationQueueKey(queue.key)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${queue.key === appliedQueueKey ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {queue.label}
            <span
              aria-busy={counts.isPending}
              className="min-w-6 rounded-md bg-muted px-1.5 py-0.5 text-center text-[11px] tabular-nums text-foreground"
            >
              {counts.isError
                ? "—"
                : counts.isPending
                  ? "…"
                  : (counts.data?.get(queue.key) ?? "—")}
            </span>
          </button>
        ))}
      </nav>
      {(isError || counts.isError) && (
        <button
          type="button"
          onClick={() => {
            void refetch();
            void counts.refetch();
          }}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-destructive underline focus-visible:ring-2 focus-visible:ring-ring"
          title={t("No se pudieron cargar los contadores.")}
        >
          {t("Reintentar")}
        </button>
      )}
    </div>
  );
}
