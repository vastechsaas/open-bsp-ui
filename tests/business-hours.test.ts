import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BusinessHoursForm from "../src/components/settings/BusinessHoursForm.tsx";
import {
  BUSINESS_HOURS_DAYS,
  BUSINESS_HOURS_TIMES,
  businessHoursPatch,
  businessHoursRangeValid,
  businessHoursTimezones,
  canManageBusinessHours,
  createBusinessHoursDefaults,
  invalidBusinessHoursRanges,
  readBusinessHours,
} from "../src/utils/BusinessHoursUtils.ts";

const defaults = () => createBusinessHoursDefaults("Asia/Karachi");
const render = (settings = defaults(), configured = false) =>
  renderToStaticMarkup(
    createElement(BusinessHoursForm, {
      initialValue: settings,
      configured,
      translate: (text) => text,
      onSave: () => Promise.resolve(),
    }),
  );
const source = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("defaults have one mode, seven independent day ranges and enforce saved schedules", () => {
  const settings = defaults();
  assert.equal(settings.mode, "all_days");
  assert.equal(settings.enabled, true);
  assert.equal(settings.timezone, "Asia/Karachi");
  assert.equal(Object.keys(settings.per_day).length, 7);
  settings.per_day.monday.start_time = "10:00";
  assert.equal(settings.per_day.tuesday.start_time, "09:00");
  assert.equal(settings.all_days.start_time, "09:00");
  assert.deepEqual(invalidBusinessHoursRanges(settings), []);
});

void test("quarter-hour options format midnight and noon correctly", () => {
  assert.equal(BUSINESS_HOURS_TIMES.length, 96);
  assert.equal(
    new Set(BUSINESS_HOURS_TIMES.map((time) => time.value)).size,
    96,
  );
  assert.deepEqual(BUSINESS_HOURS_TIMES[0], {
    value: "00:00",
    label: "12:00 AM",
  });
  assert.deepEqual(BUSINESS_HOURS_TIMES[48], {
    value: "12:00",
    label: "12:00 PM",
  });
  assert.equal(BUSINESS_HOURS_TIMES[95].value, "23:45");
});

void test("range validation rejects malformed, equal and inverted times; full-day range is unambiguous", () => {
  for (const range of [
    { start_time: "17:00", end_time: "09:00" },
    { start_time: "09:00", end_time: "09:00" },
    { start_time: "25:00", end_time: "26:00" },
    { start_time: "9:00", end_time: "17:00" },
    { start_time: "09:01", end_time: "17:00" },
    { start_time: "24:00", end_time: "24:00" },
  ])
    assert.equal(businessHoursRangeValid(range), false);
  assert.equal(
    businessHoursRangeValid({ start_time: "00:00", end_time: "24:00" }),
    true,
  );
});

void test("per-day validation applies only to checked days and retains both mode configurations", () => {
  const settings = defaults();
  settings.per_day.monday.end_time = "08:00";
  assert.deepEqual(invalidBusinessHoursRanges(settings), []);
  settings.mode = "per_day";
  assert.deepEqual(invalidBusinessHoursRanges(settings), ["monday"]);
  settings.per_day.monday.enabled = false;
  assert.deepEqual(invalidBusinessHoursRanges(settings), []);
  assert.equal(settings.per_day.monday.end_time, "08:00");
  settings.mode = "all_days";
  assert.equal(settings.all_days.end_time, "17:00");
});

void test("saved JSON roundtrips without mutating caller data and malformed values are not silently loaded", () => {
  const settings = defaults();
  const parsed = readBusinessHours(
    JSON.parse(JSON.stringify(settings)) as unknown,
  );
  assert.deepEqual(parsed, settings);
  parsed!.per_day.friday.enabled = false;
  assert.equal(settings.per_day.friday.enabled, true);
  for (const value of [
    null,
    [],
    {},
    { ...settings, mode: "invalid" },
    { ...settings, timezone: "Invalid/Zone" },
    { ...settings, per_day: {} },
    { ...settings, all_days: { start_time: "24:00", end_time: "24:00" } },
  ])
    assert.equal(readBusinessHours(value), null);
});

void test("save patches only business_hours and retains closed days in persisted settings", () => {
  const settings = defaults();
  settings.mode = "per_day";
  settings.per_day.sunday.enabled = false;
  const patch = businessHoursPatch(settings);
  assert.deepEqual(Object.keys(patch.extra), ["business_hours"]);
  assert.equal(patch.extra.business_hours.per_day.sunday.enabled, false);
  patch.extra.business_hours.all_days.start_time = "10:00";
  assert.equal(settings.all_days.start_time, "09:00");
  settings.per_day.monday.end_time = "08:00";
  assert.throws(() => businessHoursPatch(settings));
});

void test("configuration follows existing owner/admin permissions", () => {
  for (const role of ["owner", "admin"])
    assert.equal(canManageBusinessHours(role), true);
  for (const role of ["supervisor", "agent", "member", undefined])
    assert.equal(canManageBusinessHours(role), false);
});

