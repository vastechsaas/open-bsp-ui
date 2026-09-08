import test from "node:test";
import assert from "node:assert/strict";
import type { Json } from "../src/supabase/db_types.ts";
import {
  getMessagePreviewText,
  normalizeStructuredMessage,
} from "../src/utils/MessageDisplayUtils.ts";

function dataContent(kind: string, data: Json, text?: string) {
  return { type: "data" as const, kind, data, text };
}

const buttonMessage = dataContent("interactive", {
  type: "button",
  header: { type: "text", text: "Runtime paths" },
  body: { text: "Choose a runtime test path." },
  footer: { text: "Read-only history" },
  action: {
    buttons: [
      { type: "reply", reply: { id: "open-menu", title: "Open menu" } },
      { type: "reply", reply: { id: "finish", title: "Finish" } },
    ],
  },
});

const listMessage = dataContent("interactive", {
  type: "list",
  body: { text: "Choose a destination." },
  action: {
    button: "View destinations",
    sections: [
      {
        title: "Popular",
        rows: [
          { id: "london", title: "London", description: "United Kingdom" },
          { id: "paris", title: "Paris", description: "" },
        ],
      },
      { title: "Other", rows: [{ id: "tokyo", title: "Tokyo" }] },
    ],
  },
});

void test("normalizes choice messages with safe headers and footers", () => {
  assert.deepEqual(normalizeStructuredMessage(buttonMessage), {
    kind: "interactive_buttons",
    header: { kind: "text", text: "Runtime paths" },
    body: "Choose a runtime test path.",
    footer: "Read-only history",
    buttons: [
      { id: "open-menu", title: "Open menu" },
      { id: "finish", title: "Finish" },
    ],
    preview: { kind: "content", text: "Choose a runtime test path." },
  });

  assert.deepEqual(normalizeStructuredMessage(listMessage), {
    kind: "interactive_list",
    header: undefined,
    body: "Choose a destination.",
    footer: undefined,
    buttonText: "View destinations",
    sections: [
      {
        title: "Popular",
        rows: [
          { id: "london", title: "London", description: "United Kingdom" },
          { id: "paris", title: "Paris", description: undefined },
        ],
      },
      {
        title: "Other",
        rows: [{ id: "tokyo", title: "Tokyo", description: undefined }],
      },
    ],
    preview: { kind: "content", text: "Choose a destination." },
  });

  const mediaHeader = normalizeStructuredMessage(
    dataContent("interactive", {
      type: "button",
      header: {
        type: "document",
        document: { id: "media-1", filename: "terms.pdf" },
      },
      body: { text: "Review the terms" },
      action: {
        buttons: [{ type: "reply", reply: { id: "ok", title: "OK" } }],
      },
    }),
  );
  assert.deepEqual("header" in mediaHeader ? mediaHeader.header : undefined, {
    kind: "media",
    mediaType: "document",
    filename: "terms.pdf",
  });

  const malformedMediaHeader = dataContent("interactive", {
    type: "button",
    header: { type: "image", image: {} },
    body: { text: "Missing media reference" },
    action: {
      buttons: [{ type: "reply", reply: { id: "ok", title: "OK" } }],
    },
  });
  assert.deepEqual(normalizeStructuredMessage(malformedMediaHeader), {
    kind: "json",
    data: malformedMediaHeader.data,
    preview: { kind: "label", text: "Mensaje no compatible" },
  });
});

void test("normalizes products, product lists, and catalog prompts", () => {
  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "product",
        footer: { text: "Availability may change" },
        action: { catalog_id: "catalog-1", product_retailer_id: "sku-1" },
      }),
    ),
    {
      kind: "product",
      header: undefined,
      body: undefined,
      footer: "Availability may change",
      catalogId: "catalog-1",
      productRetailerId: "sku-1",
      preview: { kind: "label", text: "Mensaje de producto" },
    },
  );

  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "product_list",
        header: { type: "text", text: "Featured" },
        body: { text: "Choose a product" },
        action: {
          catalog_id: "catalog-1",
          sections: [
            {
              title: "Popular",
              product_items: [
                { product_retailer_id: "sku-1" },
                { product_retailer_id: "sku-2" },
              ],
            },
            {
              title: "Other",
              product_items: [{ product_retailer_id: "sku-3" }],
            },
          ],
        },
      }),
    ),
    {
      kind: "product_list",
      header: { kind: "text", text: "Featured" },
      body: "Choose a product",
      footer: undefined,
      catalogId: "catalog-1",
      sections: [
        { title: "Popular", productRetailerIds: ["sku-1", "sku-2"] },
        { title: "Other", productRetailerIds: ["sku-3"] },
      ],
      productCount: 3,
      preview: { kind: "content", text: "Choose a product" },
    },
  );

  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "catalog_message",
        body: { text: "Browse our catalog" },
        action: {
          name: "catalog_message",
          parameters: { thumbnail_product_retailer_id: "sku-1" },
        },
      }),
    ),
    {
      kind: "catalog",
      header: undefined,
      body: "Browse our catalog",
      footer: undefined,
      thumbnailProductRetailerId: "sku-1",
      preview: { kind: "content", text: "Browse our catalog" },
    },
  );
});

