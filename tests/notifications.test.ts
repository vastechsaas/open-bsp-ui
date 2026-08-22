import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

void test("notification queries use the protected paginated and read RPCs", () => {
  const query = readSource("../src/queries/useNotifications.ts");

  assert.match(query, /list_user_notifications_page/);
  assert.match(query, /p_page: page/);
  assert.match(query, /p_page_size: PAGE_SIZE/);
  assert.match(query, /p_unread_only: unreadOnly/);
  assert.match(query, /get_unread_notification_count/);
  assert.match(query, /mark_user_notification_read/);
  assert.match(query, /mark_all_user_notifications_read/);
});

void test("the sidebar notification center supports unread state and deep links", () => {
  const menu = readSource("../src/components/Menu.tsx");
  const center = readSource("../src/components/NotificationCenter.tsx");

  assert.match(menu, /NotificationCenter expanded=\{expanded\}/);
  assert.match(center, /unreadCount > 0/);
  assert.match(center, /Marcar todo como leído/);
  assert.match(center, /setUnreadOnly\(onlyUnread\)/);
  assert.match(center, /markRead\.mutateAsync\(notification\.id\)/);
  assert.match(center, /to: "\/conversations"/);
  assert.match(center, /hash: notification\.conversation_id/);
});

void test("notification text covers every backend event type", () => {
  const center = readSource("../src/components/NotificationCenter.tsx");

  for (const type of [
    "conversation_assigned",
    "conversation_transferred_to_agent",
    "conversation_transferred_to_queue",
    "private_note_mention",
  ]) {
    assert.match(center, new RegExp(type));
  }
});

void test("realtime and recovery invalidate tenant-scoped notification data", () => {
  const realtime = readSource("../src/hooks/useRealtimeSubscription.ts");

  assert.match(realtime, /table: "user_notifications"/);
  assert.match(realtime, /queryKeys\.notifications\.root\(activeOrgId\)/);
  assert.match(realtime, /refreshNotifications/);
});

void test("every supported locale contains notification copy", () => {
  const keys = [
    "Notificaciones",
    "Marcar todo como leído",
    "Se te asignó una conversación",
    "te transfirió una conversación",
    "transfirió una conversación a",
    "te mencionó en una nota privada",
  ];

  for (const locale of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readSource(`../public/locales/${locale}.json`),
    ) as Record<string, string>;

    for (const key of keys) {
      assert.ok(translations[key], `${locale} is missing ${key}`);
    }
  }
});
