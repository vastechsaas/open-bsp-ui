import { Button, Modal, Select, message as toast } from "antd";
import { RefreshCw, Settings2 } from "lucide-react";
import { useState } from "react";
import MediaStoragePanel from "@/components/settings/MediaStoragePanel";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformOrganizationMediaStorage,
  useReconcilePlatformMediaStorage,
  useUpdatePlatformMediaStorageQuota,
} from "@/queries/useMediaStorage";
import { MEDIA_STORAGE_QUOTA_OPTIONS } from "@/utils/MediaStorageUtils";

export default function PlatformOrganizationMediaStorage({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const storage = usePlatformOrganizationMediaStorage(organizationId);
  const updateQuota = useUpdatePlatformMediaStorageQuota(organizationId);
  const reconcile = useReconcilePlatformMediaStorage(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quotaGb, setQuotaGb] = useState<25 | 50 | 75 | 100>(25);

  const openDialog = () => {
    const current =
      Number(storage.data?.quota_bytes ?? 25_000_000_000) / 1_000_000_000;
    setQuotaGb(
      MEDIA_STORAGE_QUOTA_OPTIONS.includes(current as 25)
        ? (current as 25 | 50 | 75 | 100)
        : 25,
    );
    setDialogOpen(true);
  };

  return (
    <>
      <MediaStoragePanel
        data={storage.data}
        loading={storage.isPending}
        error={storage.isError}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<RefreshCw className="h-4 w-4" />}
              loading={reconcile.isPending}
              onClick={() =>
                reconcile.mutate(undefined, {
                  onSuccess: () => void toast.success(t("Uso reconciliado")),
                  onError: () =>
                    void toast.error(t("No se pudo reconciliar el uso")),
                })
              }
            >
              {t("Reconciliar uso")}
            </Button>
            <Button
              type="primary"
              icon={<Settings2 className="h-4 w-4" />}
              onClick={openDialog}
            >
              {t("Configurar cuota")}
            </Button>
          </div>
        }
      />

      <Modal
        title={t("Configurar cuota de almacenamiento")}
        open={dialogOpen}
        okText={t("Guardar")}
        cancelText={t("Cancelar")}
        confirmLoading={updateQuota.isPending}
        onCancel={() => setDialogOpen(false)}
        onOk={() =>
          updateQuota.mutate(quotaGb, {
            onSuccess: () => {
              setDialogOpen(false);
              void toast.success(t("Cuota actualizada"));
            },
            onError: () =>
              void toast.error(t("No se pudo actualizar la cuota")),
          })
        }
      >
        <p className="mb-4 text-[13px] text-muted-foreground">
          {t(
            "Reducir la cuota por debajo del uso actual no elimina archivos, pero bloquea nuevas cargas.",
          )}
        </p>
        <label className="block text-[12px] font-medium">
          {t("Cuota")}
          <Select
            className="mt-2 w-full"
            value={quotaGb}
            onChange={(value) => setQuotaGb(value)}
            options={MEDIA_STORAGE_QUOTA_OPTIONS.map((value) => ({
              value,
              label: `${value} GB`,
            }))}
          />
        </label>
      </Modal>
    </>
  );
}
