import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

void test("pending invitations are available before organization selection", () => {
  const layout = readSource("../src/routes/_auth.tsx");
  const gate = readSource("../src/components/PendingInvitationGate.tsx");

  assert.match(layout, /const invitations = useInvitations\(\)/);
  assert.match(layout, /\(invitations\.data\?\.length \?\? 0\) > 0/);
  assert.match(
    layout,
    /<PendingInvitationGate invitations=\{invitations\.data \?\? \[\]\} \/>/,
  );
  assert.ok(
    layout.indexOf("{hasPendingInvitations ? (") <
      layout.indexOf(") : isWorkspaceRoute ? ("),
    "the invitation gate must render before dashboard and other workspaces",
  );
  assert.match(gate, /status: "accepted" \| "rejected"/);
  assert.match(gate, /queryKeys\.organizations\.all\(\)/);
});

void test("pending invitation copy exists in every supported locale", () => {
  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readSource(`../public/locales/${language}.json`),
    ) as Record<string, string>;

    assert.ok(
      translations["Aceptá una invitación para acceder a la organización."],
      language,
    );
    assert.ok(translations["No se pudo responder a la invitación."], language);
  }
});
