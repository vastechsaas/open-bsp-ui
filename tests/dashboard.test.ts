import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isDashboardWorkspacePath,
  parseContactActivity,
  parseMessageActivity,
  parseTeamSnapshot,
} from "../src/utils/DashboardUtils.ts";

void test("dashboard is an exact full-width workspace route", () => {
  assert.equal(isDashboardWorkspacePath("/dashboard"), true);
  assert.equal(isDashboardWorkspacePath("/dashboard/"), true);
  assert.equal(isDashboardWorkspacePath("/stats/quotas"), false);
  assert.equal(isDashboardWorkspacePath("/dashboard/report"), false);
});

void test("dashboard metrics JSON is normalized defensively", () => {
  assert.deepEqual(
    parseContactActivity([
      { date: "2026-07-18", active_contacts: 4, new_contacts: 2 },
      { date: 19, active_contacts: "bad", new_contacts: null },
    ]),
    [
      { date: "2026-07-18", active_contacts: 4, new_contacts: 2 },
      { date: "", active_contacts: 0, new_contacts: 0 },
    ],
  );
  assert.deepEqual(
    parseMessageActivity([{ date: "2026-07-18", sent: 8, received: 5 }]),
    [{ date: "2026-07-18", sent: 8, received: 5 }],
  );
  assert.deepEqual(
    parseTeamSnapshot([
      {
        id: "member-1",
        name: "Member",
        picture: null,
        assigned: 3,
        open: 2,
        closed: 1,
      },
    ]),
    [
      {
        id: "member-1",
        name: "Member",
        picture: null,
        assigned: 3,
        open: 2,
        closed: 1,
      },
    ],
  );
  assert.deepEqual(parseContactActivity(null), []);
});

void test("sign-in, authenticated home, and organization switch target dashboard", () => {
  const rootRoute = readFileSync(
    new URL("../src/routes/__root.tsx", import.meta.url),
    "utf8",
  );
  const loginRoute = readFileSync(
    new URL("../src/routes/login_.email.tsx", import.meta.url),
    "utf8",
  );
  const menu = readFileSync(
    new URL("../src/components/Menu.tsx", import.meta.url),
    "utf8",
  );

  assert.match(rootRoute, /search\.redirect \|\| "\/dashboard"/);
  assert.match(rootRoute, /isLandingPage[\s\S]*?to: "\/dashboard"/);
  assert.match(loginRoute, /redirect \|\| "\/dashboard"/);
  assert.match(
    menu,
    /setActiveOrg\(organization\.id\);\s*void navigate\(\{ to: "\/dashboard" \}\)/,
  );
});

void test("dashboard and statistics keep separate active states", () => {
  const menu = readFileSync(
    new URL("../src/components/Menu.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    menu,
    /to="\/dashboard"[\s\S]*?isActive=\{pathname === "\/dashboard"\}/,
  );
  assert.match(
    menu,
    /to="\/stats"[\s\S]*?isActive=\{pathname\.startsWith\("\/stats"\)\}/,
  );
});

void test("dashboard labels exist in every supported locale", () => {
  const keys = [
    "Panel",
    "Total de contactos",
    "Activos hoy",
    "Contactos nuevos",
    "Actividad de contactos",
    "Carga de conversaciones",
    "Sin asignar",
    "Actividad de mensajería",
    "Resumen del equipo",
  ];

  for (const language of ["en", "pt", "fr", "sw"]) {
    const translations = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${language}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;

    assert.deepEqual(
      keys.filter((key) => !translations[key]),
      [],
      `${language} is missing dashboard labels`,
    );
  }
});
