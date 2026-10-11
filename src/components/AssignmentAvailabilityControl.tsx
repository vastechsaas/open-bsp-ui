import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import AssignmentAvailabilityToggle from "@/components/AssignmentAvailabilityToggle";
import { canSetConversationAvailability } from "@/utils/AssignmentAvailabilityUtils";
import {
  useAssignmentPresence,
  useSetAssignmentPresence,
} from "@/queries/useAssignmentPresence";

export default function AssignmentAvailabilityControl() {
  const { translate: t } = useTranslation();
  const { data: agent } = useCurrentAgent();
  const canSetAvailability = canSetConversationAvailability(
    agent?.extra?.role,
    agent?.extra?.invitation?.status,
  );
  const presence = useAssignmentPresence(canSetAvailability);
  const update = useSetAssignmentPresence();
  if (!canSetAvailability) return null;
  const available = presence.data?.available ?? null;
  const failed = presence.isError || update.isError;
  return (
    <div className="relative flex w-fit items-center">
      <AssignmentAvailabilityToggle
        available={available}
        disabled={available === null || update.isPending}
        busy={presence.isPending || update.isPending}
        failed={failed}
        onToggle={() => update.mutate(!available)}
        translate={t}
      />
      {failed && (
        <div
          role="alert"
          className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-destructive/40 bg-background p-2 text-xs text-destructive shadow-md"
        >
          {t("No se pudo actualizar la disponibilidad.")}{" "}
          <button
            type="button"
            className="underline"
            disabled={presence.isFetching || update.isPending}
            onClick={() => {
              if (presence.isError) void presence.refetch();
              else if (update.variables !== undefined)
                update.mutate(update.variables);
            }}
          >
            {t("Reintentar")}
          </button>
        </div>
      )}
    </div>
  );
}
