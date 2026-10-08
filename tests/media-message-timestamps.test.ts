import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { MessageInsert, MessageRow } from "../src/supabase/client.ts";
import { mediaMessageInsert } from "../src/utils/MediaMessageInsertUtils.ts";

function originalMedia(kind: "audio" | "image" | "document"): MessageInsert {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    organization_id: "00000000-0000-4000-8000-000000000002",
    conversation_id: "00000000-0000-4000-8000-000000000003",
    direction: "outgoing",
    service: "whatsapp",
    organization_address: "123456789",
    contact_address: "923001234567",
    agent_id: "00000000-0000-4000-8000-000000000004",
    content: {
      version: "1",
      type: "file",
      kind,
      file: {
        uri: "internal://media/organizations/org/attachments/file",
        mime_type: kind === "audio" ? "audio/ogg; codecs=opus" : "image/png",
        size: 19700,
        name: "test",
        ...(kind === "audio" ? { voice: true } : {}),
      },
      text: "",
    },
  };
}

function preview(insert: MessageInsert, time: string): MessageRow {
  return {
    ...insert,
    external_id: null,
    group_address: null,
    thread_id: null,
    timestamp: time,
    created_at: time,
    updated_at: time,
    status: { pending: time },
  } as MessageRow;
}

void test("immediate media uses database defaults regardless of browser clock skew", () => {
  for (const offset of [-3600000, 160, 505, 3600000]) {
    const time = new Date(
      Date.parse("2026-10-08T16:52:28Z") + offset,
    ).toISOString();
    for (const kind of ["audio", "image", "document"] as const) {
      const original = originalMedia(kind);
      const bubble = preview(original, time);
      const sent = mediaMessageInsert(bubble, original);
      assert.deepEqual(sent, original);
      for (const field of ["timestamp", "created_at", "updated_at", "status"]) {
        assert.equal(Object.hasOwn(sent, field), false, `${kind}: ${field}`);
      }
      assert.equal(
        bubble.timestamp,
        time,
        "optimistic bubble must remain unchanged",
      );
      assert.notEqual(
        sent,
        original,
        "must not return the mutable send intent",
      );
    }
  }
});

void test("explicit scheduled timestamps survive even when preview time differs", () => {
  const original = originalMedia("audio");
  original.timestamp = "2026-10-09T10:00:00Z";
  const sent = mediaMessageInsert(
    preview(original, "2026-10-08T16:52:28Z"),
    original,
  );
  assert.equal(sent.timestamp, original.timestamp);
  assert.equal(Object.hasOwn(sent, "created_at"), false);
  assert.equal(Object.hasOwn(sent, "status"), false);
});

void test("legacy uploads discard only preview metadata without mutating the bubble", () => {
  const original = originalMedia("audio");
  const bubble = preview(original, "2026-10-08T16:53:57.072Z");
  const before = structuredClone(bubble);
  const sent = mediaMessageInsert(bubble);
  for (const field of ["timestamp", "created_at", "updated_at", "status"]) {
    assert.equal(Object.hasOwn(sent, field), false);
  }
  assert.deepEqual(bubble, before);
  assert.deepEqual(sent.content, original.content);
  assert.equal(sent.id, original.id, "upload retry keeps its deduplication ID");
  assert.equal(sent.organization_id, original.organization_id);
  assert.equal(sent.agent_id, original.agent_id);
});

void test("voice and attachment uploads both retain their original insert", () => {
  for (const path of [
    "src/components/ChatFooter.tsx",
    "src/components/FilePreviewer.tsx",
  ]) {
    assert.match(readFileSync(path, "utf8"), /messageInsert: record/);
  }
  const hook = readFileSync("src/hooks/useMedia.ts", "utf8");
  assert.match(hook, /mediaMessageInsert\(message, load\.messageInsert\)/);
  assert.doesNotMatch(hook, /pushMessageToDb\(message as MessageInsert\)/);
});
