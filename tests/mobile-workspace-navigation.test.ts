import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file: string) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

void test("mobile workspaces and stats provide navigation without changing desktop or chat headers", () => {
  const layout = read("src/routes/_auth.tsx");
  assert.match(
    layout,
    /viewportWidth < 768 &&\s*\(isWorkspaceRoute \|\| isStatsRoute\) &&\s*!isFullscreenWorkspaceRoute &&\s*!hasPendingInvitations/,
  );
  assert.match(
    layout,
    /<MobileWorkspaceNavigation key=\{`\$\{activeOrgId\}:\$\{pathname\}`\}/,
  );
  assert.match(layout, /flex min-h-0 min-w-0 flex-1 flex-col/);
  assert.match(layout, /<MessagesWorkspaceHeader \/>/);
});

void test("hamburger opens a dismissible themed drawer reusing existing permission-aware navigation", () => {
  const source = read("src/components/MobileWorkspaceNavigation.tsx");
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(source, /onClose=\{\(\) => setOpen\(false\)\}/);
  assert.match(source, /placement="left"/);
  assert.match(source, /closest\("a\[href\]"\)/);
  assert.match(source, /<Menu expanded canToggle=\{false\}/);
  assert.match(source, /destroyOnHidden/);
  assert.match(source, /sidebar-foreground/);
  assert.doesNotMatch(source, /to="\//); // Never duplicate module/role visibility rules.
});

void test("mobile navigation reuses translated labels in every supported language", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const dictionary = JSON.parse(
      read(`public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const label of [
      "Expandir navegación",
      "Navegación principal",
      "Cerrar",
    ]) {
      assert.ok(dictionary[label], `${locale}: ${label}`);
    }
  }
});
