import { CircleDot } from "lucide-react";
import type { ChatbotServingState } from "@/utils/ChatbotServingUtils";

export type ChatbotServingStatusProps = {
  states: ChatbotServingState[];
  loading: boolean;
  error: boolean;
  archived: boolean;
  translate: (key: string) => string;
};

const labels = {
  serving: "Atendiendo clientes",
  syncing: "Sincronización pendiente",
  failed: "Error de sincronización",
  suspended: "Suspendido",
  disabled: "Desactivado",
};

export default function ChatbotServingStatus({
  states,
  loading,
  error,
  archived,
  translate: t,
}: ChatbotServingStatusProps) {
  if (archived)
    return (
      <span className="text-[11px] text-muted-foreground">
        {t("Archivado")}
      </span>
    );
  // Do not present cached success as current when a refresh failed.
  if (error)
    return (
      <span className="text-[11px] text-destructive">
        {t("Estado no disponible")}
      </span>
    );
  if (loading)
    return (
      <span className="text-[11px] text-muted-foreground" role="status">
        {t("Comprobando activación…")}
      </span>
    );
  if (!states.length)
    return (
      <span className="text-[11px] text-muted-foreground">
        {t("No activado")}
      </span>
    );
  return (
    <div className="min-w-[175px] space-y-[8px]">
      {states.map((binding) => (
        <div key={`${binding.engine}:${binding.address}`}>
          <span
            className={`inline-flex items-center gap-[6px] whitespace-nowrap rounded-full px-[9px] py-[4px] text-[11px] font-medium ${
              binding.state === "serving"
                ? "bg-green-500/12 text-green-700 dark:text-green-400"
                : binding.state === "failed"
                  ? "bg-destructive/10 text-destructive"
                  : binding.state === "syncing"
                    ? "bg-amber-500/12 text-amber-800 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            <CircleDot className="h-[11px] w-[11px]" aria-hidden="true" />
            {t(labels[binding.state])}
          </span>
          <div className="mt-[3px] text-[11px] text-muted-foreground">
            {binding.engine === "node" ? "Node" : t("Nativo")}
            {binding.version !== null && ` · v${binding.version}`}
          </div>
          <div className="max-w-[230px] break-all text-[11px] text-muted-foreground">
            {binding.phone || `${t("ID del número")}: ${binding.address}`}
          </div>
        </div>
      ))}
    </div>
  );
}
