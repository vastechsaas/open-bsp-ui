import { useId, useState, type FormEvent } from "react";
import { Clock3 } from "lucide-react";
import Button from "@/components/Button";
import Switch from "@/components/Switch";
import BusinessHoursTimezoneSelect from "./BusinessHoursTimezoneSelect";
import type {
  BusinessHoursSettings,
  BusinessHoursTimeRange,
} from "@/supabase/types/extra_types";
import {
  BUSINESS_HOURS_DAYS,
  BUSINESS_HOURS_TIMES,
  invalidBusinessHoursRanges,
  readBusinessHours,
} from "@/utils/BusinessHoursUtils";

type Props = {
  initialValue: BusinessHoursSettings;
  configured: boolean;
  onSave: (settings: BusinessHoursSettings) => Promise<void>;
  translate: (label: string) => string;
  queueOverride?: boolean;
};

export default function BusinessHoursForm({
  initialValue,
  configured,
  onSave,
  translate: t,
  queueOverride = false,
}: Props) {
  const id = useId();
  const [settings, setSettings] = useState(() => structuredClone(initialValue));
  const [saved, setSaved] = useState(
    configured ? JSON.stringify(initialValue) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const invalid = invalidBusinessHoursRanges(settings);
  const validConfiguration = readBusinessHours(settings) !== null;
  const dirty = JSON.stringify(settings) !== saved;
  const update = (next: BusinessHoursSettings) => {
    setSettings(next);
    setSaveError(false);
    setSaveSuccess(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !dirty || invalid.length || !validConfiguration) return;
    setSaving(true);
    setSaveError(false);
    setSaveSuccess(false);
    try {
      await onSave(structuredClone(settings));
      setSaved(JSON.stringify(settings));
      setSaveSuccess(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const timeInputs = (
    key: string,
    range: BusinessHoursTimeRange,
    onChange: (range: BusinessHoursTimeRange) => void,
    disabled = false,
  ) => (
    <div className="mt-3 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
      {(["start_time", "end_time"] as const).map((field) => (
        <label
          key={field}
          htmlFor={`${id}-${key}-${field}`}
          className="block min-w-0"
        >
          <span className="mb-1.5 block text-[13px] text-muted-foreground">
            {t(field === "start_time" ? "Hora de inicio" : "Hora de fin")}
          </span>
          <select
            id={`${id}-${key}-${field}`}
            value={range[field]}
            disabled={saving || disabled}
            aria-invalid={
              !disabled && invalid.includes(key as (typeof invalid)[number])
            }
            aria-describedby={
              !disabled && invalid.includes(key as (typeof invalid)[number])
                ? `${id}-${key}-error`
                : undefined
            }
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(event) =>
              onChange({ ...range, [field]: event.target.value })
            }
          >
            {BUSINESS_HOURS_TIMES.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
            {field === "end_time" && (
              <option value="24:00">{t("12:00 AM (día siguiente)")}</option>
            )}
          </select>
        </label>
      ))}
      {invalid.includes(key as (typeof invalid)[number]) && !disabled && (
        <p
          id={`${id}-${key}-error`}
          role="alert"
          className="text-xs text-destructive sm:col-span-2"
        >
          {t("La hora de fin debe ser posterior a la hora de inicio.")}
        </p>
      )}
    </div>
  );

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"
    >
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock3 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("Horario comercial")}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t(
              "Define los horarios de tu organización para todos los días o por día.",
            )}
          </p>
        </div>
      </div>

      <fieldset disabled={saving} className="mt-6">
        <label className="mb-5 flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
          <Switch
            className="mt-0.5 shrink-0"
            role="switch"
            checked={settings.enabled !== false}
            aria-describedby={`${id}-enabled-hint`}
            onCheckedChange={(enabled) => update({ ...settings, enabled })}
          />
          <span>
            <span className="block font-medium">
              {t("Activar horario comercial")}
            </span>
            <span
              id={`${id}-enabled-hint`}
              className="mt-1 block text-xs text-muted-foreground"
            >
              {t(
                "Activado: aplica este horario al soporte humano. Desactivado: no restringe el soporte por horario. El chatbot sigue funcionando.",
              )}
            </span>
          </span>
        </label>
        <BusinessHoursTimezoneSelect
          value={settings.timezone}
          onChange={(timezone) => update({ ...settings, timezone })}
          disabled={saving}
          translate={t}
        />
        <legend className="sr-only">{t("Configuración del horario")}</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {(
            [
              { value: "all_days", label: "Todos los días" },
              { value: "per_day", label: "Por día" },
            ] as const
          ).map((mode) => (
            <label
              key={mode.value}
              className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <input
                type="radio"
                name={`${id}-mode`}
                value={mode.value}
                checked={settings.mode === mode.value}
                onChange={() => update({ ...settings, mode: mode.value })}
                className="h-4 w-4 accent-primary"
              />
              {t(mode.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="mt-7" aria-label={t("Configuración del horario")}>
        {settings.mode === "all_days" ? (
          timeInputs("all_days", settings.all_days, (range) =>
            update({ ...settings, all_days: range }),
          )
        ) : (
          <div className="space-y-6">
            {BUSINESS_HOURS_DAYS.map(({ value: day, label }) => (
              <div
                key={day}
                className="border-b border-border pb-6 last:border-0"
              >
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={settings.per_day[day].enabled}
                    disabled={saving}
                    onChange={(event) =>
                      update({
                        ...settings,
                        per_day: {
                          ...settings.per_day,
                          [day]: {
                            ...settings.per_day[day],
                            enabled: event.target.checked,
                          },
                        },
                      })
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  {t(label)}
                  {!settings.per_day[day].enabled && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("Cerrado")}
                    </span>
                  )}
                </label>
                {timeInputs(
                  day,
                  settings.per_day[day],
                  (range) =>
                    update({
                      ...settings,
                      per_day: {
                        ...settings.per_day,
                        [day]: { ...settings.per_day[day], ...range },
                      },
                    }),
                  !settings.per_day[day].enabled,
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <fieldset disabled={saving} className="mt-6 space-y-4">
        <legend className="mb-3 text-sm font-medium">
          {t("Festivos y excepciones")}
        </legend>
        <p className="text-xs text-muted-foreground">
          {t(
            "Las excepciones reemplazan el horario semanal en la zona horaria seleccionada.",
          )}
        </p>
        {(settings.holidays || []).map((holiday, index) => (
          <div key={index} className="rounded-lg border border-border p-3">
            <label className="block text-sm">
              {t("Fecha")}
              <input
                type="date"
                value={holiday.date}
                aria-label={t("Fecha")}
                onChange={(event) =>
                  update({
                    ...settings,
                    holidays: settings.holidays!.map((item, i) =>
                      i === index
                        ? { ...item, date: event.target.value }
                        : item,
                    ),
                  })
                }
                className="ml-2 rounded border border-border bg-background p-2 text-foreground"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={holiday.closed}
                onChange={(event) =>
                  update({
                    ...settings,
                    holidays: settings.holidays!.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            closed: event.target.checked,
                            start_time: item.start_time || "09:00",
                            end_time: item.end_time || "17:00",
                          }
                        : item,
                    ),
                  })
                }
              />
              {t("Cerrado")}
            </label>
            {!holiday.closed &&
              timeInputs(
                `holiday-${index}`,
                {
                  start_time: holiday.start_time || "09:00",
                  end_time: holiday.end_time || "17:00",
                },
                (range) =>
                  update({
                    ...settings,
                    holidays: settings.holidays!.map((item, i) =>
                      i === index ? { ...item, ...range } : item,
                    ),
                  }),
              )}
            <button
              type="button"
              className="mt-3 text-sm text-destructive underline"
              onClick={() =>
                update({
                  ...settings,
                  holidays: settings.holidays!.filter((_, i) => i !== index),
                })
              }
            >
              {t("Eliminar excepción")}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-primary underline"
          disabled={(settings.holidays?.length || 0) >= 366}
          onClick={() =>
            update({
              ...settings,
              holidays: [
                ...(settings.holidays || []),
                { date: "", closed: true },
              ],
            })
          }
        >
          {t("Agregar excepción")}
        </button>
      </fieldset>
      {!queueOverride && (
        <fieldset disabled={saving} className="mt-6 space-y-4">
          <legend className="mb-3 text-sm font-medium">
            {t("Mensajes de disponibilidad")}
          </legend>
          <p className="text-xs text-muted-foreground">
            {t(
              "Las solicitudes quedan en cola. Los chats ya atendidos permanecen abiertos.",
            )}
          </p>
          {(["outside_hours_message", "no_agents_message"] as const).map(
            (field) => {
              const message = (
                <label key={field} className="block text-sm">
                  {t(
                    field === "outside_hours_message"
                      ? "Fuera del horario comercial"
                      : "Sin agentes disponibles",
                  )}
                  <textarea
                    maxLength={4096}
                    rows={3}
                    value={
                      settings[field] ||
                      (field === "outside_hours_message"
                        ? "Our support team is currently outside business hours. Your request is queued and will be reviewed when support is available."
                        : "All support agents are currently unavailable. Your request is queued for the next available support agent.")
                    }
                    onChange={(event) =>
                      update({ ...settings, [field]: event.target.value })
                    }
                    className="mt-2 block w-full rounded-lg border border-border bg-background p-3 text-foreground"
                  />
                </label>
              );
              return field === "outside_hours_message" ? (
                message
              ) : (
                <details
                  key={field}
                  className="rounded-lg border border-border p-3"
                >
                  <summary className="cursor-pointer text-sm font-medium">
                    {t("Mensaje de respaldo durante el horario comercial")}
                  </summary>
                  <p className="my-3 text-xs text-muted-foreground">
                    {t(
                      "Solo se usa si no hay agentes disponibles durante el horario comercial, por ejemplo, si están desconectados. El horario no garantiza su disponibilidad.",
                    )}
                  </p>
                  {message}
                </details>
              );
            },
          )}
        </fieldset>
      )}
      {!validConfiguration && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t(
            "Revisa la zona horaria, las fechas y los mensajes antes de guardar.",
          )}
        </p>
      )}
      <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        {saveError && (
          <p role="alert" className="mr-auto text-[13px] text-destructive">
            {t("No se pudo guardar el horario. Inténtalo de nuevo.")}
          </p>
        )}
        {saveSuccess && (
          <p role="status" className="mr-auto text-[13px] text-foreground">
            {t("Horario comercial guardado")}
          </p>
        )}
        <Button
          type="submit"
          className="primary px-5"
          loading={saving}
          invalid={!dirty || !!invalid.length || !validConfiguration}
        >
          {t("Guardar")}
        </Button>
      </div>
    </form>
  );
}
