import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatbotServingStatus from "../src/components/chatbots/ChatbotServingStatus.tsx";
import {
  getChatbotServingStates,
  readServingBindingPages,
  SERVING_BINDING_PAGE_SIZE,
  type ChatbotServingSnapshot,
  type NodeServingBinding,
  type NativeServingBinding,
} from "../src/utils/ChatbotServingUtils.ts";

function binding(
  overrides: Partial<NodeServingBinding> = {},
): NodeServingBinding {
  return {
    flow_id: "selected-flow",
    flow_version_id: "deployed-version",
    organization_address: "number-id",
    engine: "node",
    sync_status: "active",
    version: { version: 7 },
    number: { status: "connected", phone_number: "+923001234567" },
    ...overrides,
  };
}
const empty: ChatbotServingSnapshot = { native: [], node: [] };
const states = (node: NodeServingBinding) =>
  getChatbotServingStates("selected-flow", "active", {
    native: [],
    node: [node],
  });

void test("available and unpublished flows are not serving without a number binding", () => {
  assert.deepEqual(getChatbotServingStates("unpublished", "active", empty), []);
  assert.deepEqual(
    getChatbotServingStates("other-flow", "active", {
      native: [],
      node: [binding()],
    }),
    [],
  );
});
void test("only the confirmed selected version serves, not the latest draft/published version", () => {
  assert.deepEqual(states(binding())[0], {
    engine: "node",
    address: "number-id",
    phone: "+923001234567",
    version: 7,
    versionId: "deployed-version",
    state: "serving",
  });
  assert.deepEqual(
    getChatbotServingStates("selected-flow", "archived", {
      native: [],
      node: [binding()],
    }),
    [],
  );
});
void test("pending, failed, suspended, disabled and disconnected states never claim serving", () => {
  for (const [sync_status, expected] of [
    ["pending", "syncing"],
    ["syncing", "syncing"],
    ["failed", "failed"],
    ["suspended", "suspended"],
    ["disabled", "disabled"],
  ])
    assert.equal(states(binding({ sync_status }))[0]?.state, expected);
  for (const override of [
    { engine: "disabled" },
    { engine: "transitioning" },
    { flow_version_id: null },
    { version: null },
    { number: null },
    { number: { status: "disconnected", phone_number: null } },
  ])
    assert.notEqual(states(binding(override))[0]?.state, "serving");
});
void test("native deployments serve only when this number's engine selection permits native", () => {
  const native: NativeServingBinding = {
    flow_id: "native-flow",
    flow_version_id: "native-version",
    organization_address: "native-number",
    version: { version: 3 },
    number: {
      status: "connected",
      phone_number: null,
      chatbot_node_bridges: [],
    },
  };
  const snapshot: ChatbotServingSnapshot = { native: [native], node: [] };
  assert.equal(
    getChatbotServingStates("native-flow", "active", snapshot)[0]?.state,
    "serving",
  );
  for (const engine of ["node", "transitioning", "disabled"]) {
    snapshot.native[0].number!.chatbot_node_bridges = [{ engine }];
    assert.deepEqual(
      getChatbotServingStates("native-flow", "active", snapshot),
      [],
    );
    snapshot.native[0].number!.chatbot_node_bridges = { engine };
    assert.deepEqual(
      getChatbotServingStates("native-flow", "active", snapshot),
      [],
    );
  }
});
void test("multiple numbers retain their own serving and failure statuses", () => {
  const result = getChatbotServingStates("selected-flow", "active", {
    native: [],
    node: [
      binding({ organization_address: "b", sync_status: "failed" }),
      binding({ organization_address: "a" }),
    ],
  });
  assert.deepEqual(
    result.map((row) => [row.address, row.state]),
    [
      ["a", "serving"],
      ["b", "failed"],
    ],
  );
});

function render(
  overrides: Partial<Parameters<typeof ChatbotServingStatus>[0]> = {},
) {
  return renderToStaticMarkup(
    createElement(ChatbotServingStatus, {
      states: states(binding()),
      loading: false,
      error: false,
      archived: false,
      translate: (key) =>
        (
          JSON.parse(
            readFileSync(
              new URL("../public/locales/en.json", import.meta.url),
              "utf8",
            ),
          ) as Record<string, string>
        )[key] || key,
      ...overrides,
    }),
  );
}
void test("badge shows customer-serving state, engine, activated version and phone", () => {
  const html = render();
  for (const text of ["Serving customers", "Node", "v7", "+923001234567"])
    assert.ok(html.includes(text));
  assert.ok(render({ states: [] }).includes("Not activated"));
  assert.ok(
    render({
      states: states(
        binding({ number: { status: "connected", phone_number: null } }),
      ),
    }).includes("Number ID: number-id"),
  );
});
void test("loading and refresh failures never expose a stale serving badge", () => {
  for (const overrides of [
    { loading: true },
    { error: true },
    { archived: true },
  ]) {
    assert.ok(!render(overrides).includes("Serving customers"));
  }
  assert.ok(render({ error: true }).includes("Status unavailable"));
  assert.ok(render({ loading: true }).includes("Checking activation"));
});
void test("all serving labels have translations in every supported language", () => {
  const source = readFileSync(
    new URL(
      "../src/components/chatbots/ChatbotServingStatus.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const keys = [
    "Disponible",
    "Disponibles",
    "Atendiendo clientes",
    "Atención al cliente",
    "Sincronización pendiente",
    "Error de sincronización",
    "Suspendido",
    "Desactivado",
    "Estado no disponible",
    "Comprobando activación…",
    "No activado",
    "ID del número",
    "No se pudo comprobar qué chatbot está activado.",
    "Disponible no significa activado. La atención al cliente muestra la versión confirmada para nuevos recorridos, no el borrador.",
  ];
  assert.ok(source.includes('t("Archivado")'));
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${lang}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(translations[key], `${lang}: ${key}`);
  }
});
void test("bindings are fetched in bounded pages without truncation", async () => {
  const ranges: number[][] = [];
  const rows = await readServingBindingPages((from, to) => {
    ranges.push([from, to]);
    return Promise.resolve(
      from === 0
        ? Array.from({ length: SERVING_BINDING_PAGE_SIZE }, (_, i) => i)
        : [500, 501],
    );
  }, new AbortController().signal);
  assert.equal(rows.length, 502);
  assert.deepEqual(ranges, [
    [0, 499],
    [500, 999],
  ]);
});
void test("binding failures and cancelled scopes are not converted to empty activations", async () => {
  await assert.rejects(
    readServingBindingPages(
      () => Promise.reject(Error("Permission denied")),
      new AbortController().signal,
    ),
    /Permission denied/,
  );
  const abort = new AbortController();
  await assert.rejects(
    readServingBindingPages(() => {
      abort.abort();
      return Promise.resolve([]);
    }, abort.signal),
    { name: "AbortError" },
  );
});
void test("query is scoped to user/organization/page and cancels obsolete requests", () => {
  const source = readFileSync(
    new URL("../src/queries/useChatbotServing.ts", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("serving(orgId, userId, ids)"));
  assert.equal(source.match(/\.eq\("organization_id", orgId!\)/g)?.length, 2);
  assert.equal(source.match(/\.in\("flow_id", ids\)/g)?.length, 2);
  assert.equal(source.match(/\.abortSignal\(signal\)/g)?.length, 2);
  assert.ok(!source.includes('.select("*")'));
  assert.ok(source.includes("refetchInterval: 10000"));
});
