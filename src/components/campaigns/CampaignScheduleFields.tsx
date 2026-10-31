import TimezoneSelect from "@/components/settings/BusinessHoursTimezoneSelect";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  CampaignPolicy,
  CampaignScheduleDraft,
} from "@/utils/CampaignPolicyUtils";

export default function CampaignScheduleFields({
  value,
  onChange,
  policy,
  disabled,
}: {
  value: CampaignScheduleDraft;
  onChange: (value: CampaignScheduleDraft) => void;
  policy: CampaignPolicy;
  disabled: boolean;
}) {
  const { translate: t } = useTranslation();
  const update = (patch: Partial<CampaignScheduleDraft>) =>
    onChange({ ...value, ...patch });
  const input =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50";
  if (!policy.cloudamqp_enabled)
    return (
      <section className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        {t(
          "La programación requiere procesamiento CloudAMQP habilitado por la plataforma.",
        )}
      </section>
    );
  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="font-medium">{t("Programación y envío")}</h2>
      <div
        role="radiogroup"
        aria-label={t("Inicio de la campaña")}
        className="flex flex-wrap gap-5 text-sm"
      >
        {[false, true].map((later) => (
          <label key={String(later)} className="flex items-center gap-2">
            <input
              type="radio"
              name="campaign-start-mode"
              checked={value.later === later}
              disabled={disabled}
              onChange={() => update({ later })}
            />
            {later ? t("Programar para más tarde") : t("Enviar ahora")}
          </label>
        ))}
      </div>
      <TimezoneSelect
        value={value.timezone}
        onChange={(timezone) => update({ timezone })}
        disabled={disabled}
        translate={t}
        helpText={t(
          "El inicio y el horario diario usan esta zona. El cupo usa la zona definida por Super Admin.",
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {value.later && (
          <label className="space-y-2 text-sm">
            <span className="block">{t("Fecha y hora de inicio")}</span>
            <input
              className={input}
              type="datetime-local"
              value={value.start}
              disabled={disabled}
              required
              onChange={(e) => update({ start: e.target.value })}
            />
          </label>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.window}
          disabled={disabled}
          onChange={(e) => update({ window: e.target.checked })}
        />
        {t("Enviar solo en un horario diario")}
      </label>
      {value.window && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="block">{t("Hora de inicio")}</span>
            <input
              className={input}
              type="time"
              value={value.windowStart}
              disabled={disabled}
              onChange={(e) => update({ windowStart: e.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="block">{t("Hora de fin")}</span>
            <input
              className={input}
              type="time"
              value={value.windowEnd}
              disabled={disabled}
              onChange={(e) => update({ windowEnd: e.target.value })}
            />
          </label>
        </div>
      )}
      {value.window && value.windowEnd < value.windowStart && (
        <p className="text-sm text-muted-foreground">
          {t("La hora de fin corresponde al día siguiente.")}
        </p>
      )}
      {policy.enabled && (
        <p className="text-sm">
          {t("Cupo diario compartido")}: {policy.used} / {policy.daily_limit} ·{" "}
          {t("Máximo por minuto")}: {policy.max_sends_per_minute} ·{" "}
          {t("Máximo por destinatario cada 24 horas")}: {policy.recipient_cap}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {t(
          "La campaña continúa en el próximo horario permitido hasta procesar todos los destinatarios. Los límites los define Super Admin.",
        )}
      </p>
    </section>
  );
}
