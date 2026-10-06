export type ServingNumber = {
  status: string;
  phone_number: string | null;
};

export type NativeServingBinding = {
  flow_id: string;
  flow_version_id: string;
  organization_address: string;
  version: { version: number } | null;
  number:
    | (ServingNumber & {
        chatbot_node_bridges: { engine: string }[] | { engine: string } | null;
      })
    | null;
};

export type NodeServingBinding = {
  flow_id: string | null;
  flow_version_id: string | null;
  organization_address: string;
  engine: string;
  sync_status: string;
  version: { version: number } | null;
  number: ServingNumber | null;
};

export type ChatbotServingSnapshot = {
  native: NativeServingBinding[];
  node: NodeServingBinding[];
};

export type ChatbotServingState = {
  engine: "native" | "node";
  address: string;
  phone: string | null;
  version: number | null;
  versionId: string | null;
  state: "serving" | "syncing" | "failed" | "suspended" | "disabled";
};

// A lifecycle-active flow is merely available. Only confirmed number bindings
// identify the version selected for new journeys (not pinned older sessions).
export function getChatbotServingStates(
  flowId: string,
  flowStatus: string,
  snapshot: ChatbotServingSnapshot,
): ChatbotServingState[] {
  if (flowStatus !== "active") return [];
  const states: ChatbotServingState[] = [];
  for (const binding of snapshot.node) {
    if (binding.flow_id !== flowId || binding.engine === "native") continue;
    let state: ChatbotServingState["state"] = "disabled";
    if (binding.sync_status === "failed") state = "failed";
    else if (binding.sync_status === "suspended") state = "suspended";
    else if (["pending", "syncing"].includes(binding.sync_status))
      state = "syncing";
    else if (
      binding.engine === "node" &&
      binding.sync_status === "active" &&
      binding.flow_version_id &&
      binding.version &&
      binding.number?.status === "connected"
    )
      state = "serving";
    states.push({
      engine: "node",
      address: binding.organization_address,
      phone: binding.number?.phone_number ?? null,
      version: binding.version?.version ?? null,
      versionId: binding.flow_version_id,
      state,
    });
  }
  for (const binding of snapshot.native) {
    if (binding.flow_id !== flowId) continue;
    // A native deployment can remain stored while Node owns this number.
    // Read the number's selector even when its Node flow is on another page.
    const selector = binding.number?.chatbot_node_bridges;
    const selectors = Array.isArray(selector)
      ? selector
      : selector
        ? [selector]
        : [];
    if (selectors.some((bridge) => bridge.engine !== "native")) continue;
    states.push({
      engine: "native",
      address: binding.organization_address,
      phone: binding.number?.phone_number ?? null,
      version: binding.version?.version ?? null,
      versionId: binding.flow_version_id,
      state:
        binding.version && binding.number?.status === "connected"
          ? "serving"
          : "disabled",
    });
  }
  return states.sort(
    (a, b) =>
      a.address.localeCompare(b.address) || a.engine.localeCompare(b.engine),
  );
}

export const SERVING_BINDING_PAGE_SIZE = 500;

// Fetch bindings for only the displayed flow IDs, in batches, not per row.
// Never interpret a truncated PostgREST response as "not activated".
export async function readServingBindingPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < 20; page++) {
    signal.throwIfAborted();
    const from = page * SERVING_BINDING_PAGE_SIZE;
    const batch = await fetchPage(from, from + SERVING_BINDING_PAGE_SIZE - 1);
    signal.throwIfAborted();
    rows.push(...batch);
    if (batch.length < SERVING_BINDING_PAGE_SIZE) return rows;
  }
  throw new Error("Too many activation bindings to confirm serving status");
}
