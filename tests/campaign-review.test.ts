import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  campaignNeedsReview,
  canStartCampaign,
  isCampaignProcessing,
} from "../src/utils/CampaignUtils.ts";

void test("uncertainty is reviewable, refreshable and cannot rerun", () => {
  assert.equal(campaignNeedsReview("needs_review"), true);
  assert.equal(isCampaignProcessing("needs_review"), true);
  assert.equal(canStartCampaign("needs_review", "ready"), false);
  assert.equal(campaignNeedsReview("completed"), false);
});
void test("review wording is translated in each supported locale", () => {
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const data = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.ok(data["Requiere revisión"]);
    assert.ok(data["No se pudieron cargar las referencias."]);
    assert.ok(
      data[
        "Algunos envíos tienen un resultado incierto. No se reenviarán automáticamente. Contactá al administrador con la referencia."
      ],
    );
  }
});
void test("review references use scoped bounded queries and no resend control", () => {
  const query = readFileSync(
    new URL("../src/queries/useCampaigns.ts", import.meta.url),
    "utf8",
  );
  const view = readFileSync(
    new URL(
      "../src/routes/_auth/campaigns/$campaignId_.review.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(query, /eq\("organization_id", orgId!\)/);
  assert.match(query, /eq\("status", "needs_review"\)/);
  assert.match(query, /limit\(5\)/);
  assert.match(query, /abortSignal\(signal\)/);
  assert.match(view, /needs_review_count/);
  assert.match(view, /reviewIssues\.refetch/);
});
