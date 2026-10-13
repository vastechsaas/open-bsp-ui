# Compact Messages composer and headers

Branch: `codex/messages-compact-composer`, based on `meta_vista_frontend`.
Release target: staging only. Main requires subsequent approval.

## Scope

- Replace the separate Reply/Private note toolbar with an inline mode dropdown
  opening upward. Selected mode remains visible and accessible on narrow screens.
- Keep separate customer/private-note drafts, mentions, transfer, quick replies,
  templates, attachments, audio and service-window checks unchanged.
- Private notes use an amber composer, explicit team-only placeholder and
  accessible description, plus an Add note action. The note editor grows from
  one line up to 160px; existing mention chips/transfer controls appear as needed.
- Keep Closed history read-only and retain lifecycle/assignment sending fences.
  The mode selector remains available beside blocked-reply explanations, allowing
  existing authorized private-note composition without granting customer sending.
- Reduce workspace and customer headers from 60px to 52px, and reduce status-bar
  padding without changing text sizes, view names/order/counters or actions.
- Do not change the global navigation, customer-details/Previous chats panel,
  bubble themes, message history, backend, Node runtime or chatbot definitions.

## Validation

Eight new tests cover selector rendering/accessibility, mode handling, draft/tool
preservation, existing sending fences, note audience/height, scoped header styles
and all supported translations. Existing layout-dependent assertions now target
the inline control rather than the removed tab row.

Local validation: all 401 frontend tests, generated-type synchronization,
TypeScript and production build passed. Changed-file formatting/lint passed;
whole-repository lint retains its existing warning baseline (no errors).

Staging visual review should cover desktop/mobile sizing, upward-menu placement,
keyboard operation, note mode and switching back to Reply. Do not send messages
or perform takeover/closure merely to review this visual change.
