import type { NodeConversationSnapshot } from "./NodeConversationUtils";

export function conversationCountKey(
  userId: string | undefined,
  organizationId: string | null,
): readonly ["conversation-queue-counts", string | undefined, string | null];
export function conversationCountKey(
  userId: string | undefined,
  organizationId: string | null,
  routingQueueId: string | null,
): readonly [
  "conversation-queue-counts",
  string | undefined,
  string | null,
  string | null,
];
export function conversationCountKey(
  userId: string | undefined,
  organizationId: string | null,
  routingQueueId?: string | null,
) {
  const root = ["conversation-queue-counts", userId, organizationId] as const;
  return routingQueueId === undefined
    ? root
    : ([...root, routingQueueId] as const);
}

export function parseConversationCounts(data: unknown): Map<string, number> {
  if (!Array.isArray(data)) throw new Error("Invalid conversation counts");
  const counts = new Map<string, number>();
  for (const value of data as unknown[]) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("key" in value) ||
      !("count" in value)
    )
      throw new Error("Invalid conversation counts");
    const row = value as { key: unknown; count: unknown };
    if (
      !row ||
      typeof row.key !== "string" ||
      !["number", "string"].includes(typeof row.count)
    )
      throw new Error("Invalid conversation counts");
    const count = Number(row.count);
    if (typeof row.count === "string" && !/^\d+$/.test(row.count))
      throw new Error("Invalid conversation counts");
    if (!Number.isSafeInteger(count) || count < 0 || counts.has(row.key))
      throw new Error("Invalid conversation counts");
    counts.set(row.key, count);
  }
  return counts;
}

export function ownershipPresentation(
  snapshot?: NodeConversationSnapshot,
  currentAgentId?: string,
  failed = false,
): { label: string; tone: "neutral" | "warning" | "human" | "error" } | null {
  if (failed)
    return {
      label: "No se pudo sincronizar el estado del chat.",
      tone: "error",
    };
  if (!snapshot?.enabled && !snapshot?.awaiting_mapping) return null;
  if (snapshot.pending_request_id) {
    const action = snapshot.optimistic_action ?? snapshot.operation?.action;
    return {
      label:
        action === "takeover"
          ? "Tomando control—sincronización pendiente"
          : action === "resume"
            ? "Devolviendo al chatbot—sincronización pendiente"
            : "Cerrando—sincronización pendiente",
      tone: "warning",
    };
  }
  if (snapshot.operation?.status === "failed")
    return {
      label: "No se pudo sincronizar el estado del chat.",
      tone: "error",
    };
  if (
    snapshot.awaiting_mapping ||
    snapshot.sync_pending ||
    snapshot.takeover_sync_pending
  )
    return { label: "Sincronizando solicitud de soporte…", tone: "warning" };
  if (snapshot.state === "closed")
    return {
      label: "Esta conversación es historial de solo lectura",
      tone: "neutral",
    };
  if (snapshot.state === "human_owned")
    return {
      label:
        snapshot.support_request?.handled_by_agent_id === currentAgentId
          ? "Estás atendiendo este chat · Chatbot pausado"
          : "Soporte humano activo · Chatbot pausado",
      tone: "human",
    };
  return {
    label:
      snapshot.support_request?.status === "waiting"
        ? "Esperando soporte · Chatbot activo"
        : "El chatbot está atendiendo esta conversación",
    tone: "neutral",
  };
}
