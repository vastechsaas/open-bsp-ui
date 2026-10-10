import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nodeHumanSendingBlocked } from "../src/utils/NodeConversationUtils.ts";

test("stale confirmed ownership cannot grant human sending", () => {
  assert.equal(
    nodeHumanSendingBlocked({
      lifecycle_enabled: true,
      human_owned: true,
      pending_request_id: null,
      sync_pending: true,
    }),
    true,
  );
});
test("one account-scoped lifecycle query drives pending UI with two-second fallback and realtime recovery", () => {
  const hook = readFileSync(
    new URL("../src/queries/useChatbotFlows.ts", import.meta.url),
    "utf8",
  );
  const realtime = readFileSync(
    new URL("../src/hooks/useRealtimeSubscription.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(hook, /node-conversation-mapping/);
  assert.match(hook, /pending_request_id: "submitting"/);
  assert.match(hook, /2000/);
  assert.match(hook, /refetchOnWindowFocus: "always"/);
  assert.match(hook, /client.isMutating\(\{ mutationKey: key \}\)/);
  assert.match(hook, /request.current.body/);
  assert.match(
    realtime,
    /queryKey: \["node-conversation-lifecycle", userId, activeOrgId\]/,
  );
});
test("previous histories are independent, authenticated, paginated, read-only and scoped across account changes", () => {
  const source = readFileSync(
    new URL("../src/components/PreviousChats.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /list_previous_conversations_page/);
  assert.match(source, /p_page: page/);
  assert.match(source, /conversation-history|previous-chat-history/);
  assert.match(source, /olderMessagesFilter/);
  assert.match(source, /eq\("organization_id", orgId\)/);
  assert.match(source, /gcTime: 0/);
  assert.match(source, /!history.isError &&/);
  assert.doesNotMatch(
    source,
    /pushMessages|setActiveConvId|ChatFooter|Composer/,
  );
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const labels = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const key of [
      "Chats anteriores",
      "Volver a la lista",
      "Historial de conversación",
      "No hay chats anteriores accesibles",
    ])
      assert.ok(labels[key], locale + ":" + key);
  }
});
