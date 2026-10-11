import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AssignmentAvailabilityToggle from "../src/components/AssignmentAvailabilityToggle.tsx";
import { canSetConversationAvailability } from "../src/utils/AssignmentAvailabilityUtils.ts";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const render = (available: boolean | null, busy = false, failed = false) =>
  renderToStaticMarkup(
    createElement(AssignmentAvailabilityToggle, {
      available,
      busy,
      failed,
      disabled: busy || available === null,
      onToggle: () => {},
      translate: (key: string) =>
        ({ Disponible: "Available", Ausente: "Away" })[key] ?? key,
    }),
  );

void test("accepted Agents and Supervisors can control availability; other roles/invitations cannot", () => {
  for (const role of ["agent", "supervisor"]) {
    assert.equal(canSetConversationAvailability(role, "accepted"), true);
    assert.equal(canSetConversationAvailability(role, undefined), true);
    assert.equal(canSetConversationAvailability(role, "pending"), false);
    assert.equal(canSetConversationAvailability(role, "rejected"), false);
  }
  for (const role of [undefined, "owner", "admin", "member"]) {
    assert.equal(canSetConversationAvailability(role, "accepted"), false);
  }
});

void test("Available has green pill and right thumb; Away has red pill and left thumb", () => {
  const available = render(true);
  const away = render(false);
  assert.match(available, /role="switch"/);
  assert.match(available, /aria-checked="true"/);
  assert.match(available, /bg-green-700 text-white/);
  assert.match(available, /right-1/);
  assert.match(available, />Available<\/span>/);
  assert.match(away, /aria-checked="false"/);
  assert.match(away, /bg-red-700 text-white/);
  assert.match(away, /left-1/);
  assert.match(away, />Away<\/span>/);
  assert.doesNotMatch(available, / disabled=""/);
});

void test("loading and failure never pretend to be Away; pending saves disable duplicate clicks", () => {
  const loading = render(null, true);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /disabled=""/);
  assert.match(loading, /Cargando/);
  assert.doesNotMatch(loading, /bg-red-700/);
  assert.match(render(null, false, true), /Estado no disponible/);
  assert.match(render(true, true), /disabled=""/);
});

void test("header replaces only organization title and keeps notification/new-chat actions", () => {
  const header = read("../src/components/Header.tsx");
  assert.doesNotMatch(header, /organizationName|useCurrentOrganization/);
  assert.match(header, /min-w-0[\s\S]*<AssignmentAvailabilityControl \/>/);
  assert.match(header, /<NotificationCenter \/>/);
  assert.match(header, /to="\/conversations\/new"/);
  assert.doesNotMatch(
    read("../src/global.css"),
    /\.assignment-availability-label\s*\{\s*display: none/,
  );
  const control = read("../src/components/AssignmentAvailabilityControl.tsx");
  assert.match(control, /role="alert"/);
  assert.match(control, /presence.refetch\(\)/);
  assert.match(control, /update.mutate\(update.variables\)/);
});

void test("all availability labels and errors are translated in every supported locale", () => {
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const dictionary = JSON.parse(
      read(`../public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of [
      "Disponible",
      "Ausente",
      "Disponibilidad para conversaciones",
      "No se pudo actualizar la disponibilidad.",
      "Estado no disponible",
      "Cargando...",
      "Reintentar",
    ]) {
      assert.equal(typeof dictionary[key], "string", `${locale}: ${key}`);
    }
  }
});
