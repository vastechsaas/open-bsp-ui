import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  readApiRequestFields,
  writeApiRequestFields,
  buildApiCredentialHeaders,
  discoverApiResponsePaths,
  apiRequestFieldKind,
  updateApiOutcomeRoute,
} from "../src/utils/ChatbotApiEditor";
import {
  createChatbotNode,
  type ChatbotFlowEdge,
} from "../src/utils/ChatbotFlowUtils";

void test("guided request fields round-trip generic scalar JSON and sender variables", () => {
  const body =
    '{"phone_number":"{{customer_phone}}","count":2,"active":false,"optional":null,"note":"quotes \\" and colon: \\n"}';
  const fields = readApiRequestFields(body)!;
  assert.deepEqual(
    JSON.parse(writeApiRequestFields(fields)) as unknown,
    JSON.parse(body) as unknown,
  );
  assert.equal(apiRequestFieldKind(fields[0].value), "variable");
  assert.equal(apiRequestFieldKind(fields[1].value), "number");
  assert.equal(apiRequestFieldKind(null), "null");
  assert.deepEqual(readApiRequestFields(undefined), []);
});

void test("complex, malformed, duplicate and nonfinite JSON stay in Advanced without lossy conversion", () => {
  for (const body of [
    '{"data":{"x":1}}',
    '{"items":[1]}',
    "[1,2]",
    "null",
    "broken",
    '{"count":{{count}}}',
    '{"x":1,"x":2}',
    '{"x":1e999}',
  ])
    assert.equal(readApiRequestFields(body), null, body);
  assert.throws(() => writeApiRequestFields([{ name: "", value: "x" }]));
  assert.throws(() =>
    writeApiRequestFields([
      { name: "x", value: 1 },
      { name: "x", value: 2 },
    ]),
  );
  assert.throws(() => writeApiRequestFields([{ name: "x", value: Infinity }]));
  assert.throws(() =>
    writeApiRequestFields([{ name: "x", value: "x".repeat(16384) }]),
  );
  assert.deepEqual(
    JSON.parse(
      writeApiRequestFields([{ name: "__proto__", value: "safe" }]),
    ) as unknown,
    JSON.parse('{"__proto__":"safe"}') as unknown,
  );
});

void test("credentials use existing protected header maps, with exactly one Bearer prefix", () => {
  assert.deepEqual(
    buildApiCredentialHeaders("api_key", " X-Api-Key ", "test-only"),
    { "X-Api-Key": "test-only" },
  );
  assert.deepEqual(
    buildApiCredentialHeaders("bearer", "ignored", "test-only"),
    { Authorization: "Bearer test-only" },
  );
  assert.deepEqual(
    buildApiCredentialHeaders("bearer", "ignored", " bearer test-only "),
    { Authorization: "Bearer test-only" },
  );
  assert.deepEqual(
    buildApiCredentialHeaders("custom", "X-Custom", "exact value"),
    { "X-Custom": "exact value" },
  );
  for (const [header, value] of [
    ["Bad Header", "x"],
    ["X-Key", "\r\nx"],
    ["X-Key", "  "],
  ])
    assert.throws(() => buildApiCredentialHeaders("api_key", header, value));
});

void test("sample field discovery is generic and bounded and does not guess fields in empty arrays", () => {
  assert.deepEqual(
    discoverApiResponsePaths({
      data: { products: [{ name: "Item" }], currency: "USD" },
      ok: true,
    }),
    ["$", "data", "data.products", "data.currency", "ok"],
  );
  assert.deepEqual(discoverApiResponsePaths([]), ["$"]);
  assert.deepEqual(
    discoverApiResponsePaths({ "unsupported.key": 1, good: 0 }),
    ["$", "good"],
  );
  assert.ok(
    discoverApiResponsePaths(
      Object.fromEntries(
        Array.from({ length: 200 }, (_, i) => [`field_${i}`, i]),
      ),
    ).length <= 101,
  );
});

function routeFixture() {
  const nodes = ["api", "success", "failure", "start"].map((id) =>
    createChatbotNode(
      id === "api" ? "webhook" : id === "start" ? "start" : "send_message",
      { x: 0, y: 0 },
      id,
    ),
  );
  const edges: ChatbotFlowEdge[] = [
    {
      id: "success-edge",
      source: "api",
      target: "success",
      sourceHandle: "success",
      data: { kind: "webhook", outcome: "success" },
    },
    {
      id: "error-edge",
      source: "api",
      target: "failure",
      sourceHandle: "error",
      data: { kind: "webhook", outcome: "error" },
    },
    {
      id: "inbound-edge",
      source: "start",
      target: "api",
      data: { kind: "default" },
    },
  ];
  return { nodes, edges };
}

void test("next-step selection updates existing canvas connections, preserving the other outcome", () => {
  const { nodes, edges } = routeFixture();
  const result = updateApiOutcomeRoute(
    nodes,
    edges,
    "api",
    "success",
    "failure",
    "new-edge",
  );
  assert.equal(result.length, 3);
  assert.equal(
    result.find((edge) => edge.id === "success-edge")?.target,
    "failure",
  );
  assert.deepEqual(
    result.find((edge) => edge.id === "error-edge"),
    edges[1],
  );
  assert.deepEqual(
    updateApiOutcomeRoute(nodes, edges, "api", "success", "", "unused"),
    edges.slice(1),
  );
});

void test("API routing rejects self-links, deleted nodes, Start and graph cycles", () => {
  const { nodes, edges } = routeFixture();
  for (const target of ["api", "missing", "start"])
    assert.strictEqual(
      updateApiOutcomeRoute(nodes, edges, "api", "success", target, "unused"),
      edges,
    );
  const cyclic: ChatbotFlowEdge[] = [
    ...edges,
    { id: "back", source: "success", target: "api", data: { kind: "default" } },
  ];
  assert.strictEqual(
    updateApiOutcomeRoute(nodes, cyclic, "api", "success", "success", "unused"),
    cyclic,
  );
  assert.strictEqual(
    updateApiOutcomeRoute(
      nodes,
      edges,
      "success",
      "success",
      "failure",
      "unused",
    ),
    edges,
  );
});

void test("all guided editor labels are translated and previews remain local", () => {
  const files = [
    "src/components/chatbots/ChatbotApiRequestFields.tsx",
    "src/components/chatbots/ChatbotApiRoutes.tsx",
    "src/components/chatbots/ChatbotResponseMappings.tsx",
    "src/routes/_auth/chatbots/$flowId.tsx",
  ];
  const sources = files.map((file) => readFileSync(file, "utf8"));
  const labels = sources.flatMap((source) =>
    [...source.matchAll(/\bt\(\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  for (const language of ["en", "pt", "fr", "sw"]) {
    const locale = JSON.parse(
      readFileSync(`public/locales/${language}.json`, "utf8"),
    ) as Record<string, string>;
    for (const key of labels) assert.ok(locale[key], `${language}: ${key}`);
  }
  const route = sources[3];
  assert.match(route, /key=\{node.id\}/);
  assert.match(route, /advanced = showAdvanced \|\| fields === null/);
  assert.match(route, /buildApiCredentialHeaders/);
  assert.doesNotMatch(
    sources.slice(0, 3).join("\n"),
    /\bfetch\(|localStorage|sessionStorage/,
  );
});
