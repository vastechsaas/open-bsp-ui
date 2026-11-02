import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  campaignActivityPage,
  receiptSummary,
  safeActivityCode,
  activityLabels,
  activityReasons,
} from "../src/utils/CampaignActivityUtils.ts";

void test("summary defaults invalid data without inventing delivery or read", () => {
  assert.deepEqual(
    receiptSummary({ sent: 10, read: -1, delivered: "10", delivery_failed: 2 }),
    { sent: 10, read: 0, delivered: 0, delivery_failed: 2 },
  );
});

void test("all activity labels have translations in every supported locale", () => {
  const keys = [
    ...Object.values(activityLabels),
    ...Object.values(activityReasons),
    "Entrega y actividad",
    "Entregados (incluye leídos)",
    "Leídos",
    "Errores de entrega",
    "No se pudo cargar el seguimiento.",
    "No se pudo cargar la actividad.",
    "Todavía no hay actividad registrada.",
  ];
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${lang}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(translations[key], `${lang}: ${key}`);
  }
});

void test("queries cancel obsolete scopes and refresh completed campaigns", () => {
  const source = readFileSync(
    new URL("../src/queries/useCampaignActivity.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /state\.ui\.user\?\.id/);
  assert.match(source, /state\.ui\.activeOrgId/);
  assert.match(source, /abortSignal\(signal\)/);
  assert.match(source, /refetchInterval: 10_000/);
  assert.match(source, /p_page_size: pageSize/);
  assert.doesNotMatch(source, /placeholderData|keepPreviousData/);
});
void test("activity uses server totals and keeps page order", () => {
  const rows = [
    { total_count: 405, id: 2 },
    { total_count: 405, id: 1 },
  ];
  assert.deepEqual(campaignActivityPage(rows), { rows, total: 405 });
  assert.deepEqual(campaignActivityPage([]), { rows: [], total: 0 });
});
void test("unsafe error content is not displayed and outcome labels stay distinct", () => {
  assert.equal(safeActivityCode("meta_131026"), "meta_131026");
  assert.equal(safeActivityCode("Bearer secret with spaces"), null);
  assert.notEqual(activityLabels.accepted, activityLabels.delivered);
  assert.notEqual(activityLabels.dispatch_failed, activityLabels.failed);
});
