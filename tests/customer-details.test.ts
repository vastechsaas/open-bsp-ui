import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { MessageRow } from "../src/supabase/client.ts";
import {
  getLatestCustomerInteraction,
  isValidCustomerEmail,
  normalizeCustomerDetail,
} from "../src/utils/CustomerDetailsUtils.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const readSource = (path: string) => readFileSync(`${root}/${path}`, "utf8");

function message(direction: MessageRow["direction"], timestamp: string) {
  return { direction, timestamp } as MessageRow;
}

void test("customer detail validation matches the structured backend contract", () => {
  assert.equal(isValidCustomerEmail("customer@example.com"), true);
  assert.equal(isValidCustomerEmail(""), true);
  assert.equal(isValidCustomerEmail("not-an-email"), false);
  assert.equal(normalizeCustomerDetail("  Vista Retail  "), "Vista Retail");
  assert.equal(normalizeCustomerDetail("   "), null);
});

void test("last interaction ignores private notes and other internal activity", () => {
  const messages = [
    message("incoming", "2026-08-01T10:00:00.000Z"),
    message("outgoing", "2026-08-01T11:00:00.000Z"),
    message("internal", "2026-08-01T12:00:00.000Z"),
  ];

  assert.equal(
    getLatestCustomerInteraction(messages),
    "2026-08-01T11:00:00.000Z",
  );
});

void test("the chat panel edits the canonical Contact Manager record", () => {
  const panel = readSource("src/components/CustomerDetailsPanel.tsx");
  const queries = readSource("src/queries/useContacts.ts");

  assert.match(panel, /useContactByAddress/);
  assert.match(panel, /useUpdateCustomerDetails/);
  assert.match(panel, /register\("name"\)/);
  assert.match(panel, /register\("email"/);
  assert.match(panel, /register\("company"\)/);
  assert.match(panel, /register\("job_title"\)/);
  assert.match(panel, /register\("city"\)/);
  assert.match(panel, /register\("country"\)/);
  assert.match(panel, /Abrir contacto completo/);
  assert.match(queries, /\.from\("contacts"\)/);
  assert.match(queries, /\.eq\("organization_id", orgId\)/);
  assert.match(queries, /\.in\("direction", \["incoming", "outgoing"\]\)/);
  assert.doesNotMatch(
    panel,
    /useDeleteContact|Trash2|Etiquetas|Notas del cliente|PrivateNote/,
  );
});

void test("the panel is responsive and contact changes reconcile without refresh", () => {
  const layout = readSource("src/routes/_auth.tsx");
  const realtime = readSource("src/hooks/useRealtimeSubscription.ts");

  assert.match(layout, /CustomerDetailsPanel/);
  assert.match(layout, /customerDetailsOpen \? "hidden md:flex" : "flex"/);
  assert.match(realtime, /table: "contacts"/);
  assert.match(realtime, /refreshContacts/);
  assert.match(realtime, /visibilitychange/);
});

void test("the full Contact Manager forms expose the same structured fields", () => {
  for (const path of [
    "src/routes/_auth/contacts/new.tsx",
    "src/routes/_auth/contacts/$contactId.tsx",
  ]) {
    const source = readSource(path);
    for (const field of ["email", "company", "job_title", "city", "country"]) {
      assert.match(source, new RegExp(`register\\("${field}"`));
    }
  }
});
