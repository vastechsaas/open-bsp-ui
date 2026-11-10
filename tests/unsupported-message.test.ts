import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Json } from "../src/supabase/db_types.ts";
import {
  normalizeStructuredMessage,
  getMessagePreviewText,
} from "../src/utils/MessageDisplayUtils.ts";

const unsupported = (data: Json) => ({
  type: "data" as const,
  kind: "unsupported",
  data,
});

void test("stored album metadata becomes a readable placeholder without changing its record", () => {
  const message = unsupported({ type: "album", raw_type: "album" });
  const before = structuredClone(message);
  assert.deepEqual(normalizeStructuredMessage(message), {
    kind: "unsupported",
    preview: { kind: "label", text: "Álbum multimedia recibido" },
  });
  assert.equal(
    getMessagePreviewText(message, (key) => `translated:${key}`),
    "translated:Álbum multimedia recibido",
  );
  assert.deepEqual(message, before);
});

void test("album recognition uses explicit type metadata, never guesses from nearby media or arbitrary text", () => {
  for (const data of [{ type: "ALBUM" }, { raw_type: " album " }]) {
    assert.equal(
      normalizeStructuredMessage(unsupported(data)).preview.text,
      "Álbum multimedia recibido",
    );
  }
  for (const data of [
    null,
    [],
    {},
    { title: "album" },
    { type: { album: true } },
  ]) {
    assert.equal(
      normalizeStructuredMessage(unsupported(data as Json)).preview.text,
      "Mensaje no compatible",
    );
  }
});

void test("other unsupported messages stay visible with a generic label, not raw payload data", () => {
  for (const type of ["unknown", "poll", "future-provider-type"]) {
    const message = unsupported({
      type,
      raw_type: type,
      private_detail: "do-not-display",
    });
    const display = normalizeStructuredMessage(message);
    assert.equal(display.kind, "unsupported");
    assert.equal(display.preview.text, "Mensaje no compatible");
    assert.equal(JSON.stringify(display).includes("do-not-display"), false);
    assert.equal(
      message.data &&
        typeof message.data === "object" &&
        "private_detail" in message.data,
      true,
    );
  }
});

void test("available text and media-placeholder behavior remain unchanged; individual files are not suppressed", () => {
  assert.equal(
    normalizeStructuredMessage({
      ...unsupported({ type: "album" }),
      text: "Available message text",
    }).kind,
    "text",
  );
  assert.equal(
    normalizeStructuredMessage({
      type: "data",
      kind: "media_placeholder",
      data: {},
    }).preview.text,
    "Contenido multimedia no disponible",
  );
  const renderer = readFileSync(
    new URL(
      "../src/components/Message/interactive/StructuredMessageRenderer.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const placeholder = renderer.indexOf('display.kind === "unsupported"');
  const json = renderer.indexOf("body={display.data}");
  assert.ok(placeholder > 0 && placeholder < json);
  assert.match(renderer.slice(placeholder, json), /t\(display.preview.text\)/);
  const message = readFileSync(
    new URL("../src/components/Message/Message.tsx", import.meta.url),
    "utf8",
  );
  assert.match(message, /<ImageMessage/);
  assert.match(message, /<VideoMessage/);
});

void test("album and generic unsupported labels are translated in every supported locale", () => {
  for (const language of ["en", "fr", "pt", "sw"]) {
    const dictionary = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.ok(dictionary["Álbum multimedia recibido"]);
    assert.ok(dictionary["Mensaje no compatible"]);
    if (language === "en")
      assert.equal(
        dictionary["Álbum multimedia recibido"],
        "Media album received",
      );
  }
});
