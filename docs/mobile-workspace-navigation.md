# Mobile workspace navigation hotfix

Full-width workspaces hide the desktop sidebar below 768px. The dashboard had
no alternate navigation, trapping mobile users on their landing page.

Add a mobile-only hamburger/header to the shared workspace layout (including
Statistics), opening the existing expanded Menu in an accessible Ant Design
drawer. Existing role, module-permission and integration-availability rules are
reused unchanged. No duplicate list of module links or new permissions.

Close on link selection, mask/Escape/Close, or route/organization changes. Unmount
on desktop resize; keep pending-invitation and fullscreen-builder layouts
unchanged. Bound the remaining workspace height so the header does not push the
bottom of the page outside the viewport. Login landing-page rules are unchanged.

Use existing translated labels and theme tokens. No database migration, backend
function update, campaign/chatbot-worker restart or staging CLI access required.

Validation: 14 focused dashboard/sidebar/mobile checks passed. Full frontend
test suite passed 476 tests; database-type synchronization, full lint,
TypeScript and production build passed. Existing unrelated lint warnings remain;
changed files lint clean.

Delivery: separate Main/staging UI branches, Vercel deployments for public Main
and staging, plus the existing loopback-only Oracle frontend copy. Preserve its
verified public Oracle configuration and prior image for rollback. The public
Social Connect domain stays on Vercel and continues using the Oracle backend.

Rollout verified 2026-11-10 (Asia/Karachi):

- Main implementation: `a14014329c8beef9ef08d4c2e6708f933970f18f`.
- Staging implementation: `a5e6c8dfb4bcdc9ca84aea09f7c9812eb4e84acc`.
- Both Vercel deployments succeeded. Public Main and staging served the new
  mobile-navigation component; Main retained the Oracle backend and staging
  retained its staging backend.
- Oracle frontend candidate is healthy on loopback-only `127.0.0.1:8088`, image
  `local/socialconnect-frontend:a14014329c8b-mobile-navigation`. Previous image
  `local/socialconnect-frontend:004acfedf37f-selfhost` is retained.
- Oracle backup: `/home/ubuntu/wababase/backups/mobile-navigation-20261109T211943Z`.
- Staging focused checks passed all 14 tests. No database, backend-service,
  provider-routing or DNS changes. No customer messages sent.
- Verification covered automated checks, deployed assets and container health;
  an authenticated physical-device interaction test was not performed.
