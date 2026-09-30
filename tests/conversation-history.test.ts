import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
  olderMessagesFilter,
  isNearChatBottom,
} from "../src/utils/ConversationHistoryUtils.ts";

void test("history cursor includes the ID so same-time messages remain reachable", () => {
  const timestamp = "2026-09-29T21:08:34+00:00";
  const rows = Array.from({ length: 65 }, (_, index) => ({
    timestamp,
    id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
  })).reverse();
  const first = rows.slice(0, HISTORY_PAGE_SIZE);
  const cursor = nextHistoryCursor(first)!;
  assert.equal(
    olderMessagesFilter(cursor),
    `timestamp.lt.${timestamp},and(timestamp.eq.${timestamp},id.lt.${cursor.id})`,
  );
  const second = rows
    .filter(
      (row) =>
        row.timestamp < cursor.timestamp ||
        (row.timestamp === cursor.timestamp && row.id < cursor.id),
    )
    .slice(0, HISTORY_PAGE_SIZE);
  const lastCursor = nextHistoryCursor(second)!;
  const third = rows.filter((row) => row.id < lastCursor.id);
  assert.equal(
    new Set([...first, ...second, ...third].map((row) => row.id)).size,
    65,
  );
  assert.equal(nextHistoryCursor(third), undefined);
});

void test("empty and single-message histories stop pagination", () => {
  assert.equal(nextHistoryCursor([]), undefined);
  assert.equal(
    nextHistoryCursor([
      {
        timestamp: "2026-09-29T21:08:34Z",
        id: "00000000-0000-0000-0000-000000000001",
      },
    ]),
    undefined,
  );
  assert.throws(() =>
    olderMessagesFilter({ timestamp: "injected,value", id: "wrong" }),
  );
});

void test("incoming messages follow only when reading near the bottom", () => {
  assert.equal(isNearChatBottom(1400, 2000, 600), true);
  assert.equal(isNearChatBottom(1320, 2000, 600), true);
  assert.equal(isNearChatBottom(100, 2000, 600), false);
});

void test("history controls are translated in every supported language", () => {
  for (const language of ["en", "fr", "pt", "sw"]) {
    const dictionary = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of [
      "Cargando mensajes…",
      "No se pudo cargar el historial.",
      "Inicio de la conversación",
      "Cargar mensajes anteriores",
    ]) {
      assert.ok(dictionary[key], `${language}: ${key}`);
    }
  }
});
