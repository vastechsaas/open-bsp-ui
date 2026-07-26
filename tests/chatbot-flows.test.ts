import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addChatbotConditionBranch,
  chatbotConditionOperators,
  ChatbotDraftConflictError,
  CHATBOT_MESSAGE_MAX_LENGTH,
  createChatbotManagementError,
  createChatbotNode,
  duplicateChatbotNode,
  ensureChatbotStartNode,
  getAvailableChatbotVariables,
  getChatbotConditionEdgeLabel,
  getChatbotDraftSaveStatus,
  getChatbotEditorGraphFingerprint,
  getChatbotFlowDuplicateName,
  getChatbotFlowStatusLabel,
  getChatbotFlowVersionSummary,
  isChatbotEditorPath,
  isValidChatbotConnection,
  isChatbotWorkspacePath,
  normalizeChatbotEditorGraph,
  removeChatbotNode,
  removeChatbotConditionBranch,
  serializeChatbotEditorGraph,
  updateChatbotCollectInputConfig,
  updateChatbotConditionBranch,
  updateChatbotConditionVariable,
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

void test("draft serialization persists stable graph data and the viewport", () => {
  const input = updateChatbotCollectInputConfig(
    createChatbotNode("collect_input", { x: 12.345678, y: 90 }, "input"),
    {
      prompt: "Which city?",
      variable: "customer_city",
      required: true,
      min_length: undefined,
    },
  );
  input.selected = true;
  input.measured = { width: 220, height: 100 };

  const graph = serializeChatbotEditorGraph({
    nodes: [input],
    edges: [
      {
        id: "input-end",
        source: "input",
        target: "end",
        selected: true,
        data: { kind: "default" },
      },
    ],
    viewport: { x: 10.123456, y: -4.987654, zoom: 0.876543 },
  });

  assert.deepEqual(graph.nodes[0], {
    id: "input",
    type: "chatbotNode",
    position: { x: 12.3457, y: 90 },
    deletable: true,
    data: {
      node_type: "collect_input",
      nodeType: "collect_input",
      label: "Recopilar respuesta",
      config: {
        prompt: "Which city?",
        variable: "customer_city",
        required: true,
      },
    },
  });
  assert.deepEqual(graph.edges[0], {
    id: "input-end",
    source: "input",
    target: "end",
    sourceHandle: null,
    targetHandle: null,
    type: "smoothstep",
    animated: false,
    data: { kind: "default" },
  });
  assert.deepEqual(graph.viewport, {
    x: 10.1235,
    y: -4.9877,
    zoom: 0.8765,
  });
});

