import type { Edge, Node, Viewport, XYPosition } from "@xyflow/react";

export type ChatbotFlowStatus = "active" | "archived";
export const CHATBOT_MESSAGE_MAX_LENGTH = 4096;
export const CHATBOT_INPUT_MAX_LENGTH = 4096;
export const CHATBOT_INTERACTIVE_BODY_MAX_LENGTH = 1024;
export const CHATBOT_REPLY_BUTTON_MAX_COUNT = 3;
export const CHATBOT_REPLY_BUTTON_TITLE_MAX_LENGTH = 20;
export const CHATBOT_LIST_BUTTON_TEXT_MAX_LENGTH = 20;
export const CHATBOT_LIST_MAX_ROWS = 10;
export const CHATBOT_LIST_SECTION_TITLE_MAX_LENGTH = 24;
export const CHATBOT_LIST_ROW_TITLE_MAX_LENGTH = 24;
export const CHATBOT_LIST_ROW_DESCRIPTION_MAX_LENGTH = 72;

export type ChatbotCoreNodeType =
  | "start"
  | "send_message"
  | "interactive_buttons"
  | "list_message"
  | "collect_input"
  | "condition"
  | "end";

export type ChatbotConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with";

export type ChatbotConditionBranch = {
  id: string;
  operator: ChatbotConditionOperator;
  value: string;
};

export type ChatbotReplyButton = {
  id: string;
  title: string;
};

export type ChatbotListRow = {
  id: string;
  title: string;
  description?: string;
};

export type ChatbotListSection = {
  id: string;
  title: string;
  rows: ChatbotListRow[];
};

export type ChatbotNodeConfig = {
  text?: string;
  prompt?: string;
  variable?: string;
  required?: boolean;
  min_length?: number;
  max_length?: number;
  body?: string;
  buttons?: ChatbotReplyButton[];
  button_text?: string;
  sections?: ChatbotListSection[];
  [key: string]: unknown;
};

export type ChatbotNodeData = {
  node_type: string;
  nodeType: string;
  label: string;
  config: ChatbotNodeConfig;
  branches?: ChatbotConditionBranch[];
  [key: string]: unknown;
};

export type ChatbotFlowNode = Node<ChatbotNodeData>;
export type ChatbotFlowEdge = Edge<{
  kind: string;
  operator?: ChatbotConditionOperator;
  value?: string;
  option_id?: string;
  [key: string]: unknown;
}>;

export function isChatbotWorkspacePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return (
    normalizedPath === "/chatbots" || normalizedPath.startsWith("/chatbots/")
  );
}

export function isChatbotEditorPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return normalizedPath.startsWith("/chatbots/");
}

export function getChatbotFlowStatusLabel(status: string) {
  if (status === "active") return "Activo";
  if (status === "archived") return "Archivado";
  return status;
}

export function getChatbotFlowDuplicateName(name: string) {
  return `${name.trim()} (copia)`;
}

export function getChatbotFlowVersionSummary({
  draftVersion,
  publishedVersion,
}: {
  draftVersion: number | null;
  publishedVersion: number | null;
}) {
  return {
    draft: draftVersion ? `v${draftVersion}` : "—",
    published: publishedVersion ? `v${publishedVersion}` : "Sin publicar",
  };
}

export type ChatbotEditorGraph = {
  nodes: ChatbotFlowNode[];
  edges: ChatbotFlowEdge[];
  viewport?: Viewport;
};

export type ChatbotDraftSaveStatus =
  | "saved"
  | "dirty"
  | "saving"
  | "error"
  | "conflict";

export type ChatbotEditorShortcut =
  | "save"
  | "delete-selected"
  | "dismiss"
  | null;

export type ChatbotEditorActionAvailability = {
  canSave: boolean;
  canValidate: boolean;
  canPublish: boolean;
  canDeleteSelected: boolean;
  canViewVersions: boolean;
};

export type ChatbotFlowValidationIssue = {
  code: string;
  path: Array<string | number>;
  message: string;
  node_id?: string;
  edge_id?: string;
};

export type ChatbotFlowValidationResult =
  | { valid: true; definition: unknown }
  | { valid: false; issues: ChatbotFlowValidationIssue[] };

