# Avoid repeated conversation-history downloads

Scope: the active Chat Center timeline, including its campaign-history entries.
No schema, endpoint, message-storage, sending or permission changes. The separate
Previous Chats dialog and inbox initialization are unchanged.

The latest 30-item batch now has a separate query from the paginated older
history. Its initial result also seeds pagination, avoiding a duplicate initial
request. Loaded pages are kept in memory for five minutes after leaving a chat,
scoped to organization, user, conversation and timeline mode. No chat content is
added to browser storage.

The latest batch is fresh for 30 seconds. Reopening/focusing a fresh chat reuses
it; a stale mount, focus or reconnect checks only that batch. Realtime recovery
invalidates only the latest-batch query. Existing live-message and missed-update
recovery continue unchanged. Older pages are fetched only by scrolling/Load more,
or by retrying that specific failed page. Refreshing the latest batch does not
replace the older pagination cursor or discard previously loaded campaign cards.

All network reads retain existing server-side authorization and abort signals.
Revoked conversations discard both history caches; logout clears the query client.
Query keys and existing store checks isolate account/organization switches and
prevent stale responses being merged into the active conversation.

This does not eliminate necessary requests for new messages, access checks,
reconnection recovery, media or expired/evicted caches. It does not virtualize the
message list or change database indexes.

## Verification

Real TanStack Query observers with mocked reads verify:

- Three loaded pages: initial request plus two older requests; a quick reopen
  adds zero requests and retains all three pages.
- Stale focus/reconnect and explicit latest recovery: one head request each;
  no replay of the older pages. A second fresh focus adds zero requests.
- A stale reopen retains the older cursor and continues at the next older page.
- Failed head/older reads retain existing pages; Retry reads only the requested
  batch without automatic retry loops.
- Cache keys isolate every scope dimension; revocation removes only the affected
  conversation's latest and older caches.

Feature branch: `codex/conversation-history-refresh`, based on current Main so
the existing campaign-history integration is preserved. Main/staging deployment
is not part of this change unless separately authorized.

Validation completed 2026-11-11 (Asia/Karachi): all 483 frontend tests passed;
database types match; whole-project lint has zero errors and the unchanged 378
existing warnings. Changed-file lint and formatting are clean. TypeScript and
the production build passed after correcting the generic cursor context type;
the seven new observer tests were re-run successfully after that correction.
No customer messages sent, live data changed, or services deployed.