void test("draft fingerprints ignore selection but detect authored and viewport changes", () => {
  const message = createChatbotNode(
    "send_message",
    { x: 100, y: 100 },
    "message",
  );
  const base = {
    nodes: [message],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
  const selected = {
    ...base,
    nodes: [{ ...message, selected: true }],
  };
  const moved = {
    ...base,
    nodes: [{ ...message, position: { x: 140, y: 100 } }],
  };
  const panned = {
    ...base,
    viewport: { x: 20, y: 0, zoom: 1 },
  };

  assert.equal(
    getChatbotEditorGraphFingerprint(base),
    getChatbotEditorGraphFingerprint(selected),
  );
  assert.notEqual(
    getChatbotEditorGraphFingerprint(base),
    getChatbotEditorGraphFingerprint(moved),
  );
  assert.notEqual(
    getChatbotEditorGraphFingerprint(base),
    getChatbotEditorGraphFingerprint(panned),
  );
});

void test("draft save status prioritizes active saves and concurrency conflicts", () => {
  assert.equal(
    getChatbotDraftSaveStatus({
      dirty: true,
      saving: true,
      failed: true,
      conflict: true,
    }),
    "saving",
  );
  assert.equal(
    getChatbotDraftSaveStatus({
      dirty: true,
      saving: false,
      failed: true,
      conflict: true,
    }),
    "conflict",
  );
  assert.equal(
    getChatbotDraftSaveStatus({
      dirty: true,
      saving: false,
      failed: true,
      conflict: false,
    }),
    "error",
  );
  assert.equal(
    getChatbotDraftSaveStatus({
      dirty: true,
      saving: false,
      failed: false,
      conflict: false,
    }),
    "dirty",
  );
  assert.equal(
    getChatbotDraftSaveStatus({
      dirty: false,
      saving: false,
      failed: false,
      conflict: false,
    }),
    "saved",
  );

  const conflict = new ChatbotDraftConflictError(
    "Draft changed",
    "2026-07-26T12:00:00.000Z",
  );
  assert.equal(conflict.name, "ChatbotDraftConflictError");
  assert.equal(conflict.currentUpdatedAt, "2026-07-26T12:00:00.000Z");

  const responseConflict = createChatbotManagementError(409, {
    message: "Draft changed remotely",
    current_updated_at: "2026-07-26T13:00:00.000Z",
  });
  assert.ok(responseConflict instanceof ChatbotDraftConflictError);
  assert.equal(responseConflict.message, "Draft changed remotely");
  assert.equal(responseConflict.currentUpdatedAt, "2026-07-26T13:00:00.000Z");
  assert.equal(
    createChatbotManagementError(500, { message: "Save failed" }).message,
    "Save failed",
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

void test("input and condition nodes use the exact compiler-compatible contract", () => {
  const input = createChatbotNode(
    "collect_input",
    { x: 120, y: 220 },
    "input-1",
  );
  const condition = createChatbotNode(
    "condition",
    { x: 420, y: 220 },
    "condition-1",
  );

  assert.deepEqual(input.data.config, {
    prompt: "",
    variable: "",
    required: true,
  });
  assert.deepEqual(condition.data.config, { variable: "" });
  assert.equal(condition.data.branches?.length, 1);
  assert.deepEqual(chatbotConditionOperators, [
    "equals",
    "not_equals",
    "contains",
    "starts_with",
    "ends_with",
  ]);
});

void test("input and condition inspector updates preserve node contracts", () => {
  const input = updateChatbotCollectInputConfig(
    createChatbotNode("collect_input", { x: 0, y: 0 }, "input"),
    {
      prompt: "Which city?",
      variable: "customer_city",
      required: false,
      min_length: 2,
      max_length: 80,
    },
  );
  let condition = updateChatbotConditionVariable(
    createChatbotNode("condition", { x: 200, y: 0 }, "condition"),
    "customer_city",
  );
  const firstBranch = condition.data.branches?.[0];
  assert.ok(firstBranch);
  condition = updateChatbotConditionBranch(condition, firstBranch.id, {
    operator: "contains",
    value: "karachi",
  });
  condition = addChatbotConditionBranch(condition, {
    id: "second-branch",
    operator: "not_equals",
    value: "lahore",
  });

  assert.deepEqual(input.data.config, {
    prompt: "Which city?",
    variable: "customer_city",
    required: false,
    min_length: 2,
    max_length: 80,
  });
  assert.equal(condition.data.config.variable, "customer_city");
  assert.deepEqual(condition.data.branches?.[0], {
    id: firstBranch.id,
    operator: "contains",
    value: "karachi",
  });
  assert.equal(condition.data.branches?.length, 2);
  assert.equal(
    removeChatbotConditionBranch(condition, "second-branch").data.branches
      ?.length,
    1,
  );
  assert.equal(
    removeChatbotConditionBranch(
      removeChatbotConditionBranch(condition, "second-branch"),
      firstBranch.id,
    ).data.branches?.length,
    1,
  );
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

void test("condition connections require one edge per branch and a fallback", () => {
  const input = createChatbotNode("collect_input", { x: 0, y: 0 }, "input");
  const condition = createChatbotNode(
    "condition",
    { x: 200, y: 0 },
    "condition",
  );
  const firstBranch = condition.data.branches?.[0];
  const endA = createChatbotNode("end", { x: 400, y: 0 }, "end-a");
  const endB = createChatbotNode("end", { x: 400, y: 160 }, "end-b");
  assert.ok(firstBranch);
  const nodes = [input, condition, endA, endB];

  assert.equal(
    isValidChatbotConnection(
      { source: "condition", target: "end-a" },
      nodes,
      [],
    ),
    false,
  );
  assert.equal(
    isValidChatbotConnection(
      {
        source: "condition",
        target: "end-a",
        sourceHandle: firstBranch.id,
      },
      nodes,
      [],
    ),
    true,
  );
  const conditionalEdge = {
    id: "condition-a",
    source: "condition",
    target: "end-a",
    sourceHandle: firstBranch.id,
  };
  assert.equal(
    isValidChatbotConnection(
      {
        source: "condition",
        target: "end-b",
        sourceHandle: firstBranch.id,
      },
      nodes,
      [conditionalEdge],
    ),
    false,
  );
  assert.equal(
    isValidChatbotConnection(
      {
        source: "condition",
        target: "end-a",
        sourceHandle: "default",
      },
      nodes,
      [conditionalEdge],
    ),
    true,
  );
});

void test("conditions only expose variables collected on every incoming path", () => {
  const start = createChatbotNode("start", { x: 0, y: 0 }, "start");
  const input = updateChatbotCollectInputConfig(
    createChatbotNode("collect_input", { x: 150, y: 0 }, "input"),
    { variable: "customer_city" },
  );
  const message = createChatbotNode(
    "send_message",
    { x: 150, y: 160 },
    "message",
  );
  const condition = createChatbotNode(
    "condition",
    { x: 350, y: 0 },
    "condition",
  );
  const nodes = [start, input, message, condition];

  assert.deepEqual(
    getAvailableChatbotVariables("condition", nodes, [
      { id: "start-input", source: "start", target: "input" },
      { id: "input-condition", source: "input", target: "condition" },
    ]),
    ["customer_city"],
  );
  assert.deepEqual(
    getAvailableChatbotVariables("condition", nodes, [
      { id: "start-input", source: "start", target: "input" },
      { id: "input-condition", source: "input", target: "condition" },
      { id: "start-message", source: "start", target: "message" },
      { id: "message-condition", source: "message", target: "condition" },
    ]),
    [],
  );
});

void test("condition graph normalization keeps branch routing metadata", () => {
  const graph = normalizeChatbotEditorGraph({
    nodes: [
      {
        id: "condition",
        position: { x: 100, y: 100 },
        data: {
          node_type: "condition",
          config: { variable: "customer_city" },
          branches: [{ id: "karachi", operator: "equals", value: "karachi" }],
        },
      },
      {
        id: "end-a",
        position: { x: 400, y: 20 },
        data: { node_type: "end", config: {} },
      },
      {
        id: "end-b",
        position: { x: 400, y: 180 },
        data: { node_type: "end", config: {} },
      },
    ],
    edges: [
      {
        id: "karachi-edge",
        source: "condition",
        sourceHandle: "karachi",
        target: "end-a",
        data: { kind: "condition", operator: "equals", value: "karachi" },
      },
      {
        id: "fallback-edge",
        source: "condition",
        sourceHandle: "default",
        target: "end-b",
        data: { kind: "default" },
      },
    ],
  });

  assert.deepEqual(graph.edges[0]?.data, {
    kind: "condition",
    operator: "equals",
    value: "karachi",
  });
  assert.equal(graph.edges[0]?.sourceHandle, "karachi");
  assert.equal(graph.edges[0]?.label, "equals · karachi");
  assert.equal(graph.edges[1]?.sourceHandle, "default");
  assert.equal(graph.edges[1]?.label, "Fallback");
  assert.deepEqual(graph.nodes[0]?.data.branches, [
    { id: "karachi", operator: "equals", value: "karachi" },
  ]);
  assert.equal(
    getChatbotConditionEdgeLabel("condition", "starts_with", "ka"),
    "starts with · ka",
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

void test("duplicating a condition regenerates branch handle identifiers", () => {
  const condition = createChatbotNode(
    "condition",
    { x: 200, y: 100 },
    "condition",
  );
  const duplicate = duplicateChatbotNode(condition, "condition-copy");

  assert.ok(duplicate);
  assert.equal(duplicate.data.branches?.length, 1);
  assert.notEqual(
    duplicate.data.branches?.[0]?.id,
    condition.data.branches?.[0]?.id,
  );
});

void test("input and condition editor labels exist in every supported locale", () => {
  const keys = [
    "Recopilar respuesta",
    "Pregunta y guarda una variable",
    "Condición",
    "Divide el flujo según una variable",
    "Pregunta requerida",
    "Variable requerida",
    "Pregunta",
    "Guardar en variable",
    "Respuesta obligatoria",
    "Variable a evaluar",
    "Ramas condicionales",
    "Agregar rama",
    "Valor de comparación",
    "Fallback",
    "Igual a",
    "Distinto de",
    "Contiene",
    "Comienza con",
    "Termina con",
    "Guardar",
    "Guardado",
    "Cambios sin guardar",
    "Conflicto de edición",
    "Error al guardar",
    "Recargar borrador del servidor",
    "¿Salir sin guardar?",
    "¿Descartar cambios locales?",
    "Seguir editando",
    "Salir sin guardar",
    "Descartar y recargar",
    "Inicio es único y está protegido. Guardá el borrador para conservar los cambios.",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;

    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing chatbot input or condition labels`,
    );
  }
});
