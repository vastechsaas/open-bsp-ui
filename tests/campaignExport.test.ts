import { test } from "node:test";
import assert from "node:assert/strict";
import {
  campaignExportInfo,
  canExportCampaign,
  isPreparingExport,
} from "../src/utils/CampaignExportUtils";

void test("only accepted Owners of completed campaigns see CSV export", () => {
  assert.equal(canExportCampaign("completed", "owner"), true);
  for (const role of ["admin", "supervisor", "member", "agent", undefined])
    assert.equal(canExportCampaign("completed", role), false);
  for (const status of [
    "draft",
    "queued",
    "running",
    "failed",
    "cancelled",
    "needs_review",
    "expired",
  ])
    assert.equal(canExportCampaign(status, "owner"), false);
  assert.equal(canExportCampaign("completed", "owner", false), false);
});
void test("authoritative export state preserves progress and rejects malformed responses", () => {
  assert.equal(campaignExportInfo(null), null);
  const job = {
    id: "job",
    state: "processing",
    snapshot_at: "2026-11-10T00:00:00Z",
    expires_at: "2026-11-11T00:00:00Z",
    timezone: "Asia/Karachi",
    row_count: 601,
    processed_count: 100,
  };
  assert.equal(isPreparingExport(campaignExportInfo(job)), true);
  assert.equal(
    isPreparingExport(
      campaignExportInfo({ ...job, state: "ready", processed_count: 601 }),
    ),
    false,
  );
  assert.throws(() => campaignExportInfo({ ...job, processed_count: 700 }));
  assert.throws(() => campaignExportInfo({ ...job, snapshot_at: "bad" }));
  assert.throws(() => campaignExportInfo({ ...job, state: "delivered" }));
});