export class ChatbotDraftConflictError extends Error {
  currentUpdatedAt: string | null;

  constructor(message: string, currentUpdatedAt?: string | null) {
    super(message);
    this.name = "ChatbotDraftConflictError";
    this.currentUpdatedAt = currentUpdatedAt ?? null;
  }
}

export class ChatbotPublishValidationError extends Error {
  issues: ChatbotFlowValidationIssue[];

  constructor(message: string, issues: ChatbotFlowValidationIssue[] = []) {
    super(message);
    this.name = "ChatbotPublishValidationError";
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isChatbotFlowValidationIssue(
  value: unknown,
): value is ChatbotFlowValidationIssue {
  if (!isRecord(value)) return false;
  return (
    typeof value.code === "string" &&
    Array.isArray(value.path) &&
    typeof value.message === "string" &&
    (value.node_id === undefined || typeof value.node_id === "string") &&
    (value.edge_id === undefined || typeof value.edge_id === "string")
  );
}

export function createChatbotManagementError(
  status: number | undefined,
  payload: unknown,
) {
  const body = isRecord(payload) ? payload : {};
  const message =
    typeof body.message === "string"
      ? body.message
      : "Chatbot management request failed";
  if (status === 409) {
    return new ChatbotDraftConflictError(
      message,
      typeof body.current_updated_at === "string"
        ? body.current_updated_at
        : null,
    );
  }
  if (status === 422) {
    return new ChatbotPublishValidationError(
      message,
      Array.isArray(body.issues)
        ? body.issues.filter(isChatbotFlowValidationIssue)
        : [],
    );
  }
  return new Error(message);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundGraphNumber(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function omitUndefinedValues(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

export function serializeChatbotEditorGraph(
  graph: ChatbotEditorGraph,
): ChatbotEditorGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type ?? "chatbotNode",
      position: {
        x: roundGraphNumber(node.position.x),
        y: roundGraphNumber(node.position.y),
      },
      deletable: node.data.node_type !== "start",
      data: {
        node_type: node.data.node_type,
        nodeType: node.data.node_type,
        label: node.data.label,
        config: omitUndefinedValues(node.data.config),
        ...(node.data.branches
          ? {
              branches: node.data.branches.map((branch) => ({
                id: branch.id,
                operator: branch.operator,
                value: branch.value,
              })),
            }
          : {}),
      },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      type: edge.type ?? "smoothstep",
      animated: edge.animated === true,
      data:
        edge.data?.kind === "condition"
          ? {
              kind: "condition",
              operator: edge.data.operator ?? "equals",
              value: edge.data.value ?? "",
            }
          : edge.data?.kind === "option"
            ? {
                kind: "option",
                option_id: edge.data.option_id ?? edge.sourceHandle ?? "",
              }
            : { kind: "default" },
    })),
    ...(graph.viewport
      ? {
          viewport: {
            x: roundGraphNumber(graph.viewport.x),
            y: roundGraphNumber(graph.viewport.y),
            zoom: roundGraphNumber(graph.viewport.zoom),
          },
        }
      : {}),
  };
}

export function getChatbotEditorGraphFingerprint(graph: ChatbotEditorGraph) {
  return JSON.stringify(serializeChatbotEditorGraph(graph));
}

export function getChatbotEditorValidationFingerprint(
  graph: ChatbotEditorGraph,
) {
  const serialized = serializeChatbotEditorGraph(graph);
  return JSON.stringify({
    nodes: serialized.nodes,
    edges: serialized.edges,
  });
}

export function getChatbotDraftSaveStatus({
  dirty,
  saving,
  failed,
  conflict,
}: {
  dirty: boolean;
  saving: boolean;
  failed: boolean;
  conflict: boolean;
}): ChatbotDraftSaveStatus {
  if (saving) return "saving";
  if (conflict) return "conflict";
  if (failed) return "error";
  return dirty ? "dirty" : "saved";
}

