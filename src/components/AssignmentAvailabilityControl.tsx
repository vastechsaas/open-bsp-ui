import { Circle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  useAssignmentPresence,
  useSetAssignmentPresence,
} from "@/queries/useAssignmentPresence";

export default function AssignmentAvailabilityControl() {
  const { translate: t } = useTranslation();
  const { data: agent } = useCurrentAgent();
  const isAgent = agent?.extra?.role === "agent";
  const presence = useAssignmentPresence(isAgent);
  const update = useSetAssignmentPresence();
  if (!isAgent) return null;
  const available = presence.data?.available ?? false;
  return (
    <button
      type="button"
      disabled={presence.isPending || update.isPending}
      onClick={() => update.mutate(!available)}
      title={available ? t("Disponible") : t("No disponible")}
      className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      <Circle
        className={`h-2.5 w-2.5 fill-current ${available ? "text-emerald-500" : "text-muted-foreground"}`}
      />
      <span className="hidden sm:inline">
        {available ? t("Disponible") : t("No disponible")}
      </span>
    </button>
  );
}
