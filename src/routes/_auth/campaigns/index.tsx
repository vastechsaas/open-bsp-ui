import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";
import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CampaignAudienceType,
  useCampaigns,
} from "@/queries/useCampaigns";

export const Route = createFileRoute("/_auth/campaigns/")({
  component: CampaignList,
});

function CampaignList() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: campaigns } = useCampaigns();
  const audienceLabels: Record<CampaignAudienceType, string> = {
    all_contacts: t("Todos los contactos"),
    active_24h: t("Activos en las últimas 24 horas"),
    csv_upload: t("Archivo CSV"),
  };

  return (
    <>
      <SectionHeader title={t("Campañas")} />
      <SectionBody>
        <SectionItem
          title={t("Crear campaña")}
          aside={
            <div className="p-[8px] bg-primary/10 rounded-full">
              <Plus className="w-[24px] h-[24px] text-primary" />
            </div>
          }
          onClick={() =>
            navigate({ to: "/campaigns/new", hash: (previous) => previous! })
          }
        />
        {campaigns?.map((campaign) => (
          <SectionItem
            key={campaign.id}
            title={campaign.name}
            description={`${t("Borrador")} · ${audienceLabels[campaign.audience_type]}`}
            aside={
              <div className="p-[8px]">
                <Megaphone className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/campaigns/$campaignId",
                params: { campaignId: campaign.id },
                hash: (previous) => previous!,
              })
            }
          />
        ))}
        {campaigns?.length === 0 && (
          <div className="py-[32px] text-center text-muted-foreground text-[14px]">
            {t("Todavía no hay campañas")}
          </div>
        )}
      </SectionBody>
    </>
  );
}
