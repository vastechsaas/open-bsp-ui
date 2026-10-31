import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  readCampaignPolicy,
  zonedDateTimeToUtc,
  zonedDateTimeInput,
  campaignScheduleDraft,
  campaignScheduleInput,
  campaignScheduleReady,
  campaignStatusLabel,
  campaignWaitingLabels,
} from "../src/utils/CampaignPolicyUtils.ts";

const policy = readCampaignPolicy({
  enabled: true,
  revision: 1,
  daily_limit: 100,
  max_sends_per_minute: 10,
  recipient_cap: 1,
  budget_timezone: "Asia/Karachi",
  cloudamqp_enabled: true,
});
const now = Date.parse("2026-11-01T00:00:00Z");
void test("policy defaults preserve opt-in and reject incomplete enabled limits", () => {
  assert.equal(
    readCampaignPolicy({ enabled: false, revision: 0 }).enabled,
    false,
  );
  assert.throws(() => readCampaignPolicy({ enabled: true, revision: 0 }));
  assert.throws(() => readCampaignPolicy({ enabled: false, revision: "0" }));
  assert.throws(() =>
    readCampaignPolicy({
      enabled: false,
      revision: 0,
      budget_timezone: "Invalid/Zone",
    }),
  );
});
void test("local campaign date uses selected zone, not browser zone", () => {
  assert.equal(
    zonedDateTimeToUtc("2026-11-02T09:30", "Asia/Karachi"),
    "2026-11-02T04:30:00.000Z",
  );
  assert.equal(
    zonedDateTimeInput("2026-11-02T04:30:00Z", "Asia/Karachi"),
    "2026-11-02T09:30",
  );
  assert.throws(() => zonedDateTimeToUtc("invalid", "UTC"));
  assert.throws(() => zonedDateTimeToUtc("2026-02-30T12:00", "UTC"));
});
void test("nonexistent and repeated DST local start times require correction", () => {
  assert.throws(() =>
    zonedDateTimeToUtc("2026-03-08T02:30", "America/New_York"),
  );
  assert.throws(() =>
    zonedDateTimeToUtc("2026-11-01T01:30", "America/New_York"),
  );
  assert.equal(
    zonedDateTimeToUtc("2026-11-01T03:30", "America/New_York"),
    "2026-11-01T08:30:00.000Z",
  );
});
void test("schedule requires future expiry and cannot raise organization speed", () => {
  const draft = {
    ...campaignScheduleDraft(),
    timezone: "Asia/Karachi",
    later: true,
    start: "2026-11-02T09:00",
    expiry: "2026-11-04T18:00",
    window: true,
    windowStart: "22:00",
    windowEnd: "06:00",
    speed: "5",
  };
  const value = campaignScheduleInput(draft, policy, now);
  assert.equal(value.scheduled_start_at, "2026-11-02T04:00:00.000Z");
  assert.equal(value.send_window_end, "06:00");
  assert.equal(value.max_sends_per_minute, 5);
  assert.equal(campaignScheduleReady(value, policy, now), true);
  assert.deepEqual(campaignScheduleDraft(value), draft);
  for (const patch of [
    { expiry: "" },
    { speed: "11" },
    { speed: "0" },
    { speed: "1.5" },
    { start: "2026-10-31T01:00" },
    { expiry: "2026-11-02T08:59" },
    { windowEnd: "22:00" },
  ])
    assert.throws(() =>
      campaignScheduleInput({ ...draft, ...patch }, policy, now),
    );
  assert.equal(
    campaignScheduleReady({ ...value, expires_at: null }, policy, now),
    false,
  );
  assert.equal(
    campaignScheduleReady(value, { ...policy, cloudamqp_enabled: false }, now),
    false,
  );
});
void test("waiting labels never hide uncertain or terminal results", () => {
  const sending_state = { waiting_count: 3, reason: "daily_allowance" };
  assert.equal(
    campaignStatusLabel({ status: "queued", sending_state }),
    "Esperando cupo diario",
  );
  assert.equal(
    campaignStatusLabel({ status: "needs_review", sending_state }),
    "Requiere revisión",
  );
  assert.equal(
    campaignStatusLabel({ status: "expired", sending_state }),
    "Vencida",
  );
  assert.equal(
    campaignStatusLabel({ status: "cancelled", sending_state }),
    "Cancelada",
  );
  assert.equal(
    campaignStatusLabel({
      status: "queued",
      sending_state,
      cancelled_at: "2026-11-01T01:00Z",
    }),
    "Cancelando envíos",
  );
});
void test("policy screens scope caches and requests; list does not add per-row requests", () => {
  const read = (path: string) =>
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const queries = read("queries/useCampaignPolicy.ts");
  assert.match(queries, /queryKey:\s*\[orgId,\s*"campaign-policy",\s*userId\]/);
  assert.match(queries, /abortSignal\(signal\)/);
  assert.match(queries, /p_expected_revision/);
  assert.match(queries, /p_request_id/);
  const platform = read("components/platform/PlatformCampaignPolicy.tsx");
  assert.match(platform, /useBlocker/);
  assert.match(platform, /40001/);
  assert.match(platform, /crypto.randomUUID/);
  assert.match(platform, /Guardar cambios/);
  assert.doesNotMatch(platform, /manual.resume|manual_resume|Pausar y/);
  assert.doesNotMatch(
    read("routes/_auth/campaigns/index.tsx"),
    /useCampaignSendingState/,
  );
  assert.match(read("queries/useModulePermissions.ts"), /campaign-policy/);
});
void test("new policy and scheduling messages have every supported translation", () => {
  const keys = [
    ...Object.values(campaignWaitingLabels),
    "Controles de campañas",
    "Vencida",
    "Cancelada",
    "Programación y envío",
    "Aplicar política de envío",
    "Cupo diario de mensajes",
    "Dejar de enviar después de",
    "Cancelar envíos pendientes",
    "La política cambió. Recargá antes de guardar.",
    "La velocidad no puede superar el límite de la organización.",
  ];
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const locale = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${lang}.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const key of keys) assert.ok(locale[key], `${lang}: ${key}`);
  }
});
