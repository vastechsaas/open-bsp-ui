import { AlertCircle, Bot, ShieldCheck, LoaderCircle } from "lucide-react";
import { useNodeConversationLifecycle } from "@/queries/useChatbotFlows";
import { useCurrentAgent } from "@/queries/useAgents";
import { useTranslation } from "@/hooks/useTranslation";
import { ownershipPresentation } from "@/utils/ConversationWorkspaceUtils";

export default function ConversationOwnershipBanner({
  conversationId,
}: {
  conversationId: string;
}) {
  const { translate: t } = useTranslation();
  const lifecycle = useNodeConversationLifecycle(conversationId);
  const { data: agent } = useCurrentAgent();
  const presentation = ownershipPresentation(
    lifecycle.status.data,
    agent?.id,
    lifecycle.status.isError,
  );
  if (!presentation) return null;
  const Icon =
    presentation.tone === "error"
      ? AlertCircle
      : presentation.tone === "human"
        ? ShieldCheck
        : presentation.tone === "warning"
          ? LoaderCircle
          : Bot;
  const tones = {
    neutral: "border-border bg-background/80 text-foreground",
    warning:
      "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    human:
      "border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200",
    error: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-3 my-2 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs ${tones[presentation.tone]}`}
    >
      <Icon
        aria-hidden
        className={`h-4 w-4 shrink-0 ${presentation.tone === "warning" ? "animate-spin" : ""}`}
      />
      <span>{t(presentation.label)}</span>
      {presentation.tone === "error" && (
        <button
          type="button"
          className="ml-auto shrink-0 underline focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => void lifecycle.status.refetch()}
        >
          {t("Actualizar y reintentar")}
        </button>
      )}
    </div>
  );
}
