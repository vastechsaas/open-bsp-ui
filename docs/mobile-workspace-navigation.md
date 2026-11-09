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

Rollout evidence is recorded after deployment.
