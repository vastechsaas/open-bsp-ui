import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTemplateDraftInput,
  getTemplateEditorAccess,
  getTemplateActions,
  getInitialTemplateEditorStep,
  getTemplateContentErrors,
  getTemplateVariableIndexes,
  isTemplateWorkspacePath,
  removeTemplateBodyVariable,
  type TemplateEditorValues,
} from "../src/utils/TemplateDraftUtils.ts";

void test("new and draft templates start on Details", () => {
  assert.equal(getInitialTemplateEditorStep(), 1);
  assert.equal(getInitialTemplateEditorStep("draft"), 1);
  assert.equal(getInitialTemplateEditorStep("pending"), 3);
  assert.equal(getInitialTemplateEditorStep("approved"), 3);
  assert.equal(getInitialTemplateEditorStep("approved", true), 1);
});

void test("template actions follow the supported Meta status matrix", () => {
  assert.deepEqual(getTemplateActions("draft"), ["edit", "delete"]);
  for (const status of ["pending", "approved", "rejected"]) {
    assert.deepEqual(getTemplateActions(status), ["view", "edit", "delete"]);
  }
  for (const status of ["paused", "disabled", "pending_deletion", "deleted"]) {
    assert.deepEqual(getTemplateActions(status), ["view"]);
  }
});

void test("submitted editing unlocks content but keeps identity locked", () => {
  assert.deepEqual(getTemplateEditorAccess("draft"), {
    isSubmitted: false,
    isReadOnly: false,
    lockIdentity: false,
  });
  assert.deepEqual(getTemplateEditorAccess("approved"), {
    isSubmitted: true,
    isReadOnly: true,
    lockIdentity: true,
  });
  assert.deepEqual(getTemplateEditorAccess("approved", true), {
    isSubmitted: true,
    isReadOnly: false,
    lockIdentity: true,
  });
});

void test("template manager routes use the full-width workspace", () => {
  assert.equal(isTemplateWorkspacePath("/templates"), true);
  assert.equal(isTemplateWorkspacePath("/templates/new"), true);
  assert.equal(isTemplateWorkspacePath("/templates/template-1"), true);
  assert.equal(isTemplateWorkspacePath("/templates/template-1/edit"), true);
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
  assert.equal(isTemplateWorkspacePath("/integrations"), false);
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
    new URL(
      "../src/routes/_auth/templates/$templateId.edit.tsx",
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

void test("submitted mutations use local template ID endpoints", () => {
  const queries = readFileSync(
    new URL("../src/queries/useTemplates.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    queries,
    /`whatsapp-management\/templates\/\$\{templateId\}`,[\s\S]*?"PATCH"/,
  );
  assert.match(
    queries,
    /`whatsapp-management\/templates\/\$\{templateId\}`,[\s\S]*?"DELETE"/,
  );
});

void test("template variable indexes are unique and ordered", () => {
  assert.deepEqual(
    getTemplateVariableIndexes("Hello {{2}}, {{1}} and {{2}}"),
    [1, 2],
  );
});

void test("the only template variable can be removed with its sample", () => {
  assert.deepEqual(removeTemplateBodyVariable("Order {{1}}", ["#1234"], 1), {
    body: "Order",
    bodySamples: [],
  });
});

void test("removing the last body variable preserves earlier samples", () => {
  assert.deepEqual(
    removeTemplateBodyVariable(
      "Hello {{1}}, order {{2}} is ready.",
      ["Alice", "#1234"],
      2,
    ),
    {
      body: "Hello {{1}}, order is ready.",
      bodySamples: ["Alice"],
    },
  );
});

void test("removing a middle variable renumbers later variables and samples", () => {
  assert.deepEqual(
    removeTemplateBodyVariable(
      "Hello {{1}}, order {{2}} arrives {{3}}.",
      ["Alice", "#1234", "tomorrow"],
      2,
    ),
    {
      body: "Hello {{1}}, order arrives {{2}}.",
      bodySamples: ["Alice", "tomorrow"],
    },
  );
});

void test("removing a repeated variable removes every occurrence", () => {
  assert.deepEqual(
    removeTemplateBodyVariable(
      "Code {{2}} is the same as {{2}} for {{1}}.",
      ["Alice", "8492"],
      2,
    ),
    {
      body: "Code is the same as for {{1}}.",
      bodySamples: ["Alice"],
    },
  );
});

void test("variable removal controls are hidden in read-only mode", () => {
  const editor = readFileSync(
    new URL("../src/components/TemplateEditor.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    editor,
    /\{!readOnly && \([\s\S]*?aria-label=\{t\("Eliminar variable"\)\}/,
  );
  assert.match(
    editor,
    /\{!readOnly && \([\s\S]*?removeBodyVariable\(variable\)/,
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
