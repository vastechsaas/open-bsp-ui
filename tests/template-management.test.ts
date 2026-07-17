import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTemplateDraftInput,
  getTemplateContentErrors,
  getTemplateVariableIndexes,
  type TemplateEditorValues,
} from "../src/utils/TemplateDraftUtils.ts";

const readyTemplate: TemplateEditorValues = {
  organizationAddress: "15550000000",
  name: "order_update",
  language: "en",
  category: "UTILITY",
  header: "Order {{1}}",
  headerSample: "#1234",
  body: "Hello {{1}}, your order is ready.",
  bodySamples: ["Alice"],
  footer: "Reply for help",
  quickReplies: ["Confirm"],
};

void test("template variable indexes are unique and ordered", () => {
  assert.deepEqual(
    getTemplateVariableIndexes("Hello {{2}}, {{1}} and {{2}}"),
    [1, 2],
  );
});

void test("template readiness requires sequential variables and samples", () => {
  assert.deepEqual(getTemplateContentErrors(readyTemplate), []);
  assert.match(
    getTemplateContentErrors({
      ...readyTemplate,
      body: "Hello {{2}}",
      bodySamples: ["Alice"],
    }).join(" "),
    /sequential/,
  );
});

void test("template payload includes samples and quick replies", () => {
  const input = buildTemplateDraftInput(readyTemplate);
  assert.equal(
    input.components.find((item) => item.type === "BODY")?.text,
    readyTemplate.body,
  );
  assert.deepEqual(
    input.components.find((item) => item.type === "BUTTONS"),
    {
      type: "BUTTONS",
      buttons: [{ type: "QUICK_REPLY", text: "Confirm" }],
    },
  );
});