void test("normalizes location requests and safe location responses", () => {
  assert.equal(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "location_request_message",
        body: { text: "Share your location" },
        action: { name: "send_location" },
      }),
    ).kind,
    "location_request",
  );

  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("location", {
        name: "Main office",
        address: "1 Example Street",
        latitude: 1.25,
        longitude: 2.5,
        url: "https://example.com/location",
      }),
    ),
    {
      kind: "location",
      name: "Main office",
      address: "1 Example Street",
      latitude: 1.25,
      longitude: 2.5,
      url: "https://example.com/location",
      preview: { kind: "content", text: "Main office" },
    },
  );

  const invalidUrl = normalizeStructuredMessage(
    dataContent("location", {
      name: "Main office",
      address: "1 Example Street",
      latitude: 1.25,
      longitude: 2.5,
      url: "javascript:alert(1)",
    }),
  );
  assert.equal(
    invalidUrl.kind === "location" ? invalidUrl.url : "wrong",
    undefined,
  );
});

void test("normalizes flows without exposing completion values", () => {
  assert.equal(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "flow",
        body: { text: "Complete the form" },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: "token",
            flow_id: "flow-1",
            flow_cta: "Open form",
          },
        },
      }),
    ).kind,
    "flow",
  );

  const response = normalizeStructuredMessage(
    dataContent("interactive", {
      type: "nfm_reply",
      nfm_reply: {
        name: "Customer details",
        body: "Response submitted",
        response_json:
          '{"password":"must-not-render","email":"user@example.com"}',
      },
    }),
  );
  assert.deepEqual(response, {
    kind: "flow_response",
    name: "Customer details",
    body: "Response submitted",
    preview: { kind: "label", text: "Respuesta de Flow recibida" },
  });
  assert.equal(JSON.stringify(response).includes("must-not-render"), false);
  assert.equal(JSON.stringify(response).includes("user@example.com"), false);
});

void test("normalizes orders and totals only compatible currencies", () => {
  const order = normalizeStructuredMessage(
    dataContent("order", {
      catalog_id: "catalog-1",
      text: "Your order",
      product_items: [
        {
          product_retailer_id: "sku-1",
          quantity: "2",
          item_price: "12.50",
          currency: "USD",
        },
        {
          product_retailer_id: "sku-2",
          quantity: "1",
          item_price: "5",
          currency: "USD",
        },
      ],
    }),
  );
  assert.equal(order.kind === "order" ? order.total?.amount : undefined, 30);

  const mixed = normalizeStructuredMessage(
    dataContent("order", {
      catalog_id: "catalog-1",
      text: "Mixed order",
      product_items: [
        {
          product_retailer_id: "sku-1",
          quantity: "1",
          item_price: "10",
          currency: "USD",
        },
        {
          product_retailer_id: "sku-2",
          quantity: "1",
          item_price: "10",
          currency: "EUR",
        },
      ],
    }),
  );
  assert.equal(mixed.kind === "order" ? mixed.total : "wrong", undefined);
});

void test("keeps selections readable and malformed data defensive", () => {
  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "button_reply",
        button_reply: { id: "finish", title: "Finish" },
      }),
    ),
    {
      kind: "selected_reply",
      text: "Finish",
      preview: { kind: "content", text: "Finish" },
    },
  );

  const malformed = dataContent("interactive", {
    type: "product_list",
    body: { text: "Broken" },
    action: { catalog_id: "catalog-1", sections: [] },
  });
  assert.deepEqual(normalizeStructuredMessage(malformed), {
    kind: "json",
    data: malformed.data,
    preview: { kind: "label", text: "Mensaje no compatible" },
  });
});

void test("builds localized previews without serializing structured data", () => {
  assert.equal(
    getMessagePreviewText(buttonMessage),
    "Choose a runtime test path.",
  );
  assert.equal(getMessagePreviewText(listMessage), "Choose a destination.");
  assert.equal(
    getMessagePreviewText(
      dataContent("interactive", {
        type: "product",
        action: { catalog_id: "catalog-1", product_retailer_id: "sku-1" },
      }),
      (key) => `translated:${key}`,
    ),
    "translated:Mensaje de producto",
  );
  assert.equal(
    getMessagePreviewText(dataContent("unknown", { secret: "not-in-preview" })),
    "Mensaje no compatible",
  );
  assert.equal(getMessagePreviewText({ type: "file" }), undefined);
});