export function getChatbotEditorShortcut({
  key,
  ctrlKey = false,
  metaKey = false,
  altKey = false,
  shiftKey = false,
  editableTarget = false,
  composing = false,
}: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  editableTarget?: boolean;
  composing?: boolean;
}): ChatbotEditorShortcut {
  if (editableTarget || composing) return null;

  const normalizedKey = key.toLowerCase();
  const primaryModifier = ctrlKey || metaKey;
  if (normalizedKey === "s" && primaryModifier && !altKey && !shiftKey) {
    return "save";
  }
  if (
    !primaryModifier &&
    !altKey &&
    !shiftKey &&
    (normalizedKey === "delete" || normalizedKey === "backspace")
  ) {
    return "delete-selected";
  }
  if (normalizedKey === "escape" && !primaryModifier && !altKey && !shiftKey) {
    return "dismiss";
  }
  return null;
}

export function getChatbotEditorActionAvailability({
  dirty,
  saving,
  validating,
  publishing,
  conflict,
  archived,
  selectedNodeType,
}: {
  dirty: boolean;
  saving: boolean;
  validating: boolean;
  publishing: boolean;
  conflict: boolean;
  archived: boolean;
  selectedNodeType?: string;
}): ChatbotEditorActionAvailability {
  const busy = saving || validating || publishing;
  const editable = !archived && !conflict && !busy;

  return {
    canSave: editable && dirty,
    canValidate: editable,
    canPublish: editable && !dirty,
    canDeleteSelected:
      editable &&
      selectedNodeType !== undefined &&
      selectedNodeType !== "start",
    canViewVersions: true,
  };
}

const legacyNodeTypes: Record<string, ChatbotCoreNodeType> = {
  START: "start",
  MESSAGE: "send_message",
  SEND_MESSAGE: "send_message",
  BUTTON: "interactive_buttons",
  INTERACTIVE_BUTTONS: "interactive_buttons",
  LIST: "list_message",
  LIST_MESSAGE: "list_message",
  INPUT: "collect_input",
  COLLECT_INPUT: "collect_input",
  CONDITION: "condition",
  END: "end",
};

export const chatbotConditionOperators: ChatbotConditionOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "starts_with",
  "ends_with",
];

export function normalizeChatbotNodeType(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmedValue = value.trim();
  return legacyNodeTypes[trimmedValue.toUpperCase()] ?? trimmedValue;
}

export function isChatbotCoreNodeType(
  value: unknown,
): value is ChatbotCoreNodeType {
  return (
    value === "start" ||
    value === "send_message" ||
    value === "interactive_buttons" ||
    value === "list_message" ||
    value === "collect_input" ||
    value === "condition" ||
    value === "end"
  );
}

export function getChatbotNodeDefaultLabel(type: ChatbotCoreNodeType) {
  if (type === "start") return "Inicio";
  if (type === "send_message") return "Enviar mensaje";
  if (type === "interactive_buttons") return "Botones interactivos";
  if (type === "list_message") return "Mensaje de lista";
  if (type === "collect_input") return "Recopilar respuesta";
  if (type === "condition") return "Condición";
  return "Fin";
}

function createStableNodeId(type: ChatbotCoreNodeType) {
  return `${type}-${crypto.randomUUID()}`;
}

function createConditionBranchId() {
  return `branch-${crypto.randomUUID()}`;
}

function createOptionId(prefix: "button" | "row" | "section") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createChatbotReplyButton(title = ""): ChatbotReplyButton {
  return { id: createOptionId("button"), title };
}

export function createChatbotListRow(title = ""): ChatbotListRow {
  return { id: createOptionId("row"), title, description: "" };
}

export function createChatbotListSection(): ChatbotListSection {
  return {
    id: createOptionId("section"),
    title: "",
    rows: [createChatbotListRow()],
  };
}

export function createChatbotConditionBranch(
  overrides: Partial<ChatbotConditionBranch> = {},
): ChatbotConditionBranch {
  return {
    id: overrides.id ?? createConditionBranchId(),
    operator: overrides.operator ?? "equals",
    value: overrides.value ?? "",
  };
}

export function createChatbotNode(
  type: ChatbotCoreNodeType,
  position: XYPosition,
  id = createStableNodeId(type),
): ChatbotFlowNode {
  return {
    id,
    type: "chatbotNode",
    position,
    deletable: type !== "start",
    data: {
      node_type: type,
      nodeType: type,
      label: getChatbotNodeDefaultLabel(type),
      config:
        type === "send_message"
          ? { text: "" }
          : type === "interactive_buttons"
            ? { body: "", buttons: [createChatbotReplyButton()] }
            : type === "list_message"
              ? {
                  body: "",
                  button_text: "",
                  sections: [createChatbotListSection()],
                }
              : type === "collect_input"
                ? { prompt: "", variable: "", required: true }
                : type === "condition"
                  ? { variable: "" }
                  : {},
      ...(type === "condition"
        ? { branches: [createChatbotConditionBranch()] }
        : {}),
    },
  };
}

