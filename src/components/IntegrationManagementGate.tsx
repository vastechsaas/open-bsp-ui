import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useIntegrationAvailability } from "@/queries/useIntegrationAvailability";
import { integrationEnabled } from "@/utils/IntegrationAvailabilityUtils";
import { useTranslation } from "@/hooks/useTranslation";
import Spinner from "./Spinner";

export function IntegrationAvailabilityStatus() {
  const query = useIntegrationAvailability();
  const { translate: t } = useTranslation();
  if (query.isError)
    return (
      <div role="alert" className="space-y-3 p-6">
        <p>
          {t("No se pudo comprobar la disponibilidad de las integraciones.")}
        </p>
        <button className="underline" onClick={() => void query.refetch()}>
          {t("Reintentar")}
        </button>
      </div>
    );
  return (
    <div role="status" className="flex items-center gap-3 p-6">
      <Spinner size={20} />
      {t("Cargando integraciones…")}
    </div>
  );
}

export default function IntegrationManagementGate({
  integration,
  children,
}: {
  integration: string;
  children: ReactNode;
}) {
  const query = useIntegrationAvailability();
  const { translate: t } = useTranslation();
  if (!query.isSuccess) return <IntegrationAvailabilityStatus />;
  if (!integrationEnabled(query.data, integration))
    return (
      <div role="alert" className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">
          {t("Integración no disponible")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "El superadministrador deshabilitó la administración de esta integración. Las conexiones y los mensajes existentes continúan funcionando.",
          )}
        </p>
        <Link className="text-primary underline" to="/integrations">
          {t("Volver a integraciones")}
        </Link>
      </div>
    );
  return children;
}
