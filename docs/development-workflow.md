# Development workflow

Install dependencies once per worktree:

```powershell
npm ci
```

Use the quick loop while implementing:

```powershell
npm run validate:quick
```

It runs the frontend tests, strict generated database-type synchronization, and
ESLint only for changed files. Before committing, run the complete checks once:

```powershell
npm run validate
```

Full validation adds whole-project lint and one production build. The build is
the single full TypeScript check because it is comparatively expensive. Run
`npm run types:sync-check` separately when changing mirrored hand-written types.

The strict database-type check defaults to the sibling backend checkout. When
working in paired feature worktrees, point it at the matching backend worktree:

```powershell
$env:API_DB_TYPES_FILE = "C:\path\to\backend-worktree\supabase\functions\_shared\db_types.ts"
npm run types:db-sync-check
```

Prefer generating and synchronizing the file from the backend in one command:

```powershell
npm --prefix "C:\path\to\backend-worktree" run types:generate -- --ui-file="C:\path\to\frontend-worktree\src\supabase\db_types.ts"
```
