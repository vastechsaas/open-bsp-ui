import {
  isValidChatbotConnection,
  type ChatbotFlowEdge,
  type ChatbotFlowNode,
} from "./ChatbotFlowUtils";
// Guided controls are a view over the existing webhook contract, not a new format.
export type ApiRequestField = {
  name: string;
  value: string | number | boolean | null;
};
export type CredentialKind = "api_key" | "bearer" | "custom";

export function readApiRequestFields(body?: string): ApiRequestField[] | null {
  if (body === undefined || body.trim() === "") return [];
  try {
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const fields = Object.entries(value);
    let quoted = false;
    let escaped = false;
    let keys = 0;
    for (const char of body) {
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === ":") keys++;
    }
    // Nested objects/arrays and unquoted template expressions stay in Advanced.
    if (
      keys !== fields.length ||
      fields.some(
        ([, item]) =>
          (typeof item === "number" && !Number.isFinite(item)) ||
          (item !== null &&
            !["string", "number", "boolean"].includes(typeof item)),
      )
    )
      return null;
    return fields.map(([name, item]) => ({
      name,
      value: item as ApiRequestField["value"],
    }));
  } catch {
    return null;
  }
}

export function writeApiRequestFields(fields: ApiRequestField[]): string {
  if (
    fields.some(
      (field) =>
        !field.name.trim() ||
        (typeof field.value === "number" && !Number.isFinite(field.value)),
    ) ||
    new Set(fields.map((field) => field.name)).size !== fields.length
  ) {
    throw new Error("invalid_request_fields");
  }
  // Object.fromEntries handles __proto__ as an ordinary own JSON key.
  const body = JSON.stringify(
    Object.fromEntries(fields.map(({ name, value }) => [name, value])),
    null,
    2,
  );
  if (body.length > 16384) throw new Error("request_too_long");
  return body;
}

export function buildApiCredentialHeaders(
  kind: CredentialKind,
  header: string,
  secret: string,
): Record<string, string> {
  const name = kind === "bearer" ? "Authorization" : header.trim();
  if (
    !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) ||
    !secret.trim() ||
    /[\r\n]/.test(secret)
  )
    throw new Error("invalid_credential");
  const value =
    kind === "bearer"
      ? `Bearer ${secret.trim().replace(/^Bearer\s+/i, "")}`
      : secret;
  if (kind === "bearer" && value === "Bearer ")
    throw new Error("invalid_credential");
  return { [name]: value };
}

export function discoverApiResponsePaths(sample: unknown): string[] {
  const paths: string[] = [];
  function visit(value: unknown, path: string, depth: number) {
    if (paths.length >= 100 || depth > 5) return;
    if (path) paths.push(path);
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      visit(child, path ? `${path}.${key}` : key, depth + 1);
    }
  }
  visit(sample, "", 0);
  return ["$", ...paths];
}

export function apiRequestFieldKind(value: ApiRequestField["value"]): string {
  if (value === null) return "null";
  if (typeof value === "string" && /^\{\{[a-z][a-z0-9_]{0,63}\}\}$/.test(value))
    return "variable";
  return typeof value;
}

export function apiRouteMatches(
  edge: ChatbotFlowEdge,
  source: string,
  outcome: "success" | "error",
) {
  return (
    edge.source === source &&
    (edge.sourceHandle === outcome ||
      (edge.data?.kind === "webhook" && edge.data.outcome === outcome))
  );
}

export function updateApiOutcomeRoute(
  nodes: ChatbotFlowNode[],
  edges: ChatbotFlowEdge[],
  source: string,
  outcome: "success" | "error",
  target: string,
  newEdgeId: string,
): ChatbotFlowEdge[] {
  if (nodes.find((node) => node.id === source)?.data.node_type !== "webhook")
    return edges;
  const retained = edges.filter(
    (edge) => !apiRouteMatches(edge, source, outcome),
  );
  if (!target) return retained;
  if (
    !isValidChatbotConnection(
      { source, target, sourceHandle: outcome },
      nodes,
      retained,
    )
  )
    return edges;
  const previous = edges.find((edge) => apiRouteMatches(edge, source, outcome));
  return [
    ...retained,
    {
      ...previous,
      id: previous?.id ?? newEdgeId,
      source,
      target,
      sourceHandle: outcome,
      targetHandle: null,
      type: previous?.type ?? "smoothstep",
      data: { ...previous?.data, kind: "webhook", outcome },
    },
  ];
}
