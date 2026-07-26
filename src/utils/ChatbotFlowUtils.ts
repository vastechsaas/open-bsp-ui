import type { Edge, Node, Viewport } from "@xyflow/react";

export type ChatbotFlowStatus = "active" | "archived";

export function isChatbotWorkspacePath(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return (
    normalizedPath === "/chatbots" || normalizedPath.startsWith("/chatbots/")
  );
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
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeChatbotEditorGraph(
  value: unknown,
): ChatbotEditorGraph {
  if (!isRecord(value)) return { nodes: [], edges: [] };

  const seenNodeIds = new Set<string>();
  const nodes = (Array.isArray(value.nodes) ? value.nodes : [])
    .filter(isRecord)
    .flatMap((node): Node[] => {
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
        typeof sourceData.nodeType === "string"
          ? sourceData.nodeType
          : typeof node.type === "string"
            ? node.type
            : "NODE";
      const label =
        typeof sourceData.label === "string"
          ? sourceData.label
          : nodeType === "default"
            ? node.id
            : nodeType;

      return [
        {
          id: node.id,
          type: "default",
          position: { x: node.position.x, y: node.position.y },
          data: { ...sourceData, label, nodeType },
          draggable: node.draggable !== false,
          selectable: node.selectable !== false,
        },
      ];
    });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const seenEdgeIds = new Set<string>();
  const edges = (Array.isArray(value.edges) ? value.edges : [])
    .filter(isRecord)
    .flatMap((edge): Edge[] => {
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
