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
the existing campaign-history integration is preserved. The user subsequently
authorized Main, staging and the Oracle frontend copy rollout.

Staging rollout uses `codex/conversation-history-refresh-staging` with the same
query-cache policy. Its existing array-page Chat contract and direct history
queries are retained; Main-only campaign-history endpoints are not imported.

Validation completed 2026-11-11 (Asia/Karachi): all 483 frontend tests passed;
database types match; whole-project lint has zero errors and the unchanged 378
existing warnings. Changed-file lint and formatting are clean. TypeScript and
the production build passed after correcting the generic cursor context type;
the seven new observer tests were re-run successfully after that correction.
No customer messages were sent or live data changed during validation.

Staging adaptation: all 14 focused history/access/cache tests passed, changed-file
lint is clean, and full TypeScript/production build passed. Staging's other
features and history renderer remain unchanged.

Main implementation `4c546b97e7df5ac414cab850f8fad5e178e5df43` is deployed on
Vercel. Oracle's matching loopback frontend copy is healthy, with its previous
image retained. No backend, database, worker or DNS changes were required.
