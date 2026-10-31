import { useState } from "react";
import {
  useCampaignPolicy,
  useCampaignSendingState,
  useCancelCampaign,
} from "@/queries/useCampaignPolicy";
import type { CampaignRow } from "@/queries/useCampaigns";
import { useTranslation } from "@/hooks/useTranslation";
import { campaignWaitingLabels } from "@/utils/CampaignPolicyUtils";

export default function CampaignSendingSummary({
  campaign,
}: {
  campaign: CampaignRow;
}) {
  const { translate: t } = useTranslation();
  const policy = useCampaignPolicy();
  const active = campaign.queued_count + campaign.processing_count > 0;
  const state = useCampaignSendingState(
    campaign.id,
    campaign.status !== "draft" && active,
  );
  const cancel = useCancelCampaign();
  const [confirm, setConfirm] = useState(false);
  const date = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: campaign.schedule_timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  return (
    <section className="campaign-review-card space-y-3 text-sm">
      <h2 className="font-medium">{t("Programación y envío")}</h2>
      <p>
        {t("Zona horaria")}: {campaign.schedule_timezone}
      </p>
      <p>
        {t("Fecha y hora de inicio")}:{" "}
        {campaign.scheduled_start_at
          ? date(campaign.scheduled_start_at)
          : t("Enviar ahora")}
      </p>
      {campaign.send_window_start && (
        <p>
          {t("Horario diario")}: {campaign.send_window_start.slice(0, 5)}–
          {campaign.send_window_end?.slice(0, 5)}
        </p>
      )}
      {campaign.expires_at && (
        <p>
          {t("Dejar de enviar después de")}: {date(campaign.expires_at)}
        </p>
      )}
      {policy.data?.enabled && (
        <>
          <p>
            {t("Cupo diario compartido")}: {policy.data.used} /{" "}
            {policy.data.daily_limit} · {t("Disponible")}:{" "}
            {policy.data.remaining}
          </p>
          <p className="text-muted-foreground">
            {t("Zona horaria del cupo diario")}: {policy.data.budget_timezone}
          </p>
        </>
      )}
      {(policy.isError || state.isError) && (
        <p role="alert">
          {t("No se pudo actualizar el estado de envío.")}{" "}
          <button
            className="underline"
            onClick={() => {
              void policy.refetch();
              void state.refetch();
            }}
          >
            {t("Reintentar")}
          </button>
        </p>
      )}
      {!!state.data?.waiting_count && (
        <p role="status">
          {t("Destinatarios en espera")}: {state.data.waiting_count} ·{" "}
          {t(
            campaignWaitingLabels[state.data.reason ?? ""] ??
              "Esperando la política de envío",
          )}
          {state.data.next_at && (
            <>
              {" "}
              · {t("Próximo envío elegible")}: {date(state.data.next_at)}
            </>
          )}
        </p>
      )}
      {!!campaign.expired_count && (
        <p>
          {t("No enviados por vencimiento")}: {campaign.expired_count}
        </p>
      )}
      {!!campaign.cancelled_count && (
        <p>
          {t("No enviados por cancelación")}: {campaign.cancelled_count}
        </p>
      )}
      <p className="text-muted-foreground">
        {t(
          "Al agotar el cupo, los envíos esperan y continúan automáticamente cuando el horario y los límites lo permitan. Nunca después del vencimiento.",
        )}
      </p>
      {active &&
        campaign.dispatch_transport === "cloudamqp" &&
        !campaign.cancelled_at && (
          <button
            disabled={cancel.isPending}
            className="rounded-lg border border-destructive/50 px-3 py-2 text-destructive disabled:opacity-50"
            onClick={() => setConfirm(true)}
          >
            {t("Cancelar envíos pendientes")}
          </button>
        )}
      {campaign.cancelled_at && active && (
        <p role="status">
          {t(
            "Deteniendo envíos pendientes. Los mensajes ya enviados no se retiran.",
          )}
        </p>
      )}
      {cancel.isError && (
        <p role="alert" className="text-destructive">
          {t("No se pudo confirmar la cancelación.")}{" "}
          <button
            className="underline"
            onClick={() => cancel.mutate(campaign.id)}
          >
            {t("Reintentar")}
          </button>
        </p>
      )}
      {confirm && (
        <div
          role="alertdialog"
          aria-label={t("Cancelar envíos pendientes")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="max-w-md space-y-4 rounded-xl border border-border bg-background p-6">
            <p>
              {t(
                "Se detendrán los mensajes no enviados. Los envíos aceptados o en curso no se pueden retirar.",
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                disabled={cancel.isPending}
                onClick={() => setConfirm(false)}
              >
                {t("Volver")}
              </button>
              <button
                className="rounded-lg bg-destructive px-3 py-2 text-white disabled:opacity-50"
                disabled={cancel.isPending}
                onClick={() =>
                  cancel.mutate(campaign.id, {
                    onSuccess: () => setConfirm(false),
                  })
                }
              >
                {cancel.isPending
                  ? t("Guardando…")
                  : t("Confirmar cancelación")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
