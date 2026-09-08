import { useEffect } from "react";
import useBoundStore from "@/stores/useBoundStore";
import { useConversationQueues } from "@/queries/useConversationQueues";
import { DEFAULT_CONVERSATION_QUEUE_KEY } from "@/types/conversationQueues";
import { useRoutingQueueOptions } from "@/queries/useRoutingQueues";
import { useTranslation } from "@/hooks/useTranslation";

export default function ChatFilter() {
  const { translate: t } = useTranslation();
  const appliedQueueKey = useBoundStore(
    (state) => state.ui.conversationQueueKey,
  );
  const setConversationQueueKey = useBoundStore(
    (state) => state.ui.setConversationQueueKey,
  );
  const routingQueueId = useBoundStore((state) => state.ui.routingQueueId);
  const setRoutingQueueId = useBoundStore(
    (state) => state.ui.setRoutingQueueId,
  );
  const { data: queues = [], isLoading } = useConversationQueues();
  const { data: routingQueues = [], isLoading: routingQueuesLoading } =
    useRoutingQueueOptions();

  useEffect(() => {
    if (!queues.length) return;

    if (!queues.some((queue) => queue.key === appliedQueueKey)) {
      setConversationQueueKey(queues[0].key);
    }
  }, [appliedQueueKey, queues, setConversationQueueKey]);

  useEffect(() => {
    if (
      routingQueueId &&
      !routingQueues.some((queue) => queue.id === routingQueueId)
    ) {
      setRoutingQueueId(null);
    }
  }, [routingQueueId, routingQueues, setRoutingQueueId]);

  if (isLoading || routingQueuesLoading) {
    return (
      <div className="px-[20px] pb-[5px] flex gap-3 w-full overflow-x-auto scrollbar-hide shrink-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[34px] w-[96px] rounded-md bg-accent animate-pulse shrink-0"
          />
        ))}
      </div>
    );
  }

  if (!queues.length) return null;

  const activeKey = queues.some((queue) => queue.key === appliedQueueKey)
    ? appliedQueueKey
    : DEFAULT_CONVERSATION_QUEUE_KEY;

  return (
    <div className="shrink-0 space-y-[8px] px-[20px] pb-[5px]">
      {routingQueues.length > 0 && (
        <label className="flex items-center gap-[8px]">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Cola")}
          </span>
          <select
            value={routingQueueId ?? ""}
            onChange={(event) => setRoutingQueueId(event.target.value || null)}
            className="h-[34px] min-w-0 flex-1 rounded-md border border-border bg-background px-[10px] text-[13px] text-foreground"
          >
            <option value="">{t("Todas las colas")}</option>
            {routingQueues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex w-full gap-3 overflow-x-auto scrollbar-hide">
        {queues.map((queue) => (
          <button
            key={queue.key}
            className={
              "text-[14px] text-nowrap px-[12px] py-[6px] rounded-md border transition-colors" +
              (queue.key === activeKey
                ? " text-primary-foreground bg-primary border-primary"
                : " text-foreground bg-background hover:bg-accent border-border")
            }
            onClick={() => {
              setConversationQueueKey(queue.key);
            }}
          >
            {queue.label}
          </button>
        ))}
      </div>
    </div>
  );
}
