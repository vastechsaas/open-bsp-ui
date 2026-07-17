import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTemplateDraftInput,
  getInitialTemplateEditorStep,
  getTemplateContentErrors,
  getTemplateVariableIndexes,
  isTemplateWorkspacePath,
  type TemplateEditorValues,
} from "../src/utils/TemplateDraftUtils.ts";

void test("new and draft templates start on Details", () => {
  assert.equal(getInitialTemplateEditorStep(), 1);
  assert.equal(getInitialTemplateEditorStep("draft"), 1);
  assert.equal(getInitialTemplateEditorStep("pending"), 3);
  assert.equal(getInitialTemplateEditorStep("approved"), 3);
});

void test("template manager routes use the full-width workspace", () => {
  assert.equal(
    isTemplateWorkspacePath("/integrations/whatsapp/account-1/templates"),
    true,
  );
  assert.equal(
    isTemplateWorkspacePath("/integrations/whatsapp/account-1/templates/new"),
    true,
  );
  assert.equal(
    isTemplateWorkspacePath(
      "/integrations/whatsapp/account-1/templates/template-1",
    ),
    true,
  );
  assert.equal(
    isTemplateWorkspacePath("/integrations/whatsapp/account-1/profile"),
    false,
  );
});

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

void test("template manager labels exist in every supported locale", () => {
  const sourceFiles = [
    new URL("../src/components/TemplateEditor.tsx", import.meta.url),
    new URL(
      "../src/routes/_auth/integrations/whatsapp/$orgAddressId/templates/index.tsx",
      import.meta.url,
    ),
  ];
  const keys = [
    ...new Set(
      sourceFiles.flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/t\(\s*"([^"]+)"/g)].map(
          (match) => match[1],
        ),
      ),
    ),
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    const missing = keys.filter((key) => !translations[key]);
    assert.deepEqual(missing, [], `${language} is missing template labels`);
  }
});

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
    /secuenciales/,
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
