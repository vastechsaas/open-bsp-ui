import { useEffect } from "react";
import useBoundStore from "@/stores/useBoundStore";
import { useConversationQueues } from "@/queries/useConversationQueues";
import { DEFAULT_CONVERSATION_QUEUE_KEY } from "@/types/conversationQueues";

export default function ChatFilter() {
  const appliedQueueKey = useBoundStore(
    (state) => state.ui.conversationQueueKey,
  );
  const setConversationQueueKey = useBoundStore(
    (state) => state.ui.setConversationQueueKey,
  );
  const { data: queues = [], isLoading } = useConversationQueues();

  useEffect(() => {
    if (!queues.length) return;

    if (!queues.some((queue) => queue.key === appliedQueueKey)) {
      setConversationQueueKey(queues[0].key);
    }
  }, [appliedQueueKey, queues, setConversationQueueKey]);

  if (isLoading) {
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
    <div className="px-[20px] pb-[5px] flex gap-3 w-full overflow-x-auto scrollbar-hide shrink-0">
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
  );
}
