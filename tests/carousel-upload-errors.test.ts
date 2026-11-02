import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CarouselCardUploadError,
  CarouselUploadError,
  normalizeCarouselUploadError,
} from "../src/utils/CarouselUploadErrors.ts";

void test("carousel errors use safe backend codes without exposing raw storage details", async () => {
  const response = new Response(
    JSON.stringify({
      message: "private storage path and credentials",
      cause: { code: "carousel_storage_quota_exceeded" },
    }),
    { status: 503 },
  );
  const error = await normalizeCarouselUploadError({ context: response });
  assert.equal(
    error.guidance,
    "Se alcanzó el límite de almacenamiento. Pedí más espacio y volvé a guardar.",
  );
  assert.equal(response.bodyUsed, false);
  const card = new CarouselCardUploadError("second", 2, error);
  assert.equal(card.cardId, "second");
  assert.equal(card.cardNumber, 2);
  assert.equal(card.guidance, error.guidance);
  assert.doesNotMatch(JSON.stringify(card), /credentials|private storage/);
});

void test("network, legacy 500 and malformed responses retain safe retry guidance", async () => {
  for (const error of [
    new Error("sensitive transport details"),
    null,
    { context: new Response("not JSON", { status: 500 }) },
    {
      context: new Response(
        JSON.stringify({ message: "Internal Server Error" }),
        { status: 500 },
      ),
    },
    {
      context: new Response(JSON.stringify({ cause: { code: "__proto__" } }), {
        status: 500,
      }),
    },
  ]) {
    const normalized = await normalizeCarouselUploadError(error);
    assert.equal(
      normalized.guidance,
      new CarouselUploadError("unknown").guidance,
    );
  }
});

void test("every upload guidance has translations in all supported languages", () => {
  const keys = [
    "carousel_upload_failed",
    "carousel_storage_quota_exceeded",
    "carousel_image_reuse_failed",
    "carousel_preview_failed",
    "carousel_image_invalid",
  ].map((code) => new CarouselUploadError(code).guidance);
  keys.push("El borrador y las imágenes anteriores se conservaron.");
  for (const language of ["en", "pt", "fr", "sw"]) {
    const dictionary = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const key of keys) assert.equal(typeof dictionary[key], "string");
  }
});

void test("editor focuses the failed card and does not claim a failed upload was submitted to Meta", () => {
  const source = readFileSync(
    new URL("../src/components/TemplateEditor.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /new CarouselCardUploadError\(card.id, index \+ 1, error\)/,
  );
  assert.match(source, /setSelectedCardId\(error.cardId\)/);
  assert.match(source, /if \(!showCardUploadError\(error\)\)/);
  assert.match(source, /let draftSaved = false/);
  assert.match(source, /draftSaved = true/);
  // Each success is still persisted before processing the next card.
  assert.match(source, /Retain each success immediately/);
  assert.match(source, /uploadedImages.current.set\(card.id, uploaded\)/);
});
