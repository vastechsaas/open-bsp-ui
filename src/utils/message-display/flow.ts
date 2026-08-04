import type { StructuredMessageDisplay } from "./types";
import { isRecord, readInteractiveFrame, readString } from "./guards";

export function normalizeFlow(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  if (data.type !== "flow") return null;

  const frame = readInteractiveFrame(data);
  if (
    !frame?.body ||
    !isRecord(data.action) ||
    data.action.name !== "flow" ||
    !isRecord(data.action.parameters)
  ) {
    return null;
  }

  const cta = readString(data.action.parameters.flow_cta);
  const flowName =
    data.action.parameters.flow_name === undefined
      ? undefined
      : readString(data.action.parameters.flow_name);
  const flowId =
    data.action.parameters.flow_id === undefined
      ? undefined
      : readString(data.action.parameters.flow_id);
  if (!cta || flowName === null || flowId === null || (!flowName && !flowId)) {
    return null;
  }

  return {
    ...frame,
    kind: "flow",
    body: frame.body,
    cta,
    flowName,
    preview: { kind: "content", text: frame.body },
  };
}

export function normalizeFlowResponse(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  if (data.type !== "nfm_reply" || !isRecord(data.nfm_reply)) return null;

  const name = readString(data.nfm_reply.name);
  const body = readString(data.nfm_reply.body);
  const responseJson = readString(data.nfm_reply.response_json);
  if (!name || !body || !responseJson) return null;

  // response_json is deliberately validated as present but never copied into
  // the display model. Flow answers remain available to backend routing while
  // Chat Center renders only a privacy-safe completion summary.
  return {
    kind: "flow_response",
    name,
    body,
    preview: { kind: "label", text: "Respuesta de Flow recibida" },
  };
}
