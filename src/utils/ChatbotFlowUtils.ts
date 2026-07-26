import type { Edge, Node, Viewport, XYPosition } from "@xyflow/react";

export type ChatbotFlowStatus = "active" | "archived";
export const CHATBOT_MESSAGE_MAX_LENGTH = 4096;

export type ChatbotCoreNodeType = "start" | "send_message" | "end";

export type ChatbotNodeConfig = {
  text?: string;
  [key: string]: unknown;
};

export type ChatbotNodeData = {
  node_type: string;
  nodeType: string;
  label: string;
  config: ChatbotNodeConfig;
  [key: string]: unknown;
};

export type ChatbotFlowNode = Node<ChatbotNodeData>;
export type ChatbotFlowEdge = Edge<{ kind: string; [key: string]: unknown }>;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const legacyNodeTypes: Record<string, ChatbotCoreNodeType> = {
  START: "start",
  MESSAGE: "send_message",
  SEND_MESSAGE: "send_message",
  END: "end",
};

export function normalizeChatbotNodeType(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmedValue = value.trim();
  return legacyNodeTypes[trimmedValue.toUpperCase()] ?? trimmedValue;
}

export function isChatbotCoreNodeType(
  value: unknown,
): value is ChatbotCoreNodeType {
  return value === "start" || value === "send_message" || value === "end";
}

export function getChatbotNodeDefaultLabel(type: ChatbotCoreNodeType) {
  if (type === "start") return "Inicio";
  if (type === "send_message") return "Enviar mensaje";
  return "Fin";
}

function createStableNodeId(type: ChatbotCoreNodeType) {
  return `${type}-${crypto.randomUUID()}`;
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
      config: type === "send_message" ? { text: "" } : {},
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

export function duplicateChatbotNode(
  node: ChatbotFlowNode,
  id = createStableNodeId(
    isChatbotCoreNodeType(node.data.node_type)
      ? node.data.node_type
      : "send_message",
  ),
): ChatbotFlowNode | null {
  if (node.data.node_type === "start") return null;

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
      config: { ...node.data.config },
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
  connection: { source: string | null; target: string | null },
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
      sourceNode.data.node_type === "send_message") &&
    edges.some((edge) => edge.source === source)
  ) {
    return false;
  }

  if (edges.some((edge) => edge.source === source && edge.target === target)) {
    return false;
  }

  return !wouldCreateCycle(source, target, edges);
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
      return [
        {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle:
            typeof edge.sourceHandle === "string" ? edge.sourceHandle : null,
          targetHandle:
            typeof edge.targetHandle === "string" ? edge.targetHandle : null,
          animated: edge.animated === true,
          type: typeof edge.type === "string" ? edge.type : "smoothstep",
          data: {
            ...(isRecord(edge.data) ? edge.data : {}),
            kind:
              isRecord(edge.data) && typeof edge.data.kind === "string"
                ? edge.data.kind
                : "default",
          },
        },
      ];
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

  return { nodes, edges, viewport: normalizedViewport };
}
