import { useState } from "react";
import { Modal } from "antd";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCampaignControls } from "@/queries/useCampaignControls";
import type { CampaignRow } from "@/queries/useCampaigns";
import { canControlCampaign } from "@/utils/CampaignControlUtils";

export default function CampaignControls({
  campaign,
}: {
  campaign: CampaignRow;
}) {
  const { translate: t } = useTranslation();
  const control = useCampaignControls(campaign.organization_id, campaign.id);
  const [confirm, setConfirm] = useState(false);
  const paused = !!campaign.paused_at;
  if (!canControlCampaign(campaign)) return null;
  return (
    <div className="flex flex-col items-end gap-2 min-w-0">
      <button
        type="button"
        disabled={control.isPending}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${paused ? "primary" : "border border-primary/60 text-foreground hover:bg-primary/10"}`}
        onClick={() => {
          control.reset();
          if (paused)
            control.mutate({
              action: "resume",
              revision: campaign.control_revision,
            });
          else setConfirm(true);
        }}
      >
        {paused ? <Play size={16} /> : <Pause size={16} />}
        {control.isPending
          ? t("Confirmando…")
          : paused
            ? t("Reanudar campaña")
            : t("Pausar campaña")}
      </button>
      {control.isError && (
        <p role="alert" className="max-w-sm text-xs text-destructive">
          {control.error.message === "conflict"
            ? t("El estado cambió. Revisá la campaña antes de continuar.")
            : t(
                "No se pudo confirmar el cambio. Actualizá el estado antes de reintentar.",
              )}
          {control.error.message !== "conflict" && (
            <button
              type="button"
              className="ml-1 underline"
              onClick={control.retryControl}
            >
              {t("Reintentar")}
            </button>
          )}
        </p>
      )}
      <Modal
        open={confirm}
        title={t("¿Pausar esta campaña?")}
        onCancel={() => setConfirm(false)}
        okText={t("Pausar campaña")}
        cancelText={t("Volver")}
        confirmLoading={control.isPending}
        onOk={() => {
          setConfirm(false);
          control.mutate({
            action: "pause",
            revision: campaign.control_revision,
          });
        }}
      >
        <p>
          {t(
            "Los mensajes pendientes quedarán en espera. Los mensajes ya en curso pueden llegar. Podés reanudar la campaña más tarde.",
          )}
        </p>
      </Modal>
    </div>
  );
}
