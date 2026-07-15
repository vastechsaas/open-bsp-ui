import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Users } from "lucide-react";
import CampaignWorkspaceHeader from "@/components/campaigns/CampaignWorkspaceHeader";
import Spinner from "@/components/Spinner";
import TemplatePreview from "@/components/TemplatePreview";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CampaignAudienceType,
  useCampaign,
  useCampaignAudienceCount,
  useCampaignAudiencePreview,
} from "@/queries/useCampaigns";
import type { Json, TemplateData } from "@/supabase/client";
import {
  getCampaignReadiness,
  getTemplateVariables,
} from "@/utils/CampaignUtils";
import { formatPhoneNumber } from "@/utils/FormatUtils";

export const Route = createFileRoute("/_auth/campaigns/$campaignId/review")({
  component: ReviewCampaign,
});

function asRecord(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function ReviewCampaign() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { campaignId } = Route.useParams();
  const { data: campaign, isLoading, isError } = useCampaign(campaignId);
  const {
    data: audienceCount,
    isLoading: countLoading,
    isError: countError,
  } = useCampaignAudienceCount(campaignId);
  const { data: preview } = useCampaignAudiencePreview(campaignId);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        {t("No se pudo cargar la campaña")}
      </div>
    );
  }

  const template = campaign.template as unknown as TemplateData;
  const mapping = asRecord(campaign.template_variable_mapping);
  const variables = getTemplateVariables(template);
  const audienceLabels: Record<CampaignAudienceType, string> = {
    all_contacts: t("Todos los contactos"),
    active_24h: t("Activos en las últimas 24 horas"),
    csv_upload: t("Archivo CSV"),
  };
  const readiness = getCampaignReadiness({
    mapping,
    audienceCount: countLoading ? undefined : audienceCount,
    template,
    audienceUnavailable: countError,
  });
  const ready = readiness === "ready";

  return (
    <div className="h-full min-h-0 flex flex-col bg-background">
      <CampaignWorkspaceHeader title={t("Revisar campaña")} activeStep={2} />

      <div className="flex-1 min-h-0 overflow-y-auto bg-muted/30 p-[16px] md:p-[24px]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-[16px]">
          <div className="flex flex-col gap-[16px] min-w-0">
            <section className="campaign-review-card">
              <div className="flex items-start justify-between gap-[16px]">
                <div>
                  <div className="text-[12px] text-muted-foreground">
                    {t("Campaña")}
                  </div>
                  <h2 className="text-[20px] font-semibold mt-[3px]">
                    {campaign.name}
                  </h2>
                </div>
                <span className="px-[10px] py-[5px] rounded-full bg-muted text-[11px]">
                  {t("Borrador")}
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-[14px] mt-[20px]">
                <SummaryField
                  label={t("Cuenta de WhatsApp")}
                  value={formatPhoneNumber(campaign.organization_address)}
                />
                <SummaryField
                  label={t("Plantilla")}
                  value={`${template.name} · ${template.language}`}
                />
                <SummaryField
                  label={t("Audiencia")}
                  value={audienceLabels[campaign.audience_type]}
                />
              </div>
            </section>

            <section className="campaign-review-card">
              <h2 className="font-medium">{t("Mapeo de variables")}</h2>
              {variables.length ? (
                <div className="grid sm:grid-cols-2 gap-[10px] mt-[14px]">
                  {variables.map((variable) => (
                    <div
                      key={variable.key}
                      className="rounded-lg border border-border p-[12px] flex items-center justify-between gap-[12px]"
                    >
                      <span className="text-[12px] text-muted-foreground">
                        {variable.section === "header"
                          ? t("Encabezado")
                          : t("Mensaje")}{" "}
                        {`{{${variable.index}}}`}
                      </span>
                      <span className="text-[12px] font-medium">
                        {mapping[variable.key] || t("Sin configurar")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-muted-foreground mt-[8px]">
                  {t("Esta plantilla no requiere variables.")}
                </div>
              )}
            </section>

            <section className="campaign-review-card">
              <div className="flex items-center gap-[9px]">
                {ready ? (
                  <CheckCircle2 className="w-[20px] h-[20px] text-green-500" />
                ) : (
                  <AlertCircle className="w-[20px] h-[20px] text-amber-500" />
                )}
                <h2 className="font-medium">
                  {ready
                    ? t("La campaña está lista para revisar")
                    : t("La campaña requiere atención")}
                </h2>
              </div>
              <p className="text-[12px] text-muted-foreground mt-[8px]">
                {t(
                  "La ejecución se habilitará cuando se implemente la siguiente fase del backend.",
                )}
              </p>
            </section>
          </div>

          <aside className="flex flex-col gap-[16px] min-w-0">
            <section className="campaign-review-card overflow-hidden">
              <h2 className="font-medium mb-[14px]">
                {t("Vista previa de la plantilla")}
              </h2>
              <div className="rounded-xl bg-chat py-[16px] min-h-[240px]">
                <TemplatePreview template={template} editMode />
              </div>
            </section>

            <section className="campaign-review-card">
              <div className="flex items-center gap-[8px] font-medium">
                <Users className="w-[18px] h-[18px]" />
                {t("Resumen de audiencia")}
              </div>
              <div className="text-[30px] font-semibold mt-[10px]">
                {countLoading ? "—" : (audienceCount || 0).toLocaleString()}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {t("destinatarios")}
              </div>
              {!!preview?.length && (
                <div className="border-t border-border mt-[14px] pt-[10px]">
                  <div className="text-[12px] text-muted-foreground mb-[5px]">
                    {t("Vista previa de destinatarios")}
                  </div>
                  {preview.slice(0, 5).map((recipient) => (
                    <div
                      key={recipient.contact_address}
                      className="flex justify-between gap-[8px] py-[4px] text-[12px]"
                    >
                      <span className="truncate">
                        {recipient.name || t("Sin nombre")}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {recipient.contact_address}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      <footer className="border-t border-border bg-background px-[16px] md:px-[32px] py-[14px] flex flex-col sm:flex-row sm:items-center gap-[10px]">
        <div className="text-[12px] text-muted-foreground sm:mr-auto">
          {t("Revisá la audiencia y el mensaje antes de ejecutar.")}
        </div>
        <button
          className="px-[22px] py-[10px] border border-border rounded-lg"
          onClick={() =>
            void navigate({
              to: "/campaigns/$campaignId",
              params: { campaignId },
            })
          }
        >
          {t("Volver a configuración")}
        </button>
        <button
          className="primary px-[28px] py-[10px] disabled:opacity-50"
          disabled
          title={t("La ejecución estará disponible en la próxima fase")}
        >
          {t("Ejecutar campaña")}
        </button>
      </footer>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-[12px]">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-[13px] font-medium mt-[4px] break-words">
        {value}
      </div>
    </div>
  );
}
