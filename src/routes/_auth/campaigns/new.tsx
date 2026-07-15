import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { message } from "antd";
import CampaignForm from "@/components/campaigns/CampaignForm";
import SectionHeader from "@/components/SectionHeader";
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
    <>
      <SectionHeader title={t("Nueva campaña")} />
      <CampaignForm
        createdBy={currentAgent?.id}
        loading={createCampaign.isPending}
        submitLabel={t("Guardar borrador")}
        onSubmit={(input) =>
          createCampaign.mutate(input, {
            onSuccess: (campaign) => {
              void message.success(t("Borrador guardado"));
              void navigate({
                to: "/campaigns/$campaignId",
                params: { campaignId: campaign.id },
                hash: (previous) => previous!,
              });
            },
            onError: () =>
              void message.error(t("No se pudo guardar el borrador")),
          })
        }
      />
    </>
  );
}
