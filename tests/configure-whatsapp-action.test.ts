import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

void test("Configure WhatsApp is disabled when a number is already connected", () => {
  const layout = readSource("../src/routes/_auth.tsx");
  const actionCard = readSource("../src/components/ActionCard.tsx");

  assert.match(layout, /useOrganizationsAddresses/);
  assert.match(layout, /address\.service === "whatsapp"/);
  assert.match(layout, /address\.status === "connected"/);
  assert.match(layout, /disabled=\{hasConnectedWhatsApp\}/);
  assert.match(actionCard, /aria-disabled="true"/);
  assert.match(actionCard, /if \(disabled\)/);
});
