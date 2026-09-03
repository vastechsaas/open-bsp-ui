import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const recorder = readFileSync("src/components/VoiceRecorder.tsx", "utf8");
const footer = readFileSync("src/components/ChatFooter.tsx", "utf8");
const previewer = readFileSync("src/components/FilePreviewer.tsx", "utf8");

test("voice recorder supports permission, pause, preview, conversion and cancellation", () => {
  for (const expected of [
    "getUserMedia",
    "MediaRecorder",
    ".pause()",
    ".resume()",
    "<audio",
    "/v1/voice/transcode",
    "releaseMicrophone",
    "MAX_RECORDING_SECONDS",
  ])
    assert.match(
      recorder,
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
});

test("voice recording is tenant authenticated and stored as an audio message", () => {
  assert.match(recorder, /X-Organization-Id/);
  assert.match(recorder, /access_token/);
  assert.match(footer, /kind: "audio"/);
  assert.match(footer, /status: "pending"/);
});

test("microphone is limited to open WhatsApp customer replies", () => {
  assert.match(footer, /conv\.service === "whatsapp"/);
  assert.match(footer, /disabled={!inCSWindow}/);
  assert.match(footer, /customerReplyAllowed/);
});

test("ordinary uploaded audio is classified as audio", () => {
  assert.match(previewer, /startsWith\("audio\/"\)/);
});
