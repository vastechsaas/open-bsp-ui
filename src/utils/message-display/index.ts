import type { Json } from "@/supabase/db_types";
import { normalizeChoiceInteractive } from "./choices";
import { normalizeCommerceInteractive, normalizeOrder } from "./commerce";
import { normalizeFlow, normalizeFlowResponse } from "./flow";
import { isRecord, readString } from "./guards";
import { normalizeLocation, normalizeLocationRequest } from "./location";
import type {
  MessageContent,
  StructuredContent,
  StructuredMessageDisplay,
  TranslatePreview,
} from "./types";

export * from "./types";

function jsonFallback(data: Json): StructuredMessageDisplay {
  return {
    kind: "json",
    data,
    preview: { kind: "label", text: "Mensaje no compatible" },
  };
}

function normalizeInteractive(data: Json): StructuredMessageDisplay | null {
  if (!isRecord(data)) return null;

  return (
    normalizeChoiceInteractive(data) ??
    normalizeCommerceInteractive(data) ??
    normalizeLocationRequest(data) ??
    normalizeFlow(data) ??
    normalizeFlowResponse(data)
  );
}

export function normalizeStructuredMessage(
  content: StructuredContent,
): StructuredMessageDisplay {
  if (typeof content.text === "string" && content.text.length > 0) {
    return {
      kind: "text",
      text: content.text,
      preview: { kind: "content", text: content.text },
    };
  }

  if (content.kind === "media_placeholder") {
    return {
      kind: "media_placeholder",
      preview: { kind: "label", text: "Contenido multimedia no disponible" },
    };
  }

  if (content.kind === "interactive") {
    return normalizeInteractive(content.data) ?? jsonFallback(content.data);
  }

  if (content.kind === "button" && isRecord(content.data)) {
    const text = readString(content.data.text);
    if (text) {
      return {
        kind: "selected_reply",
        text,
        preview: { kind: "content", text },
      };
    }
  }

  if (content.kind === "order" && isRecord(content.data)) {
    return normalizeOrder(content.data) ?? jsonFallback(content.data);
  }

  if (content.kind === "location" && isRecord(content.data)) {
    return normalizeLocation(content.data) ?? jsonFallback(content.data);
  }

  return jsonFallback(content.data);
}

export function getMessagePreviewText(
  content: MessageContent,
  translate?: TranslatePreview,
): string | undefined {
  if (content.type === "text") return content.text;
  if (content.type === "file" || content.type === "parts") return undefined;

  const preview = normalizeStructuredMessage(content).preview;
  return preview.kind === "label" && translate
    ? translate(preview.text)
    : preview.text;
}
