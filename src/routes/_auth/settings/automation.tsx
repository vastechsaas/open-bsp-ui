import { createFileRoute } from "@tanstack/react-router";
import { message as toast } from "antd";
import OrganizationAutomationPanel from "@/components/settings/OrganizationAutomationPanel";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  useOrganizationAutomationSettings,
  useUpdateOrganizationContactAutoSave,
} from "@/queries/useOrganizationAutomation";

export const Route = createFileRoute("/_auth/settings/automation")({
  component: OrganizationAutomationSettings,
});

function OrganizationAutomationSettings() {
  const { translate: t } = useTranslation();
  const { data: currentAgent, isPending: agentPending } = useCurrentAgent();
  const settings = useOrganizationAutomationSettings();
  const updateSetting = useUpdateOrganizationContactAutoSave();
  const canManage = ["owner", "admin", "supervisor"].includes(
    currentAgent?.extra?.role ?? "",
  );

  if (!agentPending && !canManage) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-destructive">
        {t(
          "Solo propietarios, administradores y supervisores pueden administrar automatizaciones.",
        )}
      </div>
    );
  }

  return (
    <OrganizationAutomationPanel
      enabled={settings.data?.auto_save_whatsapp_contacts}
      loading={agentPending || settings.isPending}
      error={settings.isError}
      saving={updateSetting.isPending}
      onChange={(enabled) => {
        updateSetting.mutate(enabled, {
          onSuccess: () => void toast.success(t("Automatización actualizada")),
          onError: () =>
            void toast.error(t("No se pudo actualizar la automatización")),
        });
      }}
    />
  );
}
