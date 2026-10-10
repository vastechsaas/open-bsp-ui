import { createFileRoute } from "@tanstack/react-router";
import Spinner from "@/components/Spinner";
import NotificationTypePanel from "@/components/settings/NotificationTypePanel";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/queries/useNotificationPreferences";
import useBoundStore from "@/stores/useBoundStore";
import { canManageNotificationPreferences } from "@/utils/NotificationPreferenceUtils";

export const Route = createFileRoute("/_auth/settings/preferences")({
  component: OrganizationPreferences,
});

function OrganizationPreferences() {
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const userId = useBoundStore((state) => state.ui.user?.id);
  return <ScopedOrganizationPreferences key={`${organizationId}:${userId}`} />;
}

function ScopedOrganizationPreferences() {
  const { translate: t } = useTranslation();
  const {
    data: currentAgent,
    isPending: agentPending,
    isError: agentError,
    refetch: refetchAgent,
  } = useCurrentAgent();
  const canManage = canManageNotificationPreferences(currentAgent?.extra?.role);
  const preferences = useNotificationPreferences(canManage);
  const update = useUpdateNotificationPreference();

  if (agentPending)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (agentError)
    return (
      <div role="alert" className="p-6 text-[13px] text-destructive">
        <p>{t("No se pudieron cargar las preferencias.")}</p>
        <button
          type="button"
          onClick={() => void refetchAgent()}
          className="mt-3 rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted"
        >
          {t("Reintentar")}
        </button>
      </div>
    );
  if (!canManage)
    return (
      <div
        role="alert"
        className="flex h-full items-center justify-center p-6 text-center text-[13px] text-muted-foreground"
      >
        {t(
          "Solo el propietario puede administrar las preferencias de notificación.",
        )}
      </div>
    );

  return (
    <NotificationTypePanel
      preferences={preferences.data}
      loading={preferences.isPending}
      error={preferences.isError}
      savingType={update.isPending ? update.variables?.type : undefined}
      saveError={update.isError}
      saved={update.isSuccess}
      onRetry={() => void preferences.refetch()}
      onRetrySave={() => {
        if (update.variables) update.mutate(update.variables);
      }}
      onChange={(type, enabled) => update.mutate({ type, enabled })}
    />
  );
}
