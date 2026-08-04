import type { StructuredMessageDisplay } from "./types";
import {
  isRecord,
  readInteractiveFrame,
  readSafeHttpUrl,
  readString,
} from "./guards";

export function normalizeLocationRequest(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  if (data.type !== "location_request_message") return null;

  const frame = readInteractiveFrame(data);
  if (
    !frame?.body ||
    !isRecord(data.action) ||
    data.action.name !== "send_location"
  ) {
    return null;
  }

  return {
    ...frame,
    kind: "location_request",
    body: frame.body,
    preview: { kind: "content", text: frame.body },
  };
}

export function normalizeLocation(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  const name = readString(data.name);
  const address = readString(data.address);
  const { latitude, longitude } = data;
  if (
    !name ||
    !address ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    kind: "location",
    name,
    address,
    latitude,
    longitude,
    url: readSafeHttpUrl(data.url),
    preview: { kind: "content", text: name || address },
  };
}
