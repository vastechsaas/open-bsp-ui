import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isWhatsAppManagerWorkspacePath,
  selectWhatsAppManagerAccount,
} from "../src/utils/WhatsAppManagerUtils.ts";

void test("WhatsApp Manager uses the full-width workspace", () => {
  assert.equal(isWhatsAppManagerWorkspacePath("/whatsapp-manager"), true);
  assert.equal(isWhatsAppManagerWorkspacePath("/whatsapp-manager/"), true);
  assert.equal(isWhatsAppManagerWorkspacePath("/integrations"), false);
});

void test("WhatsApp Manager prefers the connected WhatsApp account", () => {
  const selected = selectWhatsAppManagerAccount([
    { address: "200", service: "whatsapp", status: "disconnected" },
    { address: "instagram", service: "instagram", status: "connected" },
    { address: "100", service: "whatsapp", status: "connected" },
  ]);
  assert.equal(selected?.address, "100");
  assert.equal(selectWhatsAppManagerAccount([]), undefined);
});

void test("WhatsApp icon is placed above Settings in the lower sidebar", () => {
  const menu = readFileSync(
    new URL("../src/components/Menu.tsx", import.meta.url),
    "utf8",
  );
  const managerIndex = menu.indexOf('to="/whatsapp-manager"');
  const settingsIndex = menu.indexOf('to="/settings"');
  assert.ok(managerIndex >= 0);
  assert.ok(settingsIndex > managerIndex);
});

void test("WhatsApp Manager labels exist in every supported locale", () => {
  const keys = [
    "Gestor de WhatsApp",
    "No se pudo cargar la cuenta de WhatsApp",
    "Intentá nuevamente o revisá la configuración de WhatsApp.",
    "No hay una cuenta de WhatsApp conectada",
    "Conectá WhatsApp para administrar tu perfil comercial.",
    "Intentar nuevamente",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing WhatsApp Manager labels`,
    );
  }
});