export function ensureChatbotStartNode(
  graph: ChatbotEditorGraph,
): ChatbotEditorGraph {
  if (graph.nodes.some((node) => node.data.node_type === "start")) {
    return graph;
  }

  return {
    ...graph,
    nodes: [
      createChatbotNode("start", { x: 80, y: 160 }, "start-1"),
      ...graph.nodes,
    ],
  };
}

export function updateChatbotMessageText(
  node: ChatbotFlowNode,
  text: string,
): ChatbotFlowNode {
  if (node.data.node_type !== "send_message") return node;

  return {
    ...node,
    data: {
      ...node.data,
      config: {
        ...node.data.config,
        text: text.slice(0, CHATBOT_MESSAGE_MAX_LENGTH),
      },
    },
  };
}

export function updateChatbotCollectInputConfig(
  node: ChatbotFlowNode,
  updates: Partial<ChatbotNodeConfig>,
): ChatbotFlowNode {
  if (node.data.node_type !== "collect_input") return node;

  return {
    ...node,
    data: {
      ...node.data,
      config: {
        ...node.data.config,
        ...updates,
      },
    },
  };
}

export function updateChatbotInteractiveConfig(
  node: ChatbotFlowNode,
  updates: Partial<ChatbotNodeConfig>,
): ChatbotFlowNode {
  if (
    node.data.node_type !== "interactive_buttons" &&
    node.data.node_type !== "list_message"
  ) {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      config: {
        ...node.data.config,
        ...updates,
      },
    },
  };
}

export function getChatbotNodeOptionIds(node: ChatbotFlowNode): string[] {
  if (node.data.node_type === "interactive_buttons") {
    return (node.data.config.buttons ?? []).map((button) => button.id);
  }
  if (node.data.node_type === "list_message") {
    return (node.data.config.sections ?? []).flatMap((section) =>
      section.rows.map((row) => row.id),
    );
  }
  return [];
}

export function updateChatbotConditionVariable(
  node: ChatbotFlowNode,
  variable: string,
): ChatbotFlowNode {
  if (node.data.node_type !== "condition") return node;

  return {
    ...node,
    data: {
      ...node.data,
      config: {
        ...node.data.config,
        variable,
      },
    },
  };
}

export function addChatbotConditionBranch(
  node: ChatbotFlowNode,
  branch = createChatbotConditionBranch(),
): ChatbotFlowNode {
  if (node.data.node_type !== "condition") return node;

  return {
    ...node,
    data: {
      ...node.data,
      branches: [...(node.data.branches ?? []), branch],
    },
  };
}

export function updateChatbotConditionBranch(
  node: ChatbotFlowNode,
  branchId: string,
  updates: Partial<Pick<ChatbotConditionBranch, "operator" | "value">>,
): ChatbotFlowNode {
  if (node.data.node_type !== "condition") return node;

  return {
    ...node,
    data: {
      ...node.data,
      branches: (node.data.branches ?? []).map((branch) =>
        branch.id === branchId ? { ...branch, ...updates } : branch,
      ),
    },
  };
}

export function removeChatbotConditionBranch(
  node: ChatbotFlowNode,
  branchId: string,
): ChatbotFlowNode {
  if (
    node.data.node_type !== "condition" ||
    (node.data.branches?.length ?? 0) <= 1
  ) {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      branches: node.data.branches?.filter((branch) => branch.id !== branchId),
    },
  };
}

