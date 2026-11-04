import assert from "node:assert/strict";
import test from "node:test";
import { renderChatMarkdown } from "../src/utils/ChatMarkdown.ts";

void test("customer URLs open in a new tab and retain path and query parameters", () => {
  const html = renderChatMarkdown(
    "See https://example.com/a_b_c?utm_source=chat&utm_medium=reply.\nAlso www.example.org",
  );
  assert.match(
    html,
    /href="https:\/\/example\.com\/a_b_c\?utm_source=chat&amp;utm_medium=reply" target="_blank" rel="noopener noreferrer"/,
  );
  assert.match(html, /<\/a>\.<br/);
  assert.match(html, /href="https?:\/\/www\.example\.org"/);
});

void test("formatted links remain single links and unsafe markup is not rendered", () => {
  const html = renderChatMarkdown(
    '[Product](https://example.com "a &quot;quoted&quot; title") [unsafe](javascript:alert(1)) <img src=x onerror=alert(1)>',
  );
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.match(html, /title="a &quot;quoted&quot; title"/);
  assert.doesNotMatch(html, /href="javascript:|<img/);
});

void test("code remains literal and normal WhatsApp formatting is retained", () => {
  const html = renderChatMarkdown("*Offer* `https://example.com`");
  assert.match(html, /<strong>Offer<\/strong>/);
  assert.match(html, /<code>https:\/\/example\.com<\/code>/);
  assert.doesNotMatch(html, /<a /);
});
