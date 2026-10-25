import Button from "@/components/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useWhatsAppAccountSync } from "@/queries/useWhatsAppAccountSync";
import { accountSyncConfirmed } from "@/utils/WhatsAppAccountSyncUtils";

export default function WhatsAppAccountSync({
  address,
  isOwner,
}: {
  address: string;
  isOwner: boolean;
}) {
  const { translate: t } = useTranslation();
  const { query, retry } = useWhatsAppAccountSync(address);
  if (query.isPending)
    return <p role="status">{t("Comprobando sincronización con Node…")}</p>;
  if (query.isError)
    return (
      <div className="instructions" role="alert">
        <p>{t("No se pudo comprobar la sincronización con Node.")}</p>
        <Button type="button" onClick={() => void query.refetch()}>
          {t("Reintentar")}
        </Button>
      </div>
    );
  if (!query.data) return null;
  const confirmed = accountSyncConfirmed(query.data);
  return (
    <div
      className="instructions space-y-2"
      role={query.data.status === "failed" ? "alert" : "status"}
    >
      <p className="font-medium">
        {confirmed
          ? t("Cuenta sincronizada con Node")
          : query.data.status === "failed"
            ? t("La sincronización con Node falló")
            : t("Sincronización con Node pendiente")}
      </p>
      {!confirmed && (
        <p>
          {t(
            "Node aún no ha confirmado el cambio. Si no está disponible, el estado remoto puede seguir siendo el anterior.",
          )}
        </p>
      )}
      {(query.data.status === "failed" || query.data.last_error) && isOwner && (
        <Button
          type="button"
          disabled={retry.isPending}
          loading={retry.isPending}
          onClick={() => retry.mutate()}
        >
          {t("Reintentar sincronización")}
        </Button>
      )}
      {retry.isError && (
        <p role="alert" className="text-destructive">
          {t("No se pudo reintentar la sincronización.")}
        </p>
      )}
    </div>
  );
}
