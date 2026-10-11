import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/PreviousChats.tsx", import.meta.url),
  "utf8",
);

void test("previous chat labels, including open status and error copy, exist in every language", () => {
  const keys = [...source.matchAll(/\bt\("([^"]+)"\)/g)].map(
    (match) => match[1],
  );
  for (const language of ["en", "pt", "fr", "sw"]) {
    const labels = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const key of keys) assert.ok(labels[key], `${language}: ${key}`);
    assert.ok(labels.Ajustes, `${language}: Settings navigation`);
  }
});

void test("previous chats use app theme tokens, keyboard focus, translated close and selected-language dates", () => {
  assert.match(source, /classNames=\{/);
  assert.match(source, /!bg-card/);
  assert.match(source, /!text-card-foreground/);
  assert.match(source, /!border-border/);
  assert.match(source, /focus-visible:ring-ring/);
  assert.match(source, /closable=\{\{ "aria-label": t\("Cerrar"\) \}\}/);
  assert.match(source, /Intl.DateTimeFormat\(currentLanguage/);
  assert.doesNotMatch(source, /toLocaleString\(\)/);
  assert.match(source, /chat.status === "spam"/);
  assert.match(source, /Esta conversación es historial de solo lectura/);
});

void test("Settings keeps its own navigation label, separate from the Preferences subsection", () => {
  const menu = readFileSync(
    new URL("../src/components/Menu.tsx", import.meta.url),
    "utf8",
  );
  const workspace = readFileSync(
    new URL(
      "../src/components/settings/SettingsWorkspaceLayout.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(menu, /title=\{t\("Ajustes"\)\}/);
  assert.match(workspace, /t\("Ajustes"\)/);
  assert.match(workspace, /title: "Preferencias generales"/);
  const english = JSON.parse(
    readFileSync(new URL("../public/locales/en.json", import.meta.url), "utf8"),
  ) as Record<string, string>;
  assert.equal(english.Ajustes, "Settings");
  assert.equal(english.Preferencias, "Preferences");
  assert.equal(english.Abierto, "Open");
});
