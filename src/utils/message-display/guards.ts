import type { InteractiveFrame, InteractiveHeader } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readOptionalTextObject(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  return readString(value.text);
}

function hasMediaReference(value: Record<string, unknown>): boolean {
  return readString(value.id) !== null || readString(value.link) !== null;
}

function readHeader(value: unknown): InteractiveHeader | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  if (value.type === "text") {
    const text = readString(value.text);
    return text ? { kind: "text", text } : null;
  }

  if (
    value.type === "image" &&
    isRecord(value.image) &&
    hasMediaReference(value.image)
  ) {
    return { kind: "media", mediaType: "image" };
  }
  if (
    value.type === "video" &&
    isRecord(value.video) &&
    hasMediaReference(value.video)
  ) {
    return { kind: "media", mediaType: "video" };
  }
  if (
    value.type === "document" &&
    isRecord(value.document) &&
    hasMediaReference(value.document)
  ) {
    const filename =
      value.document.filename === undefined
        ? undefined
        : readString(value.document.filename);
    if (filename === null) return null;
    return { kind: "media", mediaType: "document", filename };
  }

  return null;
}

export function readInteractiveFrame(
  data: Record<string, unknown>,
): InteractiveFrame | null {
  const header = readHeader(data.header);
  const body = readOptionalTextObject(data.body);
  const footer = readOptionalTextObject(data.footer);

  if (header === null || body === null || footer === null) return null;
  return { header, body, footer };
}

export function readSafeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
