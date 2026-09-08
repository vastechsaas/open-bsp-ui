import { ContactRound, Route } from "lucide-react";
import Spinner from "@/components/Spinner";
import Switch from "@/components/Switch";
import { useTranslation } from "@/hooks/useTranslation";

type OrganizationAutomationPanelProps = {
  enabled?: boolean;
  loading: boolean;
  error: boolean;
  saving: boolean;
  onChange: (enabled: boolean) => void;
  autoAssignmentEnabled?: boolean;
  autoAssignmentSaving: boolean;
  onAutoAssignmentChange: (enabled: boolean) => void;
  platform?: boolean;
};

export default function OrganizationAutomationPanel({
  enabled,
  loading,
  error,
  saving,
  onChange,
  autoAssignmentEnabled,
  autoAssignmentSaving,
  onAutoAssignmentChange,
  platform = false,
}: OrganizationAutomationPanelProps) {
  const { translate: t } = useTranslation();

  return (
    <div className={platform ? "" : "flex h-full min-h-0 flex-col"}>
      <header
        className={
          platform
            ? "border-b border-border pb-5"
            : "border-b border-border px-5 py-5 sm:px-6"
        }
      >
        <h2 className="text-xl font-semibold">{t("Automatización")}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("Controlá los comportamientos automáticos de esta organización.")}
        </p>
      </header>

      <section className={platform ? "pt-5" : "p-5 sm:p-6"}>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <ContactRound className="h-4 w-4 text-primary" />
          <h3 className="text-[15px] font-semibold">{t("Contactos")}</h3>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : error || enabled === undefined ? (
          <div className="py-8 text-[13px] text-destructive">
            {t("No se pudo cargar la configuración de automatización.")}
          </div>
        ) : (
          <div className="flex flex-col gap-4 border-b border-border py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <label
                htmlFor={
                  platform
                    ? "platform-auto-save-whatsapp-contacts"
                    : "auto-save-whatsapp-contacts"
                }
                className="text-[14px] font-medium text-foreground"
              >
                {t("Guardar automáticamente nuevos contactos de WhatsApp")}
              </label>
              <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                {t(
                  "Al desactivarlo, solo los nuevos clientes de WhatsApp dejarán de guardarse como contactos. Los contactos existentes nunca se eliminan y volver a activarlo no completa clientes anteriores.",
                )}
              </p>
              {saving && (
                <p className="mt-2 text-[11px] text-primary">
                  {t("Guardando…")}
                </p>
              )}
            </div>
            <Switch
              id={
                platform
                  ? "platform-auto-save-whatsapp-contacts"
                  : "auto-save-whatsapp-contacts"
              }
              aria-label={t(
                "Guardar automáticamente nuevos contactos de WhatsApp",
              )}
              checked={enabled}
              disabled={saving}
              onCheckedChange={onChange}
              className="mt-1 shrink-0"
            />
          </div>
        )}

        {!loading && !error && autoAssignmentEnabled !== undefined && (
          <div className="mt-7">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Route className="h-4 w-4 text-primary" />
              <h3 className="text-[15px] font-semibold">
                {t("Asignación de conversaciones")}
              </h3>
            </div>
            <div className="flex flex-col gap-4 border-b border-border py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <label
                  htmlFor={
                    platform ? "platform-auto-assignment" : "auto-assignment"
                  }
                  className="text-[14px] font-medium"
                >
                  {t("Asignar automáticamente conversaciones en cola")}
                </label>
                <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                  {t(
                    "Solo se asignan conversaciones activas en colas configuradas con Round Robin y a agentes disponibles.",
                  )}
                </p>
                {autoAssignmentSaving && (
                  <p className="mt-2 text-[11px] text-primary">
                    {t("Guardando…")}
                  </p>
                )}
              </div>
              <Switch
                id={platform ? "platform-auto-assignment" : "auto-assignment"}
                checked={autoAssignmentEnabled}
                disabled={autoAssignmentSaving}
                onCheckedChange={onAutoAssignmentChange}
                className="mt-1 shrink-0"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