export function duplicateChatbotNode(
  node: ChatbotFlowNode,
  id = createStableNodeId(
    isChatbotCoreNodeType(node.data.node_type)
      ? node.data.node_type
      : "send_message",
  ),
): ChatbotFlowNode | null {
  if (node.data.node_type === "start") return null;

  const duplicatedConfig =
    node.data.node_type === "interactive_buttons"
      ? {
          ...node.data.config,
          buttons: (node.data.config.buttons ?? []).map((button) => ({
            ...button,
            id: createOptionId("button"),
          })),
        }
      : node.data.node_type === "list_message"
        ? {
            ...node.data.config,
            sections: (node.data.config.sections ?? []).map((section) => ({
              ...section,
              id: createOptionId("section"),
              rows: section.rows.map((row) => ({
                ...row,
                id: createOptionId("row"),
              })),
            })),
          }
        : { ...node.data.config };

  return {
    ...node,
    id,
    selected: false,
    position: {
      x: node.position.x + 36,
      y: node.position.y + 36,
    },
    data: {
      ...node.data,
      config: duplicatedConfig,
      ...(node.data.node_type === "condition"
        ? {
            branches: (node.data.branches ?? []).map((branch) =>
              createChatbotConditionBranch({
                operator: branch.operator,
                value: branch.value,
              }),
            ),
          }
        : {}),
    },
  };
}

export function removeChatbotNode(
  graph: ChatbotEditorGraph,
  nodeId: string,
): ChatbotEditorGraph {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node || node.data.node_type === "start") return graph;

  return {
    ...graph,
    nodes: graph.nodes.filter((candidate) => candidate.id !== nodeId),
    edges: graph.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    ),
  };
}

function wouldCreateCycle(
  source: string,
  target: string,
  edges: ReadonlyArray<Edge>,
) {
  const outgoing = new Map<string, string[]>();
  edges.forEach((edge) => {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  });

  const pending = [target];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const nodeId = pending.shift()!;
    if (nodeId === source) return true;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    pending.push(...(outgoing.get(nodeId) ?? []));
  }
  return false;
}

export function isValidChatbotConnection(
  connection: {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
  },
  nodes: ReadonlyArray<ChatbotFlowNode>,
  edges: ReadonlyArray<Edge>,
) {
  const { source, target } = connection;
  if (!source || !target || source === target) return false;

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) return false;
  if (sourceNode.data.node_type === "end") return false;
  if (targetNode.data.node_type === "start") return false;

  if (
    (sourceNode.data.node_type === "start" ||
      sourceNode.data.node_type === "send_message" ||
      sourceNode.data.node_type === "collect_input") &&
    edges.some((edge) => edge.source === source)
  ) {
    return false;
  }

  if (sourceNode.data.node_type === "condition") {
    const validHandle =
      connection.sourceHandle === "default" ||
      sourceNode.data.branches?.some(
        (branch) => branch.id === connection.sourceHandle,
      );
    if (!validHandle) return false;
    if (
      edges.some(
        (edge) =>
          edge.source === source &&
          edge.sourceHandle === connection.sourceHandle,
      )
    ) {
      return false;
    }
  }

  if (
    sourceNode.data.node_type === "interactive_buttons" ||
    sourceNode.data.node_type === "list_message"
  ) {
    if (
      !connection.sourceHandle ||
      !getChatbotNodeOptionIds(sourceNode).includes(connection.sourceHandle)
    ) {
      return false;
    }
    if (
      edges.some(
        (edge) =>
          edge.source === source &&
          edge.sourceHandle === connection.sourceHandle,
      )
    ) {
      return false;
    }
  }

  if (
    edges.some(
      (edge) =>
        edge.source === source &&
        edge.target === target &&
        edge.sourceHandle === connection.sourceHandle,
    )
  ) {
    return false;
  }

  return !wouldCreateCycle(source, target, edges);
}

function intersectVariableSets(sets: ReadonlyArray<ReadonlySet<string>>) {
  if (sets.length === 0) return new Set<string>();
  const intersection = new Set(sets[0]);
  for (const variable of intersection) {
    if (sets.slice(1).some((set) => !set.has(variable))) {
      intersection.delete(variable);
    }
  }
  return intersection;
}

