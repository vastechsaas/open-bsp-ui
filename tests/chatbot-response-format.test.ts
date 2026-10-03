import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatResponseList,
  responseValueAtPath,
  isResponseListFormat,
  type ResponseListFormat,
} from "../src/utils/ChatbotResponseFormatter.ts";
import { getChatbotValidationMessageKey } from "../src/utils/ChatbotFlowUtils.ts";

const format: ResponseListFormat = {
  kind: "list",
  item_template:
    "{{index}}. {{item.name}}: {{item.price}} {{response.currency}}\n{{item.features}}",
  separator: "\n\n",
  array_separator: ", ",
  empty_text: "No items available.",
  max_items: 20,
};
void test("builder preview matches the API/Node formatting contract for any catalogue", () => {
  const body = {
    currency: "USD",
    products: [{ name: "Widget", price: 0, features: ["A", "B"] }],
  };
  assert.deepEqual(
    formatResponseList(responseValueAtPath(body, "products"), body, format),
    { ok: true, text: "1. Widget: 0 USD\nA, B" },
  );
  assert.deepEqual(formatResponseList([], body, format), {
    ok: true,
    text: "No items available.",
  });
  assert.deepEqual(
    formatResponseList(
      ["x".repeat(4097)],
      {},
      { ...format, item_template: "{{item}}" },
    ),
    { ok: false, code: "response_format_too_long" },
  );
  assert.equal(
    isResponseListFormat({ ...format, item_template: "{{env.API_KEY}}" }),
    false,
  );
});
void test("response editor is wired to persisted mappings but sample preview remains local", () => {
  const source = readFileSync(
    new URL(
      "../src/components/chatbots/ChatbotResponseMappings.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const route = readFileSync(
    new URL("../src/routes/_auth/chatbots/$flowId.tsx", import.meta.url),
    "utf8",
  );
  assert.match(route, /<ChatbotResponseMappings/);
  assert.match(route, /onChange\(\{ response_mappings \}\)/);
  assert.match(source, /data-validation-field="response_mappings"/);
  assert.match(source, /useState\(""\)/);
  assert.doesNotMatch(
    source,
    /\bfetch\(|localStorage|supabase|onChange\([^\n]*sample/,
  );
  assert.match(source, /formatResponseList/);
  assert.match(source, /format:\s*event.target.value === "list"/);
});
void test("all response editor labels and root diagnostics have complete translations", () => {
  const source = readFileSync(
    new URL(
      "../src/components/chatbots/ChatbotResponseMappings.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const labels = [...source.matchAll(/\bt\(\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
  const issues = [
    "webhook_response_format_invalid",
    "webhook_response_mapping_invalid",
  ].map((code) =>
    getChatbotValidationMessageKey({ code, message: "fallback", path: [] }),
  );
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const translations: Record<string, string> = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of [...labels, ...issues])
      assert.ok(translations[key], `${locale}: ${key}`);
  }
});
