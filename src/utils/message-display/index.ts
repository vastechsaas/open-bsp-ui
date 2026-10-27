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
  if (
    content.kind === "template" &&
    isRecord(content.data) &&
    Array.isArray(content.data.components)
  ) {
    const records = (value: unknown): Record<string, unknown>[] =>
      Array.isArray(value) ? (value as unknown[]).filter(isRecord) : [];
    const components = records(content.data.components);
    const carousel = components.find(
      (part) => readString(part.type)?.toLowerCase() === "carousel",
    );
    if (isRecord(carousel) && Array.isArray(carousel.cards)) {
      const https = (value: unknown) => {
        if (typeof value !== "string" || value.includes("{{")) return undefined;
        try {
          const url = new URL(value);
          return url.protocol === "https:" ? url.href : undefined;
        } catch {
          return undefined;
        }
      };
      const cards = records(carousel.cards).map((card) => {
        const parts = records(card.components);
        const body = parts.find(
          (part) => readString(part.type)?.toLowerCase() === "body",
        );
        const header = parts.find(
          (part) => readString(part.type)?.toLowerCase() === "header",
        );
        const image = records(header?.parameters).find(
          (part) => part.type === "image",
        );
        const buttons = parts.flatMap((part) =>
          records(part.buttons).map((button) => ({
            label: readString(button.text) || "",
            url: https(button.url),
          })),
        );
        return {
          text:
            readString(body?.text) ||
            records(body?.parameters)
              .map((part) => readString(part.text))
              .filter(Boolean)
              .join(" · "),
          imageUrl:
            isRecord(image) && isRecord(image.image)
              ? https(image.image.link)
              : undefined,
          buttons,
        };
      });
      return {
        kind: "carousel",
        body:
          content.text ||
          readString(
            components.find(
              (part) => readString(part.type)?.toLowerCase() === "body",
            )?.text,
          ) ||
          "",
        cards,
        preview: { kind: "label", text: "Carrusel de imágenes" },
      };
    }
  }
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
