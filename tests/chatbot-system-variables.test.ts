import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createChatbotNode,
  getAvailableChatbotVariables,
  insertChatbotTemplateVariable,
  getChatbotValidationMessageKey,
} from "../src/utils/ChatbotFlowUtils";

void test("sender number is offered before any input and inserted using the portable template syntax", () => {
  const start = createChatbotNode("start", { x: 0, y: 0 }, "start");
  assert.deepEqual(getAvailableChatbotVariables("start", [start], []), [
    "conversation_id",
    "customer_phone",
  ]);
  assert.equal(
    insertChatbotTemplateVariable('{"phone_number":""}', "customer_phone", 17),
    '{"phone_number":"{{customer_phone}}"}',
  );
});

void test("system variable guidance and read-only diagnostics are translated in all supported locales", () => {
  const route = readFileSync("src/routes/_auth/chatbots/$flowId.tsx", "utf8");
  const keys = [
    "Variables del sistema (solo lectura)",
    "Teléfono del cliente",
    "Variables recopiladas",
    "Las variables del sistema son de solo lectura.",
    "Número de WhatsApp del cliente en formato internacional. En simulación: +923001234567.",
    "ID de la conversación",
    "Identificador de la conversación actual, generado por el sistema.",
  ];
  for (const language of ["en", "pt", "fr", "sw"]) {
    const locale = JSON.parse(
      readFileSync(`public/locales/${language}.json`, "utf8"),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(locale[key], `${language}: ${key}`);
  }
  assert.ok(route.includes('t("Variables del sistema (solo lectura)")'));
  assert.ok(route.includes("CHATBOT_SYSTEM_VARIABLES.map"));
  assert.equal(
    getChatbotValidationMessageKey({
      code: "system_variable_read_only",
      path: [],
      message: "System variables are read-only",
    }),
    keys[3],
  );
});
