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
  body: { text: "Choose a runtime test path." },
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
      {
        title: "Other",
        rows: [{ id: "tokyo", title: "Tokyo" }],
      },
    ],
  },
});

void test("normalizes outgoing WhatsApp reply buttons", () => {
  assert.deepEqual(normalizeStructuredMessage(buttonMessage), {
    kind: "interactive_buttons",
    body: "Choose a runtime test path.",
    buttons: [
      { id: "open-menu", title: "Open menu" },
      { id: "finish", title: "Finish" },
    ],
  });
});

void test("normalizes lists with multiple sections and optional descriptions", () => {
  assert.deepEqual(normalizeStructuredMessage(listMessage), {
    kind: "interactive_list",
    body: "Choose a destination.",
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
  });
});

void test("normalizes incoming interactive and template-button replies", () => {
  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "button_reply",
        button_reply: { id: "finish", title: "Finish" },
      }),
    ),
    { kind: "selected_reply", text: "Finish" },
  );

  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("interactive", {
        type: "list_reply",
        list_reply: {
          id: "london",
          title: "London",
          description: "United Kingdom",
        },
      }),
    ),
    { kind: "selected_reply", text: "London" },
  );

  assert.deepEqual(
    normalizeStructuredMessage(
      dataContent("button", { text: "Confirm", payload: "confirm-account" }),
    ),
    { kind: "selected_reply", text: "Confirm" },
  );
});

void test("keeps malformed and unsupported structured payloads as JSON", () => {
  const malformed = dataContent("interactive", {
    type: "button",
    body: { text: "Broken buttons" },
    action: { buttons: [{ type: "reply", reply: { title: "Missing ID" } }] },
  });
  const unsupported = dataContent("interactive", {
    type: "product",
    action: { catalog_id: "catalog-1" },
  });

  assert.deepEqual(normalizeStructuredMessage(malformed), {
    kind: "json",
    data: malformed.data,
  });
  assert.deepEqual(normalizeStructuredMessage(unsupported), {
    kind: "json",
    data: unsupported.data,
  });
});

void test("builds readable conversation previews for supported message shapes", () => {
  assert.equal(
    getMessagePreviewText({ type: "text", text: "Plain message" }),
    "Plain message",
  );
  assert.equal(
    getMessagePreviewText(buttonMessage),
    "Choose a runtime test path.",
  );
  assert.equal(getMessagePreviewText(listMessage), "Choose a destination.");
  assert.equal(
    getMessagePreviewText(
      dataContent("interactive", {
        type: "button_reply",
        button_reply: { id: "finish", title: "Finish" },
      }),
    ),
    "Finish",
  );
  assert.equal(
    getMessagePreviewText(
      dataContent("button", { text: "Confirm", payload: "confirm-account" }),
    ),
    "Confirm",
  );
});

void test("preserves existing preview fallbacks", () => {
  assert.equal(
    getMessagePreviewText(dataContent("unknown", { raw: true })),
    '{"raw":true}',
  );
  assert.equal(
    getMessagePreviewText(dataContent("media_placeholder", {})),
    undefined,
  );
  assert.equal(getMessagePreviewText({ type: "file" }), undefined);
});