export function getAvailableChatbotVariables(
  nodeId: string,
  nodes: ReadonlyArray<ChatbotFlowNode>,
  edges: ReadonlyArray<Edge>,
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, string[]>();
  edges.forEach((edge) => {
    const sources = incoming.get(edge.target) ?? [];
    sources.push(edge.source);
    incoming.set(edge.target, sources);
  });
  const memo = new Map<string, ReadonlySet<string>>();
  const active = new Set<string>();

  const variablesAfterNode = (currentNodeId: string): ReadonlySet<string> => {
    const cached = memo.get(currentNodeId);
    if (cached) return cached;
    if (active.has(currentNodeId)) return new Set();
    active.add(currentNodeId);

    const predecessorSets = (incoming.get(currentNodeId) ?? []).map(
      variablesAfterNode,
    );
    const available = intersectVariableSets(predecessorSets);
    const currentNode = nodeById.get(currentNodeId);
    const variable = currentNode?.data.config.variable;
    if (
      currentNode?.data.node_type === "collect_input" &&
      typeof variable === "string" &&
      /^[a-z][a-z0-9_]*$/.test(variable)
    ) {
      available.add(variable);
    }

    active.delete(currentNodeId);
    memo.set(currentNodeId, available);
    return available;
  };

  const predecessorSets = (incoming.get(nodeId) ?? []).map(variablesAfterNode);
  return [...intersectVariableSets(predecessorSets)].sort();
}

export function insertChatbotTemplateVariable(
  text: string,
  variable: string,
  selectionStart = text.length,
  selectionEnd = selectionStart,
) {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(variable)) return text;
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  return `${text.slice(0, start)}{{${variable}}}${text.slice(end)}`;
}

export function getChatbotConditionEdgeLabel(
  kind: string,
  operator?: string,
  value?: string,
) {
  if (kind === "default") return "Fallback";
  const readableOperator = (operator ?? "equals").replaceAll("_", " ");
  return value ? `${readableOperator} · ${value}` : readableOperator;
}

function isConditionOperator(
  value: unknown,
): value is ChatbotConditionOperator {
  return (
    typeof value === "string" &&
    chatbotConditionOperators.includes(value as ChatbotConditionOperator)
  );
}

