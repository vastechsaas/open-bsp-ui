import test from "node:test";
import assert from "node:assert/strict";
import {
  getChatbotFlowDuplicateName,
  getChatbotFlowStatusLabel,
  getChatbotFlowVersionSummary,
  isChatbotWorkspacePath,
} from "../src/utils/ChatbotFlowUtils.ts";

void test("chatbot listing uses the full workspace layout", () => {
  assert.equal(isChatbotWorkspacePath("/chatbots"), true);
  assert.equal(isChatbotWorkspacePath("/chatbots/"), true);
  assert.equal(isChatbotWorkspacePath("/campaigns"), false);
});

void test("chatbot status labels are stable for listing badges", () => {
  assert.equal(getChatbotFlowStatusLabel("active"), "Activo");
  assert.equal(getChatbotFlowStatusLabel("archived"), "Archivado");
  assert.equal(getChatbotFlowStatusLabel("unknown"), "unknown");
});

void test("chatbot version summaries distinguish drafts and unpublished flows", () => {
  assert.deepEqual(
    getChatbotFlowVersionSummary({
      draftVersion: 3,
      publishedVersion: 2,
    }),
    { draft: "v3", published: "v2" },
  );
  assert.deepEqual(
    getChatbotFlowVersionSummary({
      draftVersion: 1,
      publishedVersion: null,
    }),
    { draft: "v1", published: "Sin publicar" },
  );
});

void test("chatbot duplication uses a predictable editable name", () => {
  assert.equal(getChatbotFlowDuplicateName("  Ventas  "), "Ventas (copia)");
});
