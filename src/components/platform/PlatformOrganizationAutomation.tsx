import { message as toast } from "antd";
import OrganizationAutomationPanel from "@/components/settings/OrganizationAutomationPanel";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformOrganizationAutomationSettings,
  useUpdatePlatformOrganizationContactAutoSave,
} from "@/queries/useOrganizationAutomation";

export default function PlatformOrganizationAutomation({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const settings = usePlatformOrganizationAutomationSettings(organizationId);
  const updateSetting =
    useUpdatePlatformOrganizationContactAutoSave(organizationId);

  return (
    <OrganizationAutomationPanel
      platform
      enabled={settings.data?.auto_save_whatsapp_contacts}
      loading={settings.isPending}
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
