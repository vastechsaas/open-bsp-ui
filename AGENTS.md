# Codex Instructions

## Project context

This is the OpenBSP frontend. The related backend lives at:

```text
C:\Hurera New Laptop\open-bsp-api
```

Read this repo's `README.md` before making UI changes. When a task touches
database shape, generated types, API behavior, onboarding, integrations, or
deployment workflow, also read the backend `README.md`.

## Branches and staging

- Frontend staging branch: `meta_vista_frontend`.
- Backend staging branch: `meta_vista_backend`.
- Do not merge feature work directly to `main` unless the user explicitly asks.
- For Jira feature slices, use plain ticket/feature branch names such as
  `scrum-13-assignment-tests-docs`; do not add the `codex/` prefix unless the
  user asks for it.
- Backend changes that include migrations should be merged/deployed to backend
  staging before frontend code that depends on them.

## Backend relationship

- Schema files live in `../open-bsp-api/supabase/schemas/`.
- Never create tables directly via SQL queries or hand-write ordinary migration
  files when a schema diff can generate them.
- `src/supabase/db_types.ts` is generated from the backend database types.
  Never edit it manually.
- Hand-written shared types, such as message/status/extra/template types, are
  mirrored from the backend `_shared/types/*` into `src/supabase/types/*`.

## Syncing types from API to UI

The UI mirrors API types but cannot blindly copy them:

- UI imports are extensionless.
- Server-only dependencies and webhook/endpoint types may be pruned.
- Some fields intentionally diverge and are tagged with
  `// @ui-divergence: ...`.

Use this workflow:

1. Regenerate or copy API-generated DB types only after the backend schema is
   applied locally.
2. Ensure the generated DB types include the `billing` schema. A bare type
   generation can silently default to `public` only and break billing UI.
3. For mirrored hand-written types, paste from API, fix imports/prune server-only
   pieces, then re-apply every `@ui-divergence`.
4. Run:

```powershell
npm run types:sync-check
npm run build
npm run lint
```

Feature work that only touches `extra` JSON values may not require DB type
regeneration.

## UI validation

Use validation proportional to the change. For current feature work, prefer:

```powershell
npm test
npm run build
npm run lint
```

`npm run lint` currently has an existing warning baseline. Treat new lint errors
as blockers; do not expand warning noise unnecessarily.

## Data-table convention

Use the shared server-paginated pattern for list screens that can grow.

- Use `src/components/DataTablePagination.tsx` for page navigation and page-size
  selection. Do not recreate pagination buttons inside a module route.
- Use the shared types, constants, and page calculations from
  `src/utils/DataTableUtils.ts`. Standard page sizes are 10, 25, and 50.
- Debounce server-side search with `src/hooks/useDebouncedValue.ts` and reset to
  page 1 when search, filters, or page size changes.
- Include page, page size, search, and filters in the TanStack Query key. Keep
  the module root key as a prefix so mutations can invalidate every cached
  page.
- Fetch only the requested page from the backend. Do not fetch all records and
  paginate with frontend `slice()`, and avoid one follow-up request per row.
- Expect the backend page response to contain `rows` and `total`; backend RPC
  rows expose `total_count`, which the query hook maps into this shared shape.
- Keep table columns module-specific and preserve responsive alternatives such
  as cards where needed. Reuse pagination behavior, not one universal column
  definition.
- Show loading, error, empty, and filtered-empty states consistently.

The Campaign Manager list and `useCampaigns()` are the reference frontend
implementation for this pattern.

## Meta / Facebook onboarding notes

Current frontend routes relevant to OAuth/onboarding include:

- `/oauth/callback`
- `/oauth/instagram`
- `/onboard/instagram/callback`
- `/onboard/whatsapp/$token`

For WhatsApp Embedded Signup, staging needs:

```env
VITE_META_APP_ID=
VITE_FB_LOGIN_CONFIG_ID=
```

In the Meta app settings:

- Enable **Login with the JavaScript SDK**.
- Add the JavaScript SDK allowed domain as the bare domain only, for example:
  `vistagalaxy.vastech.biz`.
- OAuth redirect URIs must match real routes exactly. Use
  `https://vistagalaxy.vastech.biz/oauth/callback`, not
  `https://vistagalaxy.vastech.biz/oauth-callback`.

The UI should not call `FB.login()` until the Facebook SDK is loaded and
initialized with `FB.init()`.
