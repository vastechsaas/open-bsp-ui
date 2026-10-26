import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
// import { FileText } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { InstagramOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useIntegrationAvailability } from "@/queries/useIntegrationAvailability";
import { integrationEnabled } from "@/utils/IntegrationAvailabilityUtils";
import { IntegrationAvailabilityStatus } from "@/components/IntegrationManagementGate";

export const Route = createFileRoute("/_auth/integrations/")({
  component: IntegrationsIndex,
});

function IntegrationsIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const availability = useIntegrationAvailability();

  return (
    <>
      <SectionHeader title={t("Integraciones")} />
      <SectionBody className="gap-4">
        {!availability.isSuccess ? (
          <IntegrationAvailabilityStatus />
        ) : (
          <>
            <div className="flex flex-col">
              {integrationEnabled(availability.data, "whatsapp") && (
                <SectionItem
                  aside={
                    <div className="p-[8px]">
                      <WhatsAppOutlined
                        style={{ fontSize: "24px", color: "#25D366" }}
                      />
                    </div>
                  }
                  title="WhatsApp"
                  onClick={() =>
                    navigate({
                      to: "/integrations/whatsapp",
                      hash: (prevHash) => prevHash!,
                    })
                  }
                />
              )}
              {integrationEnabled(availability.data, "instagram") && (
                <SectionItem
                  aside={
                    <div className="p-[8px]">
                      <InstagramOutlined
                        style={{ fontSize: "24px", color: "#E1306C" }}
                      />
                    </div>
                  }
                  title="Instagram"
                  onClick={() =>
                    navigate({
                      to: "/integrations/instagram",
                      hash: (prevHash) => prevHash!,
                    })
                  }
                />
              )}
              {/* Media pre-processing is intentionally hidden for this deployment.
          <SectionItem
            aside={
              <div className="p-[8px]">
                <FileText className="w-[24px] h-[24px]" />
              </div>
            }
            title={t("Pre-procesamiento de media")}
            description={t("Interpreta audios, imágenes y documentos")}
            onClick={() =>
              navigate({
                to: "/integrations/media-preprocessing",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          */}
            </div>
            {!availability.data.integrations.some((item) => item.enabled) && (
              <p className="p-4 text-sm text-muted-foreground">
                {t("No hay integraciones habilitadas para esta organización.")}
              </p>
            )}
          </>
        )}
      </SectionBody>
    </>
  );
}
