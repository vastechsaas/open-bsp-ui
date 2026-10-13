# Messages workspace refinement

Backend branch: `codex/messages-status-counters`.
Frontend branch: `codex/messages-workspace-refinement`.
Release target: staging only; Main requires explicit approval.

## Approved design

- Preserve left navigation and right customer-details/Previous chats panels.
- Existing role-specific conversation views move above the inbox/chat, with
  server-derived counters. Names, order, availability and meaning stay unchanged.
- Queue selection moves into Filters next to search, with an active indicator,
  Clear and failure Retry. Counts follow the queue, not search text; Mentioned
  retains its global scope. No sort dropdown or Live label is added.
- Newest-first/pinned/Mentioned ordering stays unchanged.
- Refine chat spacing, bubbles, sender labels, inbox rows and composer using
  existing theme tokens. Refined bubbles are opt-in from Chat, so Previous chats
  retains its existing rendering. Media and messaging tools remain available.
- Ownership banner uses the same lifecycle query as header/composer and never
  grants sending rights. Waiting support still means chatbot active; only
  confirmed takeover means chatbot paused.

## Data and reliability

`useConversationQueueCounts` calls the authenticated counter RPC with the current
organization and queue. Cache keys include user, organization and queue; obsolete
requests are abortable and discarded. Realtime changes invalidate the scoped
query in bounded batches, with visible-page 30-second polling and focus/reconnect
refresh. Failed totals are unavailable, never fabricated zeros.

The status config cache also includes user identity, preventing owner tabs from
being reused by an agent signing into the same organization.

## Validation and release

Local frontend suite: 393 tests passed, including 13 new workspace tests.
The matching backend passed 1,097 database assertions (14 new counter assertions).
New files have zero lint warnings; repository baseline warnings remain separate.

Staging backend verification completed on 2026-10-13 after schema/data backup:
RPC exists, anonymous execution denied, and all owner/supervisor/agent counts
match their existing authorized view queries. Only the counter migration was
applied. Frontend browser verification follows its staging deployment.

Staging browser smoke checks: authenticated owner view, live status totals,
VIP filter and Clear, preserved customer-details/Previous chats controls, loaded
history and media rendering. A mobile cascade conflict found during the review
was corrected with a Messages-scoped higher-specificity grid rule and regression
assertion. No messages were sent and no ownership/closure actions were performed.
Agent/supervisor totals were verified through read-only authenticated database
checks; their separate UI sign-ins and real Node lifecycle transitions still
need team acceptance testing.

Deploy the backend RPC before merging the dependent frontend into
`meta_vista_frontend`. Main, Node runtime and DKR flows are outside this release.

Staging review checklist:

1. Owner/supervisor: All (active), Assigned, Pending, Mentioned, Spam, Closed,
   Expired. Agent: Pending, Assigned, Mentioned, Spam, Closed, Expired.
2. Compare successful counts to complete authorized view results, not previews.
   Confirm routing-filter changes and successful zeros.
3. Confirm both sidebars, availability toggle and notification controls remain.
4. Confirm chat history/scrolling, media, private notes, bubble themes, desktop
   resizing and mobile inbox/chat navigation.
5. Confirm bot/support/human/pending/error banners and existing action fences on
   disposable support chats only. No real customer actions are needed for visual
   review.
6. Verify request failures display Retry; account/org switching cannot restore
   another scope's totals.

Rollback restores the previous frontend staging commit; the additive backend RPC
may remain. No message data is rewritten by this feature.
