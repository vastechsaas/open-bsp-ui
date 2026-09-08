import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { message as toast } from "antd";
import { ArrowLeft, RefreshCw, TestTube2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { queryKeys } from "@/queries/queryKeys";
import {
  runPlatformWhatsAppHealthAction,
  usePlatformWhatsAppHealth,
} from "@/queries/usePlatformWhatsAppHealth";
import {
  isWhatsAppHealthCheckStale,
  type WhatsAppHealthAction,
} from "@/utils/PlatformWhatsAppHealthUtils";
import { formatDate, healthLabel } from "./PlatformWhatsAppHealth";
import PlatformWhatsAppHealthStatus from "./PlatformWhatsAppHealthStatus";

export default function PlatformWhatsAppHealthDetail({
  organizationId,
  phoneNumberId,
}: {
  organizationId: string;
  phoneNumberId: string;
}) {
  const { translate: t } = useTranslation();
  const queryClient = useQueryClient();
  const health = usePlatformWhatsAppHealth(organizationId, phoneNumberId);
  const [action, setAction] = useState<WhatsAppHealthAction | null>(null);
  const activeController = useRef<AbortController | null>(null);
  const autoChecked = useRef(false);

  useEffect(() => {
    autoChecked.current = false;
    activeController.current?.abort();
    return () => activeController.current?.abort();
  }, [organizationId, phoneNumberId]);

  const runAction = useCallback(
    async (nextAction: WhatsAppHealthAction, automatic = false) => {
      activeController.current?.abort();
      const controller = new AbortController();
      activeController.current = controller;
      setAction(nextAction);
      try {
        const result = await runPlatformWhatsAppHealthAction({
          organizationId,
          phoneNumberId,
          action: nextAction,
          signal: controller.signal,
        });
        if (!automatic)
          void toast.success(result.message || t("Accion completada"));
        await queryClient.invalidateQueries({
          queryKey: queryKeys.platform.whatsappHealth(organizationId),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!automatic) {
          void toast.error(
            error instanceof Error
              ? error.message
              : t("No se pudo completar la accion"),
          );
        }
      } finally {
        if (activeController.current === controller) {
          activeController.current = null;
          setAction(null);
        }
      }
    },
    [organizationId, phoneNumberId, queryClient, t],
  );

  useEffect(() => {
    if (!health.data || autoChecked.current) return;
    if (
      !isWhatsAppHealthCheckStale(
        health.data.connection_status,
        health.data.last_check_attempted_at,
      )
    ) {
      return;
    }
    autoChecked.current = true;
    void runAction("test_connection", true);
  }, [health.data, runAction]);

  if (health.isPending) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (health.isError || !health.data) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-destructive">
          {t("No se pudo cargar la cuenta de WhatsApp")}
        </p>
        <Link
          to="/platform/$organizationId/waba-health"
          params={{ organizationId }}
          className="rounded-lg border border-border px-4 py-2 text-[12px] hover:bg-muted"
        >
          {t("Volver a WABA Health")}
        </Link>
      </div>
    );
  }

  const row = health.data;
  const templates = Object.entries(row.template_status_summary ?? {});

  return (
    <div>
      <Link
        to="/platform/$organizationId/waba-health"
        params={{ organizationId }}
        className="inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Volver a WABA Health")}
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">{row.display_name}</h2>
            <PlatformWhatsAppHealthStatus
              status={row.health_status}
              label={healthLabel(row.health_status, t)}
              checking={action === "test_connection"}
            />
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {row.phone_number_id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:ml-auto">
          <ActionButton
            label={t("Probar conexion")}
            busy={action === "test_connection"}
            disabled={!!action}
            icon={<TestTube2 className="h-4 w-4" />}
            onClick={() => void runAction("test_connection")}
          />
          <ActionButton
            label={t("Actualizar informacion")}
            busy={action === "refresh_account"}
            disabled={!!action}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void runAction("refresh_account")}
          />
          <ActionButton
            label={t("Sincronizar plantillas")}
            busy={action === "sync_templates"}
            disabled={!!action}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void runAction("sync_templates")}
          />
        </div>
      </header>

      <Section title={t("Identificadores de Meta")}>
        <Fields
          values={[
            [t("Business Account ID"), row.business_id],
            [t("WABA ID"), row.waba_id],
            [t("Phone Number ID"), row.phone_number_id],
            [t("App ID"), row.application_id],
          ]}
        />
      </Section>
      <Section title={t("Telefono")}>
        <Fields
          values={[
            [t("Nombre visible"), row.display_name],
            [t("Numero visible"), row.display_phone],
            [t("Estado del telefono"), row.phone_number_status],
            [t("Estado de conexion"), row.connection_status],
          ]}
        />
      </Section>
      <Section title={t("Webhook")}>
        <Fields
          values={[
            [t("Suscripcion"), row.webhook_status],
            [
              t("Ultimo webhook recibido"),
              formatDate(row.last_webhook_received_at),
            ],
            [
              t("Ultimo webhook procesado"),
              formatDate(row.last_webhook_succeeded_at),
            ],
            [t("Errores en 24 horas"), String(row.webhook_error_count_24h)],
          ]}
        />
      </Section>
      <Section title={t("Token")}>
        <Fields
          values={[
            [t("Estado"), row.token_status],
            [t("Ultima validacion"), formatDate(row.token_validated_at)],
            [t("Expiracion"), formatDate(row.token_expires_at)],
            [t("Ultima comprobacion"), formatDate(row.last_check_attempted_at)],
          ]}
        />
      </Section>
      <Section title={t("Mensajeria")}>
        <Fields
          values={[
            [t("Calidad"), row.quality_rating],
            [t("Limite de mensajeria"), row.messaging_limit_tier],
            [
              t("Ultimo mensaje recibido"),
              formatDate(row.last_incoming_message_at),
            ],
            [
              t("Ultimo mensaje enviado"),
              formatDate(row.last_outgoing_message_at),
            ],
          ]}
        />
      </Section>
      <Section title={t("Plantillas")}>
        {templates.length === 0 ? (
          <p className="py-3 text-[13px] text-muted-foreground">
            {t("No hay plantillas sincronizadas")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 py-3">
            {templates.map(([templateStatus, count]) => (
              <span
                key={templateStatus}
                className="rounded-full border border-border px-3 py-1.5 text-[12px]"
              >
                {templateStatus}: {String(count)}
              </span>
            ))}
          </div>
        )}
      </Section>
      <Section title={t("Errores recientes")} last>
        {row.failure_code || row.failure_message ? (
          <Fields
            values={[
              [t("Codigo"), row.failure_code],
              [t("Explicacion"), row.failure_message],
              [t("Ultimo error"), formatDate(row.last_webhook_error_at)],
            ]}
          />
        ) : (
          <p className="py-3 text-[13px] text-muted-foreground">
            {t("No hay errores operativos recientes")}
          </p>
        )}
      </Section>
    </div>
  );
}

function ActionButton({
  label,
  busy,
  disabled,
  icon,
  onClick,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-[12px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Spinner size={14} /> : icon}
      {label}
    </button>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={`py-5 ${last ? "" : "border-b border-border"}`}>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fields({
  values,
}: {
  values: Array<[string, string | number | bigint | null | undefined]>;
}) {
  return (
    <dl className="mt-2 divide-y divide-border">
      {values.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 py-3 text-[13px] sm:grid-cols-[220px_minmax(0,1fr)]"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-all font-medium">{String(value ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}
