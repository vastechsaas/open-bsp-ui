import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { useTranslation } from "@/hooks/useTranslation";
import { InstagramOutlined } from "@ant-design/icons";
import { Link, Plus } from "lucide-react";
import type { JSX } from "react";
import type { InstagramOrganizationAddressExtra } from "@/supabase/client";
import { instagramConnectionState } from "@/utils/InstagramIntegrationUtils";
import Button from "@/components/Button";
import { useCurrentAgent } from "@/queries/useAgents";

export const Route = createFileRoute("/_auth/integrations/instagram/")({
  component: InstagramIndex,
});

function InstagramIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: integrations,
    isPending,
    isError,
    refetch,
  } = useOrganizationsAddresses();
  const { data: currentAgent } = useCurrentAgent();
  const isOwner = currentAgent?.extra?.role === "owner";

  const instagramIntegrations = integrations?.filter(
    (integration) => integration.service === "instagram",
  );

  const statusLabels: Record<string, string | JSX.Element> = {
    connected: <span className="text-primary">{t("Conectado")}</span>,
    disconnected: t("Desconectado"),
    needs_reauth: (
      <span className="text-destructive">{t("Requiere reconexión")}</span>
    ),
  };

  return (
    <>
      <SectionHeader title="Instagram" />

      <SectionBody className="gap-4">
        {isPending && (
          <p className="text-muted-foreground">{t("Cargando...")}</p>
        )}
        {isError && (
          <div role="alert" className="flex flex-col gap-3">
            <p className="text-destructive">
              {t("No se pudieron cargar las cuentas de Instagram.")}
            </p>
            <Button className="secondary w-fit" onClick={() => void refetch()}>
              {t("Reintentar")}
            </Button>
          </div>
        )}
        <div className="flex flex-col">
          <SectionItem
            title={t("Conectar cuenta")}
            disabled={!isOwner}
            disabledReason={t("Requiere permisos de propietario")}
            aside={
              <div className="p-[8px] bg-primary/10 rounded-full">
                <Plus className="w-[24px] h-[24px] text-primary" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/integrations/instagram/new",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          <SectionItem
            title={t("Invitaciones a terceros")}
            aside={
              <div className="p-[8px]">
                <Link className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: "/integrations/instagram/onboarding",
                hash: (prevHash) => prevHash!,
              })
            }
          />
          {instagramIntegrations?.map((integration) => {
            const extra =
              integration.extra as InstagramOrganizationAddressExtra | null;
            const title = extra?.username
              ? `@${extra.username}`
              : extra?.name || integration.address;
            return (
              <SectionItem
                key={integration.address}
                aside={
                  <div className="p-[8px]">
                    <InstagramOutlined
                      style={{ fontSize: "24px", color: "#E1306C" }}
                    />
                  </div>
                }
                title={title}
                description={
                  statusLabels[
                    instagramConnectionState({
                      status: integration.status,
                      extra,
                    })
                  ]
                }
                onClick={() =>
                  navigate({
                    to: "/integrations/instagram/$orgAddressId",
                    params: { orgAddressId: integration.address },
                    hash: (prevHash) => prevHash!,
                  })
                }
              />
            );
          })}
        </div>
      </SectionBody>
    </>
  );
}