void test("All Days renders exactly two mutually exclusive radios and one start/end pair", () => {
  const html = render();
  assert.equal((html.match(/type="radio"/g) || []).length, 2);
  assert.equal((html.match(/type="radio"[^>]*checked=""/g) || []).length, 1);
  assert.equal((html.match(/<select/g) || []).length, 2);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 0);
  assert.match(html, /Todos los días/);
  assert.match(html, /Por día/);
  assert.match(html, /value="24:00"/);
  assert.match(html, /Asia\/Karachi/);
  assert.doesNotMatch(html, /<button[^>]*disabled=""/);
  assert.match(render(defaults(), true), /<button[^>]*disabled=""/);
});

void test("Per day renders all seven days, closed-day disabled inputs and accessible range errors", () => {
  const settings = defaults();
  settings.mode = "per_day";
  settings.per_day.sunday.enabled = false;
  settings.per_day.monday.end_time = "08:00";
  const html = render(settings);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 7);
  assert.equal((html.match(/<select/g) || []).length, 14);
  assert.equal((html.match(/<select[^>]*disabled=""/g) || []).length, 2);
  for (const { label } of BUSINESS_HOURS_DAYS) assert.ok(html.includes(label));
  assert.match(html, /Cerrado/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /role="alert"/);
  assert.match(html, /<button[^>]*disabled=""/);
});

