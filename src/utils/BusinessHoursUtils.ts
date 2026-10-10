import type {
  BusinessHoursDay,
  BusinessHoursSettings,
  BusinessHoursTimeRange,
} from "@/supabase/types/extra_types";

export const BUSINESS_HOURS_DAYS = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
] as const;

export function canManageBusinessHours(role: string | undefined) {
  // Same permissions as updates to existing organization settings.
  return role === "owner" || role === "admin";
}

export function createBusinessHoursDefaults(
  timezone: string,
): BusinessHoursSettings {
  const range = { start_time: "09:00", end_time: "17:00" };
  return {
    enabled: true,
    mode: "all_days",
    timezone,
    all_days: { ...range },
    per_day: {
      monday: { ...range, enabled: true },
      tuesday: { ...range, enabled: true },
      wednesday: { ...range, enabled: true },
      thursday: { ...range, enabled: true },
      friday: { ...range, enabled: true },
      saturday: { ...range, enabled: true },
      sunday: { ...range, enabled: true },
    },
  };
}

export const BUSINESS_HOURS_TIMES = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    label: `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`,
  };
});

export function businessHoursTimezones(current: string, search = "") {
  // Keep UTC and valid saved aliases even when Intl's canonical list omits them.
  const query = search.trim().toLowerCase().replaceAll("_", " ");
  return [...new Set(["UTC", current, ...Intl.supportedValuesOf("timeZone")])]
    .filter(Boolean)
    .sort()
    .filter((zone) => zone.toLowerCase().replaceAll("_", " ").includes(query));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTime(value: unknown, allowEndOfDay = false): value is string {
  return (
    typeof value === "string" &&
    (/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(value) ||
      (allowEndOfDay && value === "24:00"))
  );
}

function isRange(value: unknown): value is BusinessHoursTimeRange {
  return (
    isRecord(value) && isTime(value.start_time) && isTime(value.end_time, true)
  );
}

export function readBusinessHours(
  value: unknown,
): BusinessHoursSettings | null {
  if (
    !isRecord(value) ||
    (value.mode !== "all_days" && value.mode !== "per_day") ||
    typeof value.timezone !== "string" ||
    !isRange(value.all_days) ||
    !isRecord(value.per_day)
  )
    return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value.timezone });
  } catch {
    return null;
  }
  for (const { value: day } of BUSINESS_HOURS_DAYS) {
    const entry = value.per_day[day];
    if (
      !isRecord(entry) ||
      typeof entry.enabled !== "boolean" ||
      !isRange(entry)
    )
      return null;
  }
  if (value.enabled !== undefined && typeof value.enabled !== "boolean")
    return null;
  if (value.holidays !== undefined) {
    if (!Array.isArray(value.holidays) || value.holidays.length > 366)
      return null;
    const dates = new Set<string>();
    for (const holiday of value.holidays) {
      if (
        !isRecord(holiday) ||
        typeof holiday.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(holiday.date) ||
        !Number.isFinite(Date.parse(holiday.date)) ||
        new Date(holiday.date).toISOString().slice(0, 10) !== holiday.date ||
        dates.has(holiday.date) ||
        typeof holiday.closed !== "boolean" ||
        (!holiday.closed && !isRange(holiday))
      )
        return null;
      dates.add((holiday as Record<string, unknown>).date as string);
    }
  }
  for (const field of ["outside_hours_message", "no_agents_message"]) {
    if (
      value[field] !== undefined &&
      (typeof value[field] !== "string" ||
        !(value[field] as string).trim() ||
        (value[field] as string).length > 4096)
    )
      return null;
  }
  if (value.queue_overrides !== undefined) {
    if (!isRecord(value.queue_overrides)) return null;
    for (const [queueId, schedule] of Object.entries(value.queue_overrides)) {
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(queueId))
        return null;
      if (
        schedule !== null &&
        (!isRecord(schedule) ||
          schedule.queue_overrides !== undefined ||
          !readBusinessHours(schedule))
      )
        return null;
    }
  }
  return structuredClone(value) as BusinessHoursSettings;
}

export function businessHoursRangeValid(range: BusinessHoursTimeRange) {
  return (
    isTime(range.start_time) &&
    isTime(range.end_time, true) &&
    range.end_time > range.start_time
  );
}

export function invalidBusinessHoursRanges(
  settings: BusinessHoursSettings,
): string[] {
  const invalidHolidays = (settings.holidays || []).flatMap((holiday, index) =>
    !holiday.closed &&
    !businessHoursRangeValid(holiday as BusinessHoursTimeRange)
      ? [`holiday-${index}`]
      : [],
  );
  if (settings.mode === "all_days") {
    return [
      ...(businessHoursRangeValid(settings.all_days) ? [] : ["all_days"]),
      ...invalidHolidays,
    ];
  }
  return BUSINESS_HOURS_DAYS.filter(
    ({ value }) =>
      settings.per_day[value].enabled &&
      !businessHoursRangeValid(settings.per_day[value]),
  )
    .map(({ value }) => value)
    .concat(invalidHolidays as BusinessHoursDay[]);
}

export function businessHoursPatch(settings: BusinessHoursSettings) {
  if (
    !readBusinessHours(settings) ||
    invalidBusinessHoursRanges(settings).length ||
    Object.values(settings.queue_overrides || {}).some(
      (override) => override && invalidBusinessHoursRanges(override).length,
    )
  ) {
    throw new Error("Invalid business hours configuration");
  }
  // Send only the edited key; the existing database trigger merges other extras.
  return { extra: { business_hours: structuredClone(settings) } };
}
