export type CampaignPolicy = {
  enabled: boolean;
  revision: number;
  budget_timezone: string;
  daily_limit: number | null;
  max_sends_per_minute: number | null;
  recipient_cap: number | null;
  cloudamqp_enabled: boolean;
  used: number;
  remaining: number | null;
  resets_at: string | null;
};
export function readCampaignPolicy(value: unknown): CampaignPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid campaign policy");
  const v = value as Record<string, unknown>;
  if (typeof v.enabled !== "boolean" || typeof v.revision !== "number")
    throw new Error("Invalid campaign policy");
  const number = (key: string) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? (v[key] as number)
      : null;
  const policy: CampaignPolicy = {
    enabled: v.enabled,
    revision: v.revision,
    budget_timezone:
      typeof v.budget_timezone === "string" ? v.budget_timezone : "UTC",
    daily_limit: number("daily_limit"),
    max_sends_per_minute: number("max_sends_per_minute"),
    recipient_cap: number("recipient_cap"),
    cloudamqp_enabled: v.cloudamqp_enabled === true,
    used: number("used") ?? 0,
    remaining: number("remaining"),
    resets_at: typeof v.resets_at === "string" ? v.resets_at : null,
  };
  new Intl.DateTimeFormat("en", { timeZone: policy.budget_timezone });
  if (
    policy.enabled &&
    [
      policy.daily_limit,
      policy.max_sends_per_minute,
      policy.recipient_cap,
    ].some((n) => n === null || !Number.isInteger(n) || n < 1)
  )
    throw new Error("Incomplete enabled campaign policy");
  return policy;
}

export type CampaignSchedule = {
  scheduled_start_at: string | null;
  expires_at: string | null;
  schedule_timezone: string;
  send_window_start: string | null;
  send_window_end: string | null;
  max_sends_per_minute: number | null;
};
export type CampaignScheduleDraft = {
  later: boolean;
  start: string;
  expiry: string;
  timezone: string;
  window: boolean;
  windowStart: string;
  windowEnd: string;
  speed: string;
};
export function zonedDateTimeInput(
  iso: string | null | undefined,
  timezone: string,
) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// Find real instants matching the local input rather than accepting the browser's
// time zone or silently shifting a missing/ambiguous DST hour.
export function zonedDateTimeToUtc(input: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw new Error("Ingresá una fecha y hora válidas.");
  const naive = Date.parse(`${input}:00Z`);
  if (!Number.isFinite(naive))
    throw new Error("Ingresá una fecha y hora válidas.");
  const matches = new Set<string>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const probe = naive + hours * 3600000;
    const offset =
      Date.parse(
        `${zonedDateTimeInput(new Date(probe).toISOString(), timezone)}:00Z`,
      ) - probe;
    const candidate = new Date(naive - offset).toISOString();
    if (zonedDateTimeInput(candidate, timezone) === input)
      matches.add(candidate);
  }
  if (matches.size !== 1)
    throw new Error(
      "Esta hora no existe o se repite por el cambio horario. Elegí otra hora.",
    );
  return [...matches][0];
}
export function campaignScheduleDraft(
  c?: Partial<CampaignSchedule>,
): CampaignScheduleDraft {
  const timezone = c?.schedule_timezone ?? "UTC";
  return {
    later: !!c?.scheduled_start_at,
    start: zonedDateTimeInput(c?.scheduled_start_at, timezone),
    expiry: zonedDateTimeInput(c?.expires_at, timezone),
    timezone,
    window: !!c?.send_window_start,
    windowStart: c?.send_window_start?.slice(0, 5) ?? "09:00",
    windowEnd: c?.send_window_end?.slice(0, 5) ?? "18:00",
    speed: c?.max_sends_per_minute?.toString() ?? "",
  };
}
export function campaignScheduleInput(
  d: CampaignScheduleDraft,
  policy: CampaignPolicy,
  now = Date.now(),
): CampaignSchedule {
  const start = d.later ? zonedDateTimeToUtc(d.start, d.timezone) : null;
  const expiry = d.expiry ? zonedDateTimeToUtc(d.expiry, d.timezone) : null;
  if (d.later && Date.parse(start!) <= now)
    throw new Error("La fecha de inicio debe ser futura.");
  if ((policy.enabled || d.later || d.window) && !expiry)
    throw new Error("Definí cuándo debe dejar de enviar la campaña.");
  if (
    expiry &&
    Date.parse(expiry) <= Math.max(now, start ? Date.parse(start) : now)
  )
    throw new Error("El vencimiento debe ser posterior al inicio.");
  if (
    d.window &&
    (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.windowStart) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.windowEnd) ||
      d.windowStart === d.windowEnd)
  )
    throw new Error("Definí un horario de envío válido.");
  const speed = d.speed ? Number(d.speed) : null;
  if (
    speed !== null &&
    (!Number.isInteger(speed) ||
      speed < 1 ||
      speed > 60000 ||
      (policy.enabled && speed > policy.max_sends_per_minute!))
  )
    throw new Error(
      "La velocidad no puede superar el límite de la organización.",
    );
  return {
    scheduled_start_at: start,
    expires_at: expiry,
    schedule_timezone: d.timezone,
    send_window_start: d.window ? d.windowStart : null,
    send_window_end: d.window ? d.windowEnd : null,
    max_sends_per_minute: speed,
  };
}
export const campaignWaitingLabels: Record<string, string> = {
  scheduled: "Programada",
  sending_window: "Fuera del horario de envío",
  daily_allowance: "Esperando cupo diario",
  number_rate: "Esperando velocidad disponible",
  recipient_frequency: "Esperando límite del destinatario",
  policy_unavailable: "Esperando la política de envío",
};

export function campaignStatusLabel(campaign: {
  status: string;
  sending_state?: unknown;
  cancelled_at?: string | null;
}) {
  if (campaign.status === "needs_review") return "Requiere revisión";
  if (
    campaign.cancelled_at &&
    (campaign.status === "running" || campaign.status === "queued")
  )
    return "Cancelando envíos";
  const waiting = campaign.sending_state as
    | { waiting_count?: number; reason?: string }
    | null
    | undefined;
  if (
    (campaign.status === "queued" || campaign.status === "running") &&
    waiting?.waiting_count &&
    waiting.reason
  ) {
    return campaignWaitingLabels[waiting.reason] ?? "En espera";
  }
  return (
    (
      {
        draft: "Borrador",
        queued: "En cola",
        running: "En ejecución",
        completed: "Completada",
        failed: "Fallida",
        needs_review: "Requiere revisión",
        expired: "Vencida",
        cancelled: "Cancelada",
      } as Record<string, string>
    )[campaign.status] ?? "Estado no disponible"
  );
}

export function campaignScheduleReady(
  c: CampaignSchedule,
  policy: CampaignPolicy,
  now = Date.now(),
) {
  return (
    (!policy.enabled || (!!c.expires_at && policy.cloudamqp_enabled)) &&
    (!c.expires_at || Date.parse(c.expires_at) > now) &&
    (!c.scheduled_start_at || Date.parse(c.scheduled_start_at) > now)
  );
}