void test("route and persistence are organization/account scoped, and no runtime controls are imported", () => {
  const route = source("../src/routes/_auth/settings/business-hours.tsx");
  const hook = source("../src/queries/useBusinessHours.ts");
  const nav = source("../src/components/settings/SettingsWorkspaceLayout.tsx");
  assert.match(route, /key=\{`\$\{userId\}:\$\{orgId\}:/);
  assert.match(route, /org\.id !== orgId/);
  assert.match(route, /canManageBusinessHours/);
  assert.match(hook, /current\.user\?\.id !== userId/);
  assert.match(hook, /current\.activeOrgId !== organizationId/);
  assert.match(hook, /\.eq\("id", organizationId\)/);
  assert.match(hook, /businessHoursPatch\(settings\)/);
  assert.match(nav, /to: "\/settings\/business-hours"/);
  assert.doesNotMatch(hook, /localStorage|heartbeat|takeover|auto.assign/i);
  assert.match(
    source("../src/components/settings/BusinessHoursForm.tsx"),
    /setSaveError\(true\)/,
  );
});

void test("all user-facing business-hour keys are translated in every supported locale", () => {
  const strings = [
    source("../src/components/settings/BusinessHoursForm.tsx"),
    source("../src/components/settings/BusinessHoursTimezoneSelect.tsx"),
    source("../src/routes/_auth/settings/business-hours.tsx"),
  ];
  const labels = new Set([
    ...strings.flatMap((text) =>
      [...text.matchAll(/t\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]),
    ),
    ...BUSINESS_HOURS_DAYS.map((day) => day.label),
    "Todos los días",
    "Por día",
    "Hora de inicio",
    "Hora de fin",
    "Aplicar horario comercial",
    "Fuera del horario comercial",
    "Sin agentes disponibles",
    "Organización suspendida",
    "Abierto ahora",
    "Horario personalizado",
    "Usa el horario de la organización",
    "Usar horario de la organización",
    "Personalizar horario",
    "Horarios de tu organización para todos los días o por día.",
  ]);
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const locale = JSON.parse(
      source(`../public/locales/${lang}.json`),
    ) as Record<string, string>;
    for (const label of labels) assert.ok(locale[label], `${lang}:${label}`);
  }
});

void test("holiday exceptions validate real dates, unique dates and custom opening ranges", () => {
  const settings = defaults();
  for (const holiday of [
    { date: "2026-02-31", closed: true },
    { date: "", closed: true },
    { date: "2026-12-25", closed: false },
  ])
    assert.equal(readBusinessHours({ ...settings, holidays: [holiday] }), null);
  settings.holidays = [{ date: "2026-12-25", closed: true }];
  assert.ok(readBusinessHours(settings));
  assert.equal(
    readBusinessHours({
      ...settings,
      holidays: [...settings.holidays, ...settings.holidays],
    }),
    null,
  );
  settings.holidays = [
    {
      date: "2026-12-25",
      closed: false,
      start_time: "12:00",
      end_time: "10:00",
    },
  ];
  assert.throws(() => businessHoursPatch(settings));
});

void test("queue overrides preserve independent time zones, support inheritance and reject nested overrides", () => {
  const settings = defaults();
  const queueId = "bb000000-0000-4000-8000-000000000001";
  settings.queue_overrides = {
    [queueId]: { ...defaults(), timezone: "America/New_York" },
  };
  assert.equal(
    businessHoursPatch(settings).extra.business_hours.queue_overrides![queueId]!
      .timezone,
    "America/New_York",
  );
  settings.queue_overrides[queueId] = null;
  assert.equal(
    businessHoursPatch(settings).extra.business_hours.queue_overrides![queueId],
    null,
  );
  assert.equal(
    readBusinessHours({
      ...settings,
      queue_overrides: { invalid: defaults() },
    }),
    null,
  );
  assert.equal(
    readBusinessHours({
      ...settings,
      queue_overrides: { [queueId]: { ...defaults(), queue_overrides: {} } },
    }),
    null,
  );
});

void test("unavailable customer messages cannot be blank or exceed WhatsApp text limits", () => {
  for (const field of ["outside_hours_message", "no_agents_message"]) {
    assert.equal(readBusinessHours({ ...defaults(), [field]: " " }), null);
    assert.equal(
      readBusinessHours({ ...defaults(), [field]: "x".repeat(4097) }),
      null,
    );
    assert.ok(
      readBusinessHours({ ...defaults(), [field]: "Your request is queued." }),
    );
  }
});

void test("schedule form exposes editable timezone, exceptions and global customer messages", () => {
  const settings = defaults();
  settings.holidays = [
    {
      date: "2026-12-25",
      closed: false,
      start_time: "10:00",
      end_time: "12:00",
    },
  ];
  const html = render(settings);
  assert.match(html, /Festivos y excepciones/);
  assert.match(html, /type="date"/);
  assert.match(html, /Mensajes de disponibilidad/);
  assert.match(html, /2026-12-25/);
  assert.match(html, /type="checkbox"/);
  assert.match(
    source("../src/routes/_auth/settings/business-hours.tsx"),
    /get_business_hours_status/,
  );
});

void test("simplified settings keep the organization schedule primary and advanced controls collapsed", () => {
  const route = source("../src/routes/_auth/settings/business-hours.tsx");
  assert.match(
    route,
    /<details[^>]*>[\s\S]*Avanzado: horarios por equipo y disponibilidad/,
  );
  assert.doesNotMatch(route, /<details[^>]*\bopen[\s=>]/);
  const html = render();
  assert.doesNotMatch(
    html,
    /role="switch"|Activar horario comercial|El chatbot sigue funcionando/,
  );
  assert.doesNotMatch(html, /Aplicar horario comercial|<datalist/);
  assert.match(html, /role="combobox"[^>]*aria-expanded="false"/);
  assert.match(
    html,
    /<details[^>]*>[\s\S]*Mensaje de respaldo durante el horario comercial/,
  );
  assert.doesNotMatch(html, /<details[^>]*\bopen[\s=>]/);
  assert.equal((html.match(/<textarea/g) || []).length, 2);
});

void test("advanced team schedule settings are temporarily hidden without removing their configuration", () => {
  const route = source("../src/routes/_auth/settings/business-hours.tsx");
  assert.match(
    route,
    /<div hidden[^>]*>[\s\S]*Avanzado: horarios por equipo y disponibilidad/,
  );
  assert.match(route, /queue_overrides: \{/);
  assert.match(route, /<CampaignFilterSelect/);
});

void test("saving enables the schedule while preserving messages and hidden team overrides", () => {
  const settings = defaults();
  settings.enabled = false;
  settings.outside_hours_message = "We are closed.";
  settings.no_agents_message = "Please wait for support.";
  settings.queue_overrides = {
    "bb000000-0000-4000-8000-000000000001": {
      ...defaults(),
      timezone: "Europe/London",
    },
  };
  const before = structuredClone(settings);
  const html = render(settings, true);
  assert.match(html, /We are closed\./);
  assert.match(html, /Please wait for support\./);
  assert.doesNotMatch(html, /role="switch"[^>]*checked/);
  assert.deepEqual(settings, before);
  assert.deepEqual(businessHoursPatch(settings).extra.business_hours, {
    ...before,
    enabled: true,
  });
  // A previously disabled schedule must require Save, not stay silently disabled.
  assert.doesNotMatch(html, /<button[^>]*disabled=""/);
  assert.match(
    source("../src/components/settings/BusinessHoursForm.tsx"),
    /\.\.\.structuredClone\(initialValue\),\s*enabled: true/,
  );
  assert.equal(settings.enabled, false);
  const queueHtml = renderToStaticMarkup(
    createElement(BusinessHoursForm, {
      initialValue: defaults(),
      configured: true,
      queueOverride: true,
      translate: (text) => text,
      onSave: () => Promise.resolve(),
    }),
  );
  assert.doesNotMatch(queueHtml, /<textarea/);
});

void test("timezone search handles cities, canonical regions, UTC and saved aliases without duplicates", () => {
  assert.ok(
    businessHoursTimezones("Asia/Karachi", "karachi").includes("Asia/Karachi"),
  );
  assert.ok(
    businessHoursTimezones("UTC", "new york").includes("America/New_York"),
  );
  assert.ok(businessHoursTimezones("UTC", " UTC ").includes("UTC"));
  assert.ok(
    businessHoursTimezones("US/Eastern", "us/eastern").includes("US/Eastern"),
  );
  assert.deepEqual(businessHoursTimezones("UTC", "not a real timezone"), []);
  const zones = businessHoursTimezones("Asia/Karachi");
  assert.equal(zones.length, new Set(zones).size);
  assert.deepEqual(zones, [...zones].sort());
});
