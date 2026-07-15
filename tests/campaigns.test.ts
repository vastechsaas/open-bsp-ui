import test from "node:test";
import assert from "node:assert/strict";
import type { TemplateData } from "../src/supabase/client.ts";
import {
  getCampaignReadiness,
  getTemplateVariables,
  isCampaignWorkspacePath,
  parseCampaignCsv,
} from "../src/utils/CampaignUtils.ts";

void test("campaign CSV parsing keeps recipients scoped data and variables", () => {
  const parsed = parseCampaignCsv(
    [
      "phone,name,offer,city",
      '15550000001,Alice,20%,"New York"',
      '15550000002,"Bob, Jr.",15%,Lahore',
    ].join("\n"),
  );

  assert.deepEqual(parsed.variableColumns, ["offer", "city"]);
  assert.deepEqual(parsed.recipients, [
    {
      contact_address: "15550000001",
      name: "Alice",
      variables: { offer: "20%", city: "New York" },
    },
    {
      contact_address: "15550000002",
      name: "Bob, Jr.",
      variables: { offer: "15%", city: "Lahore" },
    },
  ]);
});

void test("campaign CSV parsing rejects missing and duplicate phone values", () => {
  assert.throws(
    () => parseCampaignCsv("name,offer\nAlice,20%"),
    /contact_address.*phone/,
  );
  assert.throws(
    () =>
      parseCampaignCsv(
        "contact_address,name\n15550000001,Alice\n15550000001,Bob",
      ),
    /duplicado/,
  );
});

void test("template variables preserve header and body positions", () => {
  const template: TemplateData = {
    id: "template-1",
    name: "campaign_offer",
    status: "APPROVED",
    category: "MARKETING",
    language: "en_US",
    sub_category: "CUSTOM",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Hello {{1}}",
      },
      {
        type: "BODY",
        text: "Use {{1}} for {{2}}. Repeated: {{1}}",
      },
    ],
  };

  assert.deepEqual(getTemplateVariables(template), [
    { key: "header.1", section: "header", index: 1 },
    { key: "body.1", section: "body", index: 1 },
    { key: "body.2", section: "body", index: 2 },
  ]);
});

void test("campaign readiness requires valid mappings and recipients", () => {
  const template: TemplateData = {
    id: "template-1",
    name: "campaign_offer",
    status: "APPROVED",
    category: "MARKETING",
    language: "en_US",
    sub_category: "CUSTOM",
    components: [{ type: "BODY", text: "Hello {{1}}" }],
  };

  assert.equal(
    getCampaignReadiness({
      template,
      mapping: { "body.1": "contact.name" },
      audienceCount: 10,
    }),
    "ready",
  );
  assert.equal(
    getCampaignReadiness({ template, mapping: {}, audienceCount: 10 }),
    "needs_attention",
  );
  assert.equal(
    getCampaignReadiness({
      template,
      mapping: { "body.1": "contact.name" },
      audienceCount: 0,
    }),
    "needs_attention",
  );
  assert.equal(
    getCampaignReadiness({
      template,
      mapping: { "body.1": "contact.name" },
      audienceCount: null,
      audienceUnavailable: true,
    }),
    "unavailable",
  );
});

void test("only listing, create, and review use the campaign workspace", () => {
  assert.equal(isCampaignWorkspacePath("/campaigns"), true);
  assert.equal(isCampaignWorkspacePath("/campaigns/new"), true);
  assert.equal(isCampaignWorkspacePath("/campaigns/campaign-1/review"), true);
  assert.equal(isCampaignWorkspacePath("/campaigns/campaign-1"), false);
});
