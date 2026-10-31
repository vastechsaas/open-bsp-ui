import { useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import Switch from "@/components/Switch";
import TimezoneSelect from "@/components/settings/BusinessHoursTimezoneSelect";
import { useTranslation } from "@/hooks/useTranslation";
import {
  usePlatformCampaignPolicy,
  useSaveCampaignPolicy,
} from "@/queries/useCampaignPolicy";
import type { CampaignPolicy } from "@/utils/CampaignPolicyUtils";

export default function PlatformCampaignPolicy({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const query = usePlatformCampaignPolicy(organizationId);
  if (query.isPending)
    return <p className="p-6">{t("Cargando política de campañas…")}</p>;
  if (query.isError || !query.data)
    return (
      <div role="alert" className="space-y-3 p-6">
        <p>{t("No se pudo cargar la política de campañas.")}</p>
        <button className="underline" onClick={() => void query.refetch()}>
          {t("Reintentar")}
        </button>
      </div>
    );
  return (
    <PolicyForm
      key={`${organizationId}:${query.data.revision}`}
      organizationId={organizationId}
      initial={query.data}
      reload={() => void query.refetch()}
    />
  );
}
function PolicyForm({
  organizationId,
  initial,
  reload,
}: {
  organizationId: string;
  initial: CampaignPolicy;
  reload: () => void;
}) {
  const { translate: t } = useTranslation();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [zone, setZone] = useState(initial.budget_timezone);
  const [daily, setDaily] = useState(initial.daily_limit?.toString() ?? "");
  const [rate, setRate] = useState(
    initial.max_sends_per_minute?.toString() ?? "",
  );
  const [recipient, setRecipient] = useState(
    initial.recipient_cap?.toString() ?? "",
  );
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const save = useSaveCampaignPolicy(organizationId);
  const policy = {
    enabled,
    budget_timezone: zone,
    daily_limit: daily ? Number(daily) : null,
    max_sends_per_minute: rate ? Number(rate) : null,
    recipient_cap: recipient ? Number(recipient) : null,
  };
  const dirty =
    enabled !== initial.enabled ||
    zone !== initial.budget_timezone ||
    policy.daily_limit !== initial.daily_limit ||
    policy.max_sends_per_minute !== initial.max_sends_per_minute ||
    policy.recipient_cap !== initial.recipient_cap;
  const error = save.error as { code?: string; message?: string } | null;
  const conflict = error?.code === "40001";
  const valid =
    !enabled ||
    ([daily, rate, recipient].every((n) => /^[1-9]\d*$/.test(n)) &&
      Number(daily) <= 999999999 &&
      Number(rate) <= 60000 &&
      Number(recipient) <= 999999);
  const blocked = save.isPending || conflict;
  const change = () => {
    setRequestId(crypto.randomUUID());
    save.reset();
  };
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || save.isPending,
    enableBeforeUnload: dirty || save.isPending,
    disabled: !dirty && !save.isPending,
    withResolver: true,
  });
  const errorLabel = conflict
    ? "La política cambió. Recargá antes de guardar."
    : error?.message?.includes("Drain or reconcile")
      ? "Esperá a que terminen los envíos activos antes de cambiar la aplicación de límites."
      : error?.message?.includes("48 hours")
        ? "La zona del cupo no puede cambiar durante 48 horas después de enviar."
        : error?.message?.includes("CloudAMQP")
          ? "El procesamiento CloudAMQP debe estar habilitado primero."
          : "No se pudo guardar la política de campañas.";
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold">{t("Controles de campañas")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Los límites se comparten entre campañas. No aumentan los límites de Meta ni incluyen respuestas de agentes o chatbots.",
          )}
        </p>
      </header>
      {!initial.cloudamqp_enabled && (
        <p className="rounded-lg border border-border p-3 text-sm">
          {t("El procesamiento CloudAMQP debe estar habilitado primero.")}
        </p>
      )}
      <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
        <span>{t("Aplicar política de envío")}</span>
        <Switch
          checked={enabled}
          disabled={blocked || (!initial.cloudamqp_enabled && !enabled)}
          onCheckedChange={(value) => {
            setEnabled(value);
            change();
          }}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            key: "daily",
            label: "Cupo diario de mensajes",
            value: daily,
            set: setDaily,
            max: 999999999,
          },
          {
            key: "rate",
            label: "Máximo de envíos por minuto por número",
            value: rate,
            set: setRate,
            max: 60000,
          },
          {
            key: "recipient",
            label: "Máximo por destinatario cada 24 horas",
            value: recipient,
            set: setRecipient,
            max: 999999,
          },
        ].map((field) => (
          <label key={field.key} className="space-y-2 text-sm">
            <span className="block">{t(field.label)}</span>
            <input
              type="number"
              min={1}
              max={field.max}
              step={1}
              value={field.value}
              disabled={blocked || !enabled}
              onChange={(event) => {
                field.set(event.target.value);
                change();
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 disabled:opacity-50"
            />
          </label>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">
          {t("Zona horaria del cupo diario")}
        </p>
        <TimezoneSelect
          value={zone}
          onChange={(value) => {
            setZone(value);
            change();
          }}
          disabled={blocked || !enabled}
          translate={t}
          helpText={t(
            "El cupo se renueva a medianoche en esta zona. La zona de cada campaña no cambia el cupo.",
          )}
        />
      </div>
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        {t(
          "Al agotar el cupo, los envíos esperan y continúan automáticamente cuando el horario y los límites lo permitan. Nunca después del vencimiento.",
        )}
      </p>
      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          {t("Ingresá límites enteros positivos dentro del rango permitido.")}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(errorLabel)}{" "}
          {conflict && (
            <button className="underline" onClick={reload}>
              {t("Recargar")}
            </button>
          )}
        </p>
      )}
      <div className="flex justify-end">
        <button
          disabled={!dirty || !valid || blocked}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() =>
            save.mutate({ policy, revision: initial.revision, requestId })
          }
        >
          {save.isPending
            ? t("Guardando…")
            : save.isError
              ? t("Reintentar")
              : t("Guardar cambios")}
        </button>
      </div>
      {blocker.status === "blocked" && (
        <div
          role="alertdialog"
          aria-label={t("Cambios sin guardar")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="max-w-md rounded-xl border bg-background p-6">
            <p>{t("Tenés cambios sin guardar. ¿Querés salir?")}</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => blocker.reset()}>{t("Cancelar")}</button>
              <button
                disabled={save.isPending}
                onClick={() => blocker.proceed()}
              >
                {t("Descartar cambios")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
