import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, RefreshCw } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import { WhatsAppBusinessProfile } from "@/routes/_auth/integrations/whatsapp/$orgAddressId/profile";
import { selectWhatsAppManagerAccount } from "@/utils/WhatsAppManagerUtils";

export const Route = createFileRoute("/_auth/whatsapp-manager")({
  component: WhatsAppManager,
});

function WhatsAppManager() {
  const { translate: t } = useTranslation();
  const {
    data: addresses,
    isLoading,
    isError,
    refetch,
  } = useOrganizationsAddresses();
  const account = selectWhatsAppManagerAccount(addresses);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Spinner size={32} />
      </div>
    );
  }

  if (account) {
    return (
      <WhatsAppBusinessProfile orgAddressId={account.address} managerMode />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <SectionHeader title="Gestor de WhatsApp" />
      <div className="border-b border-border px-[18px] md:px-[28px]">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex border-b-2 border-primary px-[2px] py-[11px] text-[13px] font-medium text-primary">
            {t("Perfil comercial")}
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/10">
            <MessageCircle className="h-7 w-7 text-[#25D366]" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">
            {isError
              ? t("No se pudo cargar la cuenta de WhatsApp")
              : t("No hay una cuenta de WhatsApp conectada")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isError
              ? t("Intentá nuevamente o revisá la configuración de WhatsApp.")
              : t("Conectá WhatsApp para administrar tu perfil comercial.")}
          </p>
          {isError ? (
            <button
              type="button"
              className="primary mt-5 inline-flex items-center gap-2 px-4 py-2"
              onClick={() => void refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              {t("Intentar nuevamente")}
            </button>
          ) : (
            <Link
              to="/integrations/whatsapp/new"
              className="primary mt-5 inline-flex px-4 py-2"
            >
              {t("Conectar WhatsApp")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
