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
      className="assignment-availability-control flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      <Circle
        className={`h-2.5 w-2.5 fill-current ${available ? "text-emerald-500" : "text-muted-foreground"}`}
      />
      <span className="assignment-availability-label">
        {available ? t("Disponible") : t("No disponible")}
      </span>
    </button>
  );
}