function normalizeConditionBranches(
  value: unknown,
  nodeId: string,
): ChatbotConditionBranch[] {
  const seenIds = new Set<string>();
  const branches = (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .flatMap((branch): ChatbotConditionBranch[] => {
      if (
        typeof branch.id !== "string" ||
        !branch.id ||
        seenIds.has(branch.id) ||
        !isConditionOperator(branch.operator)
      ) {
        return [];
      }
      seenIds.add(branch.id);
      return [
        {
          id: branch.id,
          operator: branch.operator,
          value: typeof branch.value === "string" ? branch.value : "",
        },
      ];
    });

  return branches.length > 0
    ? branches
    : [createChatbotConditionBranch({ id: `${nodeId}-branch-1` })];
}

export function normalizeChatbotEditorGraph(
  value: unknown,
): ChatbotEditorGraph {
  if (!isRecord(value)) return { nodes: [], edges: [] };

  const seenNodeIds = new Set<string>();
  const nodes = (Array.isArray(value.nodes) ? value.nodes : [])
    .filter(isRecord)
    .flatMap((node): ChatbotFlowNode[] => {
      if (
        typeof node.id !== "string" ||
        seenNodeIds.has(node.id) ||
        !isRecord(node.position) ||
        !isFiniteNumber(node.position.x) ||
        !isFiniteNumber(node.position.y)
      ) {
        return [];
      }

      seenNodeIds.add(node.id);
      const sourceData = isRecord(node.data) ? node.data : {};
      const nodeType =
        normalizeChatbotNodeType(sourceData.node_type) ??
        normalizeChatbotNodeType(sourceData.nodeType) ??
        normalizeChatbotNodeType(node.type) ??
        "node";
      const label =
        typeof sourceData.label === "string"
          ? sourceData.label
          : isChatbotCoreNodeType(nodeType)
            ? getChatbotNodeDefaultLabel(nodeType)
            : node.id;
      const config = isRecord(sourceData.config)
        ? { ...sourceData.config }
        : {};
      const usesCoreRenderer = isChatbotCoreNodeType(nodeType);

      return [
        {
          id: node.id,
          type: usesCoreRenderer ? "chatbotNode" : "default",
          position: { x: node.position.x, y: node.position.y },
          data: {
            ...sourceData,
            node_type: nodeType,
            nodeType,
            label,
            config,
            ...(nodeType === "condition"
              ? {
                  branches: normalizeConditionBranches(
                    sourceData.branches,
                    node.id,
                  ),
                }
              : {}),
          },
          draggable: node.draggable !== false,
          selectable: node.selectable !== false,
          deletable: nodeType === "start" ? false : node.deletable !== false,
        },
      ];
    });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenEdgeIds = new Set<string>();
  const edges = (Array.isArray(value.edges) ? value.edges : [])
    .filter(isRecord)
    .flatMap((edge): ChatbotFlowEdge[] => {
      if (
        typeof edge.id !== "string" ||
        seenEdgeIds.has(edge.id) ||
        typeof edge.source !== "string" ||
        typeof edge.target !== "string" ||
        !nodeIds.has(edge.source) ||
        !nodeIds.has(edge.target)
      ) {
        return [];
      }

      seenEdgeIds.add(edge.id);
      const sourceNode = nodes.find((node) => node.id === edge.source);
      const sourceIsCondition = sourceNode?.data.node_type === "condition";
      const sourceData = isRecord(edge.data) ? edge.data : {};
      const kind =
        sourceData.kind === "condition"
          ? "condition"
          : sourceData.kind === "option"
            ? "option"
            : "default";
      const operator = isConditionOperator(sourceData.operator)
        ? sourceData.operator
        : "equals";
      const edgeValue =
        typeof sourceData.value === "string" ? sourceData.value : "";
      const sourceIsInteractive =
        sourceNode?.data.node_type === "interactive_buttons" ||
        sourceNode?.data.node_type === "list_message";
      const sourceHandle = sourceIsCondition
        ? kind === "default"
          ? "default"
          : typeof edge.sourceHandle === "string"
            ? edge.sourceHandle
            : `${edge.id}-branch`
        : sourceIsInteractive && kind === "option"
          ? typeof edge.sourceHandle === "string"
            ? edge.sourceHandle
            : typeof sourceData.option_id === "string"
              ? sourceData.option_id
              : null
          : typeof edge.sourceHandle === "string"
            ? edge.sourceHandle
            : null;

      return [
        {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle,
          targetHandle:
            typeof edge.targetHandle === "string" ? edge.targetHandle : null,
          animated: edge.animated === true,
          type: typeof edge.type === "string" ? edge.type : "smoothstep",
          data: {
            ...sourceData,
            kind,
            ...(kind === "condition" ? { operator, value: edgeValue } : {}),
            ...(kind === "option" && sourceHandle
              ? { option_id: sourceHandle }
              : {}),
          },
          ...(sourceIsCondition
            ? {
                label: getChatbotConditionEdgeLabel(kind, operator, edgeValue),
                labelStyle: {
                  fontSize: 10,
                  fontWeight: 600,
                  fill: "var(--foreground)",
                },
                labelBgStyle: {
                  fill: "var(--card)",
                  stroke: "var(--border)",
                },
                labelBgPadding: [6, 4] as [number, number],
                labelBgBorderRadius: 6,
              }
            : {}),
        },
      ];
    });

  const normalizedNodes = nodes.map((node) => {
    if (node.data.node_type !== "condition") return node;

    const branchById = new Map(
      (node.data.branches ?? []).map((branch) => [branch.id, branch]),
    );
    edges
      .filter(
        (edge) =>
          edge.source === node.id &&
          edge.data?.kind === "condition" &&
          typeof edge.sourceHandle === "string",
      )
      .forEach((edge) => {
        branchById.set(edge.sourceHandle!, {
          id: edge.sourceHandle!,
          operator: isConditionOperator(edge.data?.operator)
            ? edge.data.operator
            : "equals",
          value: typeof edge.data?.value === "string" ? edge.data.value : "",
        });
      });

    return {
      ...node,
      data: {
        ...node.data,
        branches: [...branchById.values()],
      },
    };
  });

  const viewport = isRecord(value.viewport) ? value.viewport : undefined;
  const normalizedViewport =
    viewport &&
    isFiniteNumber(viewport.x) &&
    isFiniteNumber(viewport.y) &&
    isFiniteNumber(viewport.zoom) &&
    viewport.zoom > 0
      ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
      : undefined;

  return { nodes: normalizedNodes, edges, viewport: normalizedViewport };
}
