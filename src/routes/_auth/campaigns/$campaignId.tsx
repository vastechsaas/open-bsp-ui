import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { message } from "antd";
import CampaignForm from "@/components/campaigns/CampaignForm";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
} from "@/queries/useCampaigns";

export const Route = createFileRoute("/_auth/campaigns/$campaignId")({
  component: EditCampaign,
});

function EditCampaign() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { campaignId } = Route.useParams();
  const { data: campaign } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  if (!campaign) return null;

  return (
    <>
      <SectionHeader
        title={t("Editar campaña")}
        onDelete={() =>
          deleteCampaign.mutate(campaignId, {
            onSuccess: () => {
              void message.success(t("Borrador eliminado"));
              void navigate({
                to: "/campaigns",
                hash: (previous) => previous!,
              });
            },
            onError: () =>
              void message.error(t("No se pudo eliminar el borrador")),
          })
        }
        deleteLoading={deleteCampaign.isPending}
      />
      <CampaignForm
        campaign={campaign}
        loading={updateCampaign.isPending}
        submitLabel={t("Actualizar borrador")}
        onSubmit={(input) =>
          updateCampaign.mutate(
            { id: campaignId, ...input },
            {
              onSuccess: () => void message.success(t("Borrador actualizado")),
              onError: () =>
                void message.error(t("No se pudo actualizar el borrador")),
            },
          )
        }
      />
    </>
  );
}
