import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { message } from "antd";
import CampaignForm from "@/components/campaigns/CampaignForm";
import CampaignWorkspaceHeader from "@/components/campaigns/CampaignWorkspaceHeader";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
} from "@/queries/useCampaigns";

export const Route = createFileRoute("/_auth/campaigns/$campaignId_/edit")({
  component: EditCampaign,
});

function EditCampaign() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { campaignId } = Route.useParams();
  const { data: campaign, isLoading, isError } = useCampaign(campaignId);
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
        {t("No se pudo cargar la campaña")}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <CampaignWorkspaceHeader
        title={t("Editar campaña")}
        activeStep={1}
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
        layout="workspace"
        loading={updateCampaign.isPending}
        secondarySubmitLabel={t("Guardar borrador")}
        submitLabel={t("Revisar y continuar")}
        onSubmit={(input, intent) =>
          updateCampaign.mutate(
            { id: campaignId, ...input },
            {
              onSuccess: () => {
                void message.success(t("Borrador actualizado"));
                if (intent === "review") {
                  void navigate({
                    to: "/campaigns/$campaignId/review",
                    params: { campaignId },
                  });
                }
              },
              onError: () =>
                void message.error(t("No se pudo actualizar el borrador")),
            },
          )
        }
      />
    </div>
  );
}
