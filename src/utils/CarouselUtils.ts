import type {
  CarouselMediaAsset,
  TemplateComponent,
} from "@/supabase/types/whatsapp_template_types";
import {
  getTemplateVariableIndexes,
  getTemplateMediaFileError,
  type TemplateEditorValues,
} from "./TemplateDraftUtils";

export type CarouselCardValue = {
  id: string;
  text: string;
  samples: string[];
  label: string;
  url: string;
  urlSample: string;
  asset?: CarouselMediaAsset;
  file?: File;
};
export type CarouselIssue = {
  cardId: string;
  field: "image" | "text" | "label" | "url" | "samples";
  message: string;
};
export function newCarouselCard(): CarouselCardValue {
  return {
    id: crypto.randomUUID(),
    text: "",
    samples: [],
    label: "",
    url: "",
    urlSample: "",
  };
}
export function readCarouselCards(
  components: TemplateComponent[],
  assets: CarouselMediaAsset[] = [],
): CarouselCardValue[] | undefined {
  const carousel = components.find((part) => part.type === "CAROUSEL");
  if (!carousel || !Array.isArray(carousel.cards)) return undefined;
  return carousel.cards.map((card, index) => {
    const parts = Array.isArray(card?.components) ? card.components : [];
    const body = parts.find((part) => part.type === "BODY");
    const button = parts.find((part) => part.type === "BUTTONS")?.buttons[0];
    return {
      id: assets[index]?.card_id || crypto.randomUUID(),
      text: body?.text || "",
      samples: body?.example?.body_text?.[0] || [],
      label: button?.text || "",
      url: button?.type === "URL" ? button.url : "",
      urlSample: button?.type === "URL" ? button.example?.[0] || "" : "",
      asset: assets[index]?.storage_uri ? assets[index] : undefined,
    };
  });
}
export function supportedImageCarousel(components: TemplateComponent[]) {
  const carousel = components.find((part) => part.type === "CAROUSEL");
  return (
    !carousel ||
    (Array.isArray(carousel.cards) &&
      components.length === 2 &&
      components.some((part) => part.type === "BODY") &&
      carousel.cards.length >= 2 &&
      carousel.cards.length <= 10 &&
      carousel.cards.every(
        (card) =>
          Array.isArray(card?.components) &&
          card.components.length === 3 &&
          card.components.some(
            (part) => part.type === "HEADER" && part.format === "IMAGE",
          ) &&
          card.components.some((part) => part.type === "BODY") &&
          card.components.some(
            (part) =>
              part.type === "BUTTONS" &&
              part.buttons.length === 1 &&
              part.buttons[0].type === "URL",
          ),
      ))
  );
}
export function carouselIssues(cards: CarouselCardValue[]): CarouselIssue[] {
  const issues: CarouselIssue[] = [];
  cards.forEach((card) => {
    const push = (field: CarouselIssue["field"], message: string) =>
      issues.push({ cardId: card.id, field, message });
    if (
      (!card.file && !card.asset) ||
      (card.file && getTemplateMediaFileError("IMAGE", card.file))
    )
      push("image", "Subí una imagen JPEG o PNG de hasta 5 MB.");
    if (!card.text.trim() || card.text.length > 160)
      push(
        "text",
        "El texto de la tarjeta es obligatorio y admite hasta 160 caracteres.",
      );
    const indexes = getTemplateVariableIndexes(card.text);
    if (
      indexes.some((value, index) => value !== index + 1) ||
      indexes.some((_, index) => !card.samples[index]?.trim())
    )
      push(
        "samples",
        "Agregá variables consecutivas y un ejemplo para cada una.",
      );
    if (!card.label.trim() || card.label.length > 25)
      push(
        "label",
        "El texto del botón es obligatorio y admite hasta 25 caracteres.",
      );
    try {
      const variables = card.url.match(/\{\{.*?\}\}/g) || [];
      if (
        variables.length &&
        (variables.length !== 1 || !card.url.endsWith("{{1}}"))
      )
        throw new Error();
      const parsed = new URL(card.url.replace("{{1}}", "sample"));
      if (
        parsed.protocol !== "https:" ||
        card.url.length > 2000 ||
        (variables.length &&
          (!card.urlSample.startsWith(card.url.slice(0, -5)) ||
            new URL(card.urlSample).protocol !== "https:"))
      )
        throw new Error();
    } catch {
      push(
        "url",
        "Ingresá una URL HTTPS. La URL dinámica necesita {{1}} al final y un ejemplo completo.",
      );
    }
  });
  return issues;
}
export function carouselDefinition(
  values: TemplateEditorValues,
): TemplateComponent[] {
  return [
    {
      type: "BODY",
      text: values.body.trim(),
      ...(getTemplateVariableIndexes(values.body).length
        ? { example: { body_text: [values.bodySamples] as [string[]] } }
        : {}),
    },
    {
      type: "CAROUSEL",
      cards: (values.cards || []).map((card) => ({
        components: [
          { type: "HEADER", format: "IMAGE" },
          {
            type: "BODY",
            text: card.text.trim(),
            ...(getTemplateVariableIndexes(card.text).length
              ? { example: { body_text: [card.samples] as [string[]] } }
              : {}),
          },
          {
            type: "BUTTONS",
            buttons: [
              {
                type: "URL",
                text: card.label.trim(),
                url: card.url.trim(),
                ...(card.url.includes("{{1}}")
                  ? { example: [card.urlSample.trim()] as [string] }
                  : {}),
              },
            ],
          },
        ],
      })),
    },
  ];
}
