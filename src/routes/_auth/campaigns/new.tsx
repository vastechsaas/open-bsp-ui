import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { message } from "antd";
import CampaignForm from "@/components/campaigns/CampaignForm";
import CampaignWorkspaceHeader from "@/components/campaigns/CampaignWorkspaceHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { useCreateCampaign } from "@/queries/useCampaigns";

export const Route = createFileRoute("/_auth/campaigns/new")({
  component: NewCampaign,
});

function NewCampaign() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: currentAgent } = useCurrentAgent();
  const createCampaign = useCreateCampaign();

  return (
    <div className="h-full min-h-0 flex flex-col bg-background text-foreground">
      <CampaignWorkspaceHeader title={t("Crear campaña")} activeStep={1} />
      <CampaignForm
        createdBy={currentAgent?.id}
        layout="workspace"
        loading={createCampaign.isPending}
        secondarySubmitLabel={t("Guardar borrador")}
        submitLabel={t("Revisar y continuar")}
        onSubmit={(input, intent) =>
          createCampaign.mutate(input, {
            onSuccess: (campaign) => {
              void message.success(t("Borrador guardado"));
              if (intent === "review") {
                void navigate({
                  to: "/campaigns/$campaignId/review",
                  params: { campaignId: campaign.id },
                });
              } else {
                void navigate({ to: "/campaigns" });
              }
            },
            onError: () =>
              void message.error(t("No se pudo guardar el borrador")),
          })
        }
      />
    </div>
  );
}
