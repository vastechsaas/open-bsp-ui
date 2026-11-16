import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { attachmentRecovery } from "../src/utils/AttachmentRecovery.ts";
import type { MessageRow } from "../src/supabase/client.ts";

function message(state?: string, uri = "1234567"): MessageRow {
  return {
    direction: "incoming",
    service: "whatsapp",
    content: {
      version: "1",
      type: "file",
      kind: "image",
      file: { uri, mime_type: "image/jpeg", size: 17 },
      attachment_recovery: state,
    },
  } as MessageRow;
}

void test("pending and historical raw IDs never go to the Storage renderer", () => {
  assert.equal(
    attachmentRecovery(message("pending"))?.label,
    "Obteniendo el archivo adjunto…",
  );
  assert.equal(
    attachmentRecovery(message())?.label,
    "Archivo adjunto no disponible.",
  );
  assert.equal(
    attachmentRecovery(
      message("ready", "internal://media/organizations/test/attachments/key"),
    ),
    null,
  );
  assert.equal(
    attachmentRecovery({ ...message(), service: "instagram" } as MessageRow),
    null,
  );
});

void test("only confirmed loss recommends asking for a resend; all states translated", () => {
  for (const state of [
    "pending",
    "failed",
    "credentials",
    "storage",
    "unavailable",
    "too_large",
    "cancelled",
  ]) {
    const display = attachmentRecovery(message(state));
    assert.ok(display);
    assert.equal(display.label.includes("reenvíe"), state === "unavailable");
    assert.equal(
      display.retry,
      ["failed", "credentials", "storage"].includes(state),
    );
    for (const locale of ["en", "fr", "pt", "sw"]) {
      const strings = JSON.parse(
        readFileSync(
          new URL(`../public/locales/${locale}.json`, import.meta.url),
          "utf8",
        ),
      ) as Record<string, string>;
      assert.ok(strings[display.label], locale);
    }
  }
});
