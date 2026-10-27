import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  carouselDefinition,
  carouselIssues,
  newCarouselCard,
  readCarouselCards,
  supportedImageCarousel,
} from "../src/utils/CarouselUtils.ts";
import {
  getTemplateVariables,
  getCampaignReadiness,
} from "../src/utils/CampaignUtils.ts";
import { normalizeStructuredMessage } from "../src/utils/message-display/index.ts";
import type { TemplateEditorValues } from "../src/utils/TemplateDraftUtils.ts";
import type {
  TemplateData,
  CarouselMediaAsset,
} from "../src/supabase/types/whatsapp_template_types.ts";

const image = {
  storage_uri: "internal://media/organizations/test/attachments/image",
  file_name: "one.png",
  mime_type: "image/png",
  size: 42,
};
function values(): TemplateEditorValues {
  return {
    name: "offers",
    organizationAddress: "123",
    language: "en",
    category: "MARKETING",
    format: "CAROUSEL",
    headerFormat: "NONE",
    header: "",
    headerSample: "",
    footer: "",
    buttons: [],
    body: "Our offers",
    bodySamples: [],
    cards: Array.from({ length: 2 }, (_, index) => {
      const card = newCarouselCard();
      return {
        ...card,
        text: "Hi {{1}}",
        samples: ["Customer"],
        label: "Shop",
        url: `https://example.com/${index}/{{1}}`,
        urlSample: `https://example.com/${index}/one`,
        asset: { ...image, card_id: card.id },
      };
    }),
  };
}

void test("carousel draft round trip preserves card order, identity, text, URLs and images", () => {
  const input = values();
  input.cards!.reverse();
  const definition = carouselDefinition(input);
  const cards = readCarouselCards(
    definition,
    input.cards!.map((card) => card.asset!),
  )!;
  assert.deepEqual(
    cards.map((card) => [card.id, card.text, card.url, card.asset]),
    input.cards!.map((card) => [card.id, card.text, card.url, card.asset]),
  );
  assert.equal(JSON.stringify(definition).includes("internal://"), false);
  assert.equal(JSON.stringify(definition).includes("card_id"), false);
});

void test("incomplete draft slots do not borrow the next card's image", () => {
  const input = values();
  const slots = [{ card_id: input.cards![0].id }, input.cards![1].asset!];
  const cards = readCarouselCards(
    carouselDefinition(input),
    slots as CarouselMediaAsset[],
  )!;
  assert.equal(cards[0].id, slots[0].card_id);
  assert.equal(cards[0].asset, undefined);
  assert.equal(cards[1].asset?.storage_uri, image.storage_uri);
});

void test("card readiness identifies independent fields without blocking draft creation", () => {
  const input = values();
  assert.equal(carouselIssues(input.cards!).length, 0);
  input.cards![0] = {
    ...newCarouselCard(),
    text: "x".repeat(161),
    label: "x".repeat(26),
    url: "http://example.com",
  };
  const issues = carouselIssues(input.cards!);
  assert.deepEqual(issues.map((issue) => issue.field).sort(), [
    "image",
    "label",
    "text",
    "url",
  ]);
  assert.equal(new Set(issues.map((issue) => issue.cardId)).size, 1);
  assert.equal(carouselDefinition(input).length, 2);
});

void test("campaign mappings use card-scoped keys and reject missing retained media", () => {
  const input = values();
  const template: TemplateData = {
    id: "1",
    name: input.name,
    language: "en",
    category: "MARKETING",
    status: "APPROVED",
    components: carouselDefinition(input),
  };
  const keys = getTemplateVariables(template).map((variable) => variable.key);
  assert.deepEqual(keys, [
    "carousel.0.body.1",
    "carousel.0.button.0.1",
    "carousel.1.body.1",
    "carousel.1.button.0.1",
  ]);
  const mapping = Object.fromEntries(keys.map((key) => [key, "contact.name"]));
  assert.equal(
    getCampaignReadiness({
      template,
      mapping,
      audienceCount: 2,
      carouselMedia: [],
    }),
    "needs_attention",
  );
  assert.equal(
    getCampaignReadiness({
      template,
      mapping,
      audienceCount: 2,
      carouselMedia: input.cards!.map((card) => card.asset!),
    }),
    "ready",
  );
  assert.equal(supportedImageCarousel(template.components), true);
});

void test("stored carousel renders read-only without adding campaign ingestion", () => {
  const input = values();
  const display = normalizeStructuredMessage({
    type: "data",
    kind: "template",
    text: "Our offers",
    data: { components: carouselDefinition(input) } as never,
  });
  assert.equal(display.kind, "carousel");
  if (display.kind === "carousel") assert.equal(display.cards.length, 2);
  const picker = readFileSync(
    new URL("../src/components/TemplatePicker.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    picker,
    /!template\.components\.some\(\(component\) => component.type === "CAROUSEL"\)/,
  );
});
