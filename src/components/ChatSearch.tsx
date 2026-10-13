import { useEffect, useState } from "react";
import { Popover, Select } from "antd";
import { SlidersHorizontal } from "lucide-react";
import useBoundStore from "@/stores/useBoundStore";
import SearchBar from "@/components/SearchBar";
import { useRoutingQueueOptions } from "@/queries/useRoutingQueues";
import { useTranslation } from "@/hooks/useTranslation";

export default function ChatSearch() {
  const { translate: t } = useTranslation();
  const [open, setOpen] = useState(false);
  const searchPattern = useBoundStore((state) => state.ui.searchPattern);
  const setSearchPattern = useBoundStore((state) => state.ui.setSearchPattern);
  const routingQueueId = useBoundStore((state) => state.ui.routingQueueId);
  const setRoutingQueueId = useBoundStore(
    (state) => state.ui.setRoutingQueueId,
  );
  const {
    data: queues = [],
    isSuccess,
    isLoading,
    isError,
    refetch,
  } = useRoutingQueueOptions();
  useEffect(() => {
    if (
      isSuccess &&
      routingQueueId &&
      !queues.some((queue) => queue.id === routingQueueId)
    )
      setRoutingQueueId(null);
  }, [isSuccess, queues, routingQueueId, setRoutingQueueId]);
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-3">
      <SearchBar
        className="min-w-0 flex-1"
        value={searchPattern}
        onChange={setSearchPattern}
      />
      <Popover
        trigger="click"
        placement="bottomRight"
        open={open}
        onOpenChange={setOpen}
        title={t("Filtros")}
        content={
          <div className="w-64 space-y-3">
            <label
              htmlFor="conversation-routing-filter"
              className="block text-xs font-medium"
            >
              {t("Cola")}
            </label>
            <Select
              id="conversation-routing-filter"
              aria-label={t("Cola")}
              className="w-full"
              loading={isLoading}
              disabled={isError}
              value={routingQueueId ?? ""}
              onChange={(id) => setRoutingQueueId(id || null)}
              options={[
                { value: "", label: t("Todas las colas") },
                ...queues.map((queue) => ({
                  value: queue.id,
                  label: queue.name,
                })),
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "Los contadores reflejan la cola seleccionada, no el texto de búsqueda.",
              )}
            </p>
            {isError && (
              <button
                type="button"
                className="text-xs text-destructive underline"
                onClick={() => void refetch()}
              >
                {t("Reintentar")}
              </button>
            )}
            <button
              type="button"
              disabled={!routingQueueId}
              className="text-xs text-primary underline disabled:text-muted-foreground"
              onClick={() => setRoutingQueueId(null)}
            >
              {t("Limpiar filtros")}
            </button>
          </div>
        }
      >
        <button
          type="button"
          aria-label={t("Filtros")}
          aria-expanded={open}
          aria-pressed={!!routingQueueId}
          className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${routingQueueId ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-accent"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {routingQueueId && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>
      </Popover>
    </div>
  );
}
