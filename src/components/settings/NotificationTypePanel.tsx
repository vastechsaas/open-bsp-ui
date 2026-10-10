import { Bell } from "lucide-react";
import Spinner from "@/components/Spinner";
import Switch from "@/components/Switch";
import { useTranslation } from "@/hooks/useTranslation";
import type { NotificationPreference } from "@/queries/useNotificationPreferences";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/utils/NotificationPreferenceUtils";

type Props = {
  preferences?: NotificationPreference[];
  loading: boolean;
  error: boolean;
  savingType?: NotificationType;
  saveError: boolean;
  saved: boolean;
  onRetry: () => void;
  onRetrySave: () => void;
  onChange: (type: NotificationType, enabled: boolean) => void;
};

export default function NotificationTypePanel({
  preferences,
  loading,
  error,
  savingType,
  saveError,
  saved,
  onRetry,
  onRetrySave,
  onChange,
}: Props) {
  const { translate: t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-5 sm:px-6">
        <h2 className="text-xl font-semibold">{t("Preferencias")}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t("Configuración general de tu organización.")}
        </p>
      </header>
      <section
        className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"
        aria-busy={loading || !!savingType}
      >
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Bell className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-[15px] font-semibold">
            {t("Tipo de notificación")}
          </h3>
        </div>
        <p className="mt-3 max-w-2xl text-[12px] leading-5 text-muted-foreground">
          {t(
            "Elegí qué notificaciones reciben los usuarios de esta organización. Los cambios se guardan automáticamente y solo afectan las notificaciones futuras.",
          )}
        </p>
        {loading ? (
          <div
            className="flex h-32 items-center justify-center"
            role="status"
            aria-label={t("Cargando preferencias...")}
          >
            <Spinner />
          </div>
        ) : error ||
          !preferences ||
          preferences.length !== NOTIFICATION_TYPES.length ? (
          <div role="alert" className="py-6 text-[13px] text-destructive">
            <p>{t("No se pudieron cargar las preferencias.")}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("Reintentar")}
            </button>
          </div>
        ) : (
          NOTIFICATION_TYPES.map(({ type, label, description }) => {
            const preference = preferences.find(
              (item) => item.notification_type === type,
            );
            return (
              <div
                key={type}
                className="flex items-start justify-between gap-5 border-b border-border py-5"
              >
                <div className="min-w-0 max-w-2xl">
                  <label
                    htmlFor={`notification-${type}`}
                    className="text-[14px] font-medium text-foreground"
                  >
                    {t(label)}
                  </label>
                  <p
                    id={`notification-${type}-description`}
                    className="mt-1.5 text-[12px] leading-5 text-muted-foreground"
                  >
                    {t(description)}
                  </p>
                  {savingType === type && (
                    <p role="status" className="mt-2 text-[11px] text-primary">
                      {t("Guardando…")}
                    </p>
                  )}
                </div>
                <Switch
                  id={`notification-${type}`}
                  role="switch"
                  aria-label={t(label)}
                  aria-describedby={`notification-${type}-description`}
                  checked={preference?.enabled ?? false}
                  disabled={!!savingType || !preference}
                  onCheckedChange={(enabled) => onChange(type, enabled)}
                  className="mt-1 shrink-0 rounded-full focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-background"
                />
              </div>
            );
          })
        )}
        {saveError && (
          <div role="alert" className="mt-4 text-[13px] text-destructive">
            <p>
              {t(
                "No se pudo guardar la preferencia. Revisá la conexión o tus permisos.",
              )}
            </p>
            <button
              type="button"
              onClick={onRetrySave}
              className="mt-3 rounded-lg border border-border px-4 py-2 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("Reintentar")}
            </button>
          </div>
        )}
        {saved && !saveError && (
          <p role="status" className="mt-4 text-[12px] text-muted-foreground">
            {t("Preferencia guardada.")}
          </p>
        )}
      </section>
    </div>
  );
}
