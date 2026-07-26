import test from "node:test";
import assert from "node:assert/strict";
import {
  getChatbotFlowDuplicateName,
  getChatbotFlowStatusLabel,
  getChatbotFlowVersionSummary,
  isChatbotWorkspacePath,
  normalizeChatbotEditorGraph,
} from "../src/utils/ChatbotFlowUtils.ts";

void test("chatbot listing uses the full workspace layout", () => {
  assert.equal(isChatbotWorkspacePath("/chatbots"), true);
  assert.equal(isChatbotWorkspacePath("/chatbots/"), true);
  assert.equal(
    isChatbotWorkspacePath("/chatbots/8f511a7e-e073-4a82-9468-a511f497b75d"),
    true,
  );
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

void test("chatbot editor graph normalization keeps safe connected elements", () => {
  const graph = normalizeChatbotEditorGraph({
    nodes: [
      {
        id: "start",
        type: "flowNode",
        position: { x: 80, y: 120 },
        data: { nodeType: "START", label: "Inicio" },
      },
      {
        id: "message",
        position: { x: 320, y: 120 },
        data: { nodeType: "MESSAGE" },
      },
      {
        id: "invalid",
        position: { x: "wrong", y: 0 },
      },
    ],
    edges: [
      {
        id: "start-message",
        source: "start",
        target: "message",
      },
      {
        id: "orphan",
        source: "message",
        target: "missing",
      },
    ],
    viewport: { x: 12, y: 24, zoom: 0.8 },
  });

  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    ["start", "message"],
  );
  assert.deepEqual(
    graph.edges.map((edge) => edge.id),
    ["start-message"],
  );
  assert.deepEqual(graph.viewport, { x: 12, y: 24, zoom: 0.8 });
  assert.equal(graph.nodes[0]?.type, "default");
});

void test("chatbot editor graph normalization rejects malformed graph data", () => {
  assert.deepEqual(normalizeChatbotEditorGraph(null), {
    nodes: [],
    edges: [],
  });
  assert.deepEqual(
    normalizeChatbotEditorGraph({
      nodes: "not-an-array",
      edges: [{ id: "bad" }],
      viewport: { x: 0, y: 0, zoom: 0 },
    }),
    { nodes: [], edges: [], viewport: undefined },
  );
});
