import test from "node:test";
import assert from "node:assert/strict";
import {
  CHATBOT_MESSAGE_MAX_LENGTH,
  createChatbotNode,
  duplicateChatbotNode,
  ensureChatbotStartNode,
  getChatbotFlowDuplicateName,
  getChatbotFlowStatusLabel,
  getChatbotFlowVersionSummary,
  isChatbotEditorPath,
  isValidChatbotConnection,
  isChatbotWorkspacePath,
  normalizeChatbotEditorGraph,
  removeChatbotNode,
  updateChatbotMessageText,
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

void test("only chatbot editor routes remove the global application sidebar", () => {
  assert.equal(isChatbotEditorPath("/chatbots"), false);
  assert.equal(isChatbotEditorPath("/chatbots/"), false);
  assert.equal(
    isChatbotEditorPath("/chatbots/8f511a7e-e073-4a82-9468-a511f497b75d"),
    true,
  );
  assert.equal(
    isChatbotEditorPath("/chatbots/8f511a7e-e073-4a82-9468-a511f497b75d/"),
    true,
  );
  assert.equal(isChatbotEditorPath("/campaigns/example"), false);
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
  assert.equal(graph.nodes[0]?.type, "chatbotNode");
  assert.equal(graph.nodes[0]?.data.node_type, "start");
  assert.equal(graph.nodes[1]?.data.node_type, "send_message");
  assert.deepEqual(graph.edges[0]?.data, { kind: "default" });
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

void test("chatbot editor adds exactly one protected start to an empty graph", () => {
  const graph = ensureChatbotStartNode({ nodes: [], edges: [] });
  const unchanged = ensureChatbotStartNode(graph);

  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.nodes[0]?.id, "start-1");
  assert.equal(graph.nodes[0]?.data.node_type, "start");
  assert.equal(graph.nodes[0]?.deletable, false);
  assert.equal(unchanged, graph);
});

void test("core chatbot nodes use the compiler-compatible data contract", () => {
  const message = createChatbotNode(
    "send_message",
    { x: 120, y: 220 },
    "message-1",
  );
  const end = createChatbotNode("end", { x: 420, y: 220 }, "end-1");

  assert.deepEqual(message.data, {
    node_type: "send_message",
    nodeType: "send_message",
    label: "Enviar mensaje",
    config: { text: "" },
  });
  assert.equal(message.type, "chatbotNode");
  assert.equal(end.data.node_type, "end");
});

void test("core chatbot connection rules match compiler routing constraints", () => {
  const start = createChatbotNode("start", { x: 0, y: 0 }, "start");
  const message = createChatbotNode(
    "send_message",
    { x: 200, y: 0 },
    "message",
  );
  const end = createChatbotNode("end", { x: 400, y: 0 }, "end");
  const nodes = [start, message, end];

  assert.equal(
    isValidChatbotConnection({ source: "start", target: "message" }, nodes, []),
    true,
  );
  assert.equal(
    isValidChatbotConnection({ source: "message", target: "start" }, nodes, []),
    false,
  );
  assert.equal(
    isValidChatbotConnection({ source: "end", target: "message" }, nodes, []),
    false,
  );
  assert.equal(
    isValidChatbotConnection({ source: "start", target: "end" }, nodes, [
      { id: "edge-1", source: "start", target: "message" },
    ]),
    false,
  );
  assert.equal(
    isValidChatbotConnection({ source: "message", target: "start" }, nodes, [
      { id: "edge-1", source: "start", target: "message" },
    ]),
    false,
  );
});

void test("message updates, duplication, and deletion preserve protected graph data", () => {
  const start = createChatbotNode("start", { x: 0, y: 0 }, "start");
  const message = createChatbotNode(
    "send_message",
    { x: 200, y: 0 },
    "message",
  );
  const end = createChatbotNode("end", { x: 400, y: 0 }, "end");
  const updatedMessage = updateChatbotMessageText(
    message,
    "x".repeat(CHATBOT_MESSAGE_MAX_LENGTH + 10),
  );
  const duplicate = duplicateChatbotNode(updatedMessage, "message-copy");

  assert.equal(
    String(updatedMessage.data.config.text).length,
    CHATBOT_MESSAGE_MAX_LENGTH,
  );
  assert.equal(duplicate?.id, "message-copy");
  assert.deepEqual(duplicate?.position, { x: 236, y: 36 });
  assert.equal(duplicateChatbotNode(start, "start-copy"), null);

  const graph = {
    nodes: [start, message, end],
    edges: [
      { id: "start-message", source: "start", target: "message" },
      { id: "message-end", source: "message", target: "end" },
    ],
  };
  assert.equal(removeChatbotNode(graph, "start"), graph);
  assert.deepEqual(
    removeChatbotNode(graph, "message").nodes.map((node) => node.id),
    ["start", "end"],
  );
  assert.deepEqual(removeChatbotNode(graph, "message").edges, []);
});
