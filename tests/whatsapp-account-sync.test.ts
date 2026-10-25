import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountSyncConfirmed,
  parseWhatsAppAccountSync,
} from "../src/utils/WhatsAppAccountSyncUtils";

void test("synchronization requires authoritative matching revisions", () => {
  const row = parseWhatsAppAccountSync({
    revision: "3",
    ack_revision: "2",
    status: "synchronized",
    access_token: "must-not-leak",
  })!;
  assert.equal(accountSyncConfirmed(row), false);
  assert.equal(JSON.stringify(row).includes("must-not-leak"), false);
  assert.equal(accountSyncConfirmed({ ...row, ack_revision: "3" }), true);
  for (const status of ["pending", "syncing", "failed"] as const)
    assert.equal(accountSyncConfirmed({ ...row, status }), false);
});
void test("unmapped accounts have no Node indicator and malformed responses fail closed", () => {
  assert.equal(parseWhatsAppAccountSync(null), null);
  for (const value of [
    {},
    { revision: 3, ack_revision: "3", status: "synchronized" },
    { revision: "3", ack_revision: "3", status: "unexpected" },
  ])
    assert.throws(() => parseWhatsAppAccountSync(value));
});
