import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChatbotValidationField,
  ChatbotValidationFields,
} from "../src/components/chatbots/ChatbotValidationField.tsx";
import {
  chatbotValidationIssueKey,
  createChatbotManagementError,
  ChatbotPublishValidationError,
  createChatbotNode,
  findChatbotValidationField,
  formatChatbotValidationIssue,
  getChatbotListRowTitleLimit,
  getChatbotValidationFieldLabel,
  getChatbotValidationFieldPath,
  getChatbotValidationFocusTarget,
  getChatbotValidationMessageKey,
  groupChatbotValidationIssues,
  normalizeChatbotEditorGraph,
  updateChatbotInteractiveConfig,
  type ChatbotFlowValidationIssue,
} from "../src/utils/ChatbotFlowUtils.ts";

const locale = (lang: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../public/locales/${lang}.json`, import.meta.url),
      "utf8",
    ),
  ) as Record<string, string>;
const en = locale("en");
const translate = (text: string) => en[text] ?? text;
const issue = (index = 2): ChatbotFlowValidationIssue => ({
  code: "button_title_too_long",
  path: ["nodes", 7, "config", "sections", 0, "rows", index, "title"],
  node_id: "profile",
  field: "sections",
  field_path: ["sections", 0, "rows", index, "title"],
  params: { option: index + 1, limit: 20, actual: index + 19 },
  message: "Untrusted schema fallback",
});

void test("both DKR title errors stay visible, localized and uniquely keyed", () => {
  const issues = [issue(2), issue(3)];
  assert.equal(
    formatChatbotValidationIssue(issues[0], translate),
    "Option 3: button title exceeds 20 characters (currently 21).",
  );
  assert.equal(
    formatChatbotValidationIssue(issues[1], translate),
    "Option 4: button title exceeds 20 characters (currently 22).",
  );
  assert.notEqual(
    chatbotValidationIssueKey(issues[0]),
    chatbotValidationIssueKey(issues[1]),
  );
  const groups = groupChatbotValidationIssues(issues, {
    profile: "Profile & Matches",
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].issues.length, 2);
  assert.equal(getChatbotValidationFieldLabel(issues[0], translate), "Title");
  for (const lang of ["en", "fr", "pt", "sw"]) {
    const data = locale(lang);
    assert.ok(data[getChatbotValidationMessageKey(issues[0])]);
    assert.equal(
      formatChatbotValidationIssue(
        issues[0],
        (key) => data[key] ?? key,
      ).includes("{option}"),
      false,
    );
  }
});

void test("exact field navigation wins over broad legacy sections; old responses still work", () => {
  const target = getChatbotValidationFocusTarget(issue());
  assert.deepEqual(target, {
    kind: "node",
    id: "profile",
    field: "sections",
    field_path: ["sections", 0, "rows", 2, "title"],
  });
  const elements = [
    { dataset: { validationField: "sections" } },
    { dataset: { validationPath: JSON.stringify(issue().field_path) } },
  ];
  assert.equal(
    findChatbotValidationField(elements, JSON.stringify(issue().field_path)),
    elements[1],
  );
  assert.equal(findChatbotValidationField(elements, "sections"), elements[0]);
  const old = { ...issue(), field_path: undefined, params: undefined };
  assert.deepEqual(getChatbotValidationFieldPath(old), [
    "sections",
    0,
    "rows",
    2,
    "title",
  ]);
  assert.deepEqual(
    getChatbotValidationFocusTarget({
      code: "x",
      path: [],
      message: "x",
      edge_id: "edge",
    }),
    { kind: "edge", id: "edge" },
  );
});

void test("inline error highlights only the exact input; imported oversized text is preserved", () => {
  const field = (index: number) =>
    createElement(ChatbotValidationField, {
      key: index,
      path: ["sections", 0, "rows", index, "title"],
      counter: true,
      children: createElement("input", {
        value: index === 2 ? "Non relevant settings" : "Other",
        maxLength: 20,
        readOnly: true,
      }),
    });
  const html = renderToStaticMarkup(
    createElement(ChatbotValidationFields, {
      issues: [issue()],
      translate,
      children: [field(2), field(1)],
    }),
  );
  assert.equal((html.match(/role="alert"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-invalid="true"/g) ?? []).length, 1);
  assert.match(html, /21\/20/);
  assert.match(html, /Non relevant settings/);
  const stale = renderToStaticMarkup(
    createElement(ChatbotValidationFields, {
      issues: [],
      translate,
      children: field(2),
    }),
  );
  assert.doesNotMatch(stale, /role="alert"/);
  assert.match(stale, /aria-invalid="true"/); // local length guidance remains useful after editing
});

void test("switching list mode changes the limit without rewriting imported titles", () => {
  const list = createChatbotNode("list_message", { x: 0, y: 0 }, "list");
  list.data.config.sections = [
    {
      id: "s",
      title: "Section",
      rows: [{ id: "r", title: "Non relevant settings" }],
    },
  ];
  const changed = updateChatbotInteractiveConfig(list, {
    render_as_buttons: true,
  });
  assert.equal(
    changed.data.config.sections?.[0].rows[0].title,
    "Non relevant settings",
  );
  assert.equal(getChatbotListRowTitleLimit(true), 20);
  assert.equal(getChatbotListRowTitleLimit(false), 24);
  assert.equal(
    normalizeChatbotEditorGraph({ nodes: [changed], edges: [] }).nodes[0].data
      .config.sections?.[0].rows[0].title,
    "Non relevant settings",
  );
});

void test("publish errors retain safe metadata; malformed metadata is rejected", () => {
  const parsed = createChatbotManagementError(422, {
    issues: [issue(), { ...issue(), params: { secret: "not safe" } }],
  });
  assert.ok(parsed instanceof ChatbotPublishValidationError);
  assert.equal(parsed.issues.length, 1);
  assert.deepEqual(parsed.issues[0].params, issue().params);
  assert.equal(
    createChatbotManagementError(500, { message: "Server unavailable" })
      .message,
    "Server unavailable",
  );
});

void test("stale results cannot navigate to nested fields until revalidated", () => {
  const route = readFileSync(
    new URL("../src/routes/_auth/chatbots/$flowId.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    route,
    /validationFieldFingerprint !== currentValidationFingerprint/,
  );
  assert.match(route, /!validationIsStale && validationResult/);
  assert.match(route, /getChatbotListRowTitleLimit\(/);
  assert.doesNotMatch(route, /row\.title\.slice\(|row\.title\.substring\(/);
});
