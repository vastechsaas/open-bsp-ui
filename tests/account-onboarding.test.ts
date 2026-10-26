import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  accountSetupError,
  accountSetupLabel,
  readSetupLink,
} from "../src/utils/AccountOnboardingUtils";
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
void test("safe error mapping never exposes raw upstream Auth details", () => {
  assert.equal(
    accountSetupError("ONBOARDING_EMAIL_IN_USE"),
    "El correo electrónico ya está en uso.",
  );
  assert.equal(
    accountSetupError("password=super-secret-token"),
    accountSetupError("unknown"),
  );
  for (const code of [
    "WEAK_PASSWORD",
    "SMTP_FAILED",
    "DELIVERY_UNKNOWN",
    "ONBOARDING_BUSY",
    "ONBOARDING_LINK_INVALID",
    "ONBOARDING_RESEND_RATE_LIMIT",
  ])
    assert.notEqual(accountSetupError(code), accountSetupError("unknown"));
});
void test("delivery acceptance is separate from membership and completed account status", () => {
  const base = {
    operation_id: "op",
    member_id: "member",
    mode: "invitation",
    status: "account_created",
    failure_code: null,
    invitation_sent_at: null,
  };
  assert.equal(accountSetupLabel(base), "Configuración en curso");
  assert.equal(
    accountSetupLabel({ ...base, invitation_sent_at: "date" }),
    "Invitación enviada",
  );
  assert.equal(
    accountSetupLabel({ ...base, failure_code: "SMTP_FAILED" }),
    "La configuración requiere atención",
  );
  assert.equal(
    accountSetupLabel({ ...base, status: "completed" }),
    "Acceso configurado",
  );
});
void test("setup links persist per tab across refresh, not in the global app store", () => {
  const values = new Map<string, string>();
  const storage: Storage = {
    length: 0,
    clear: () => values.clear(),
    key: () => null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const first = readSetupLink(
    new URL(
      "https://staging.test/onboard/set-password?operation_id=op&context=secret&token_hash=native&type=invite",
    ),
    storage,
  );
  assert.deepEqual(
    readSetupLink(
      new URL("https://staging.test/onboard/set-password"),
      storage,
    ),
    first,
  );
  assert.equal(first?.token_hash, "native");
  assert.equal(values.size, 1);
});
void test("pending mode is retained but hidden; invitation default and direct confirmation remain", () => {
  const fields = read("../src/components/platform/AccountSetupFields.tsx");
  for (const mode of ["invitation", "direct", "pending"])
    assert.ok(fields.includes(`value="${mode}"`));
  assert.match(fields, /<option value="pending" hidden disabled>/);
  assert.ok(fields.includes('initialMode: AccountSetupMode = "invitation"'));
  assert.ok(fields.includes("useState<AccountSetupMode>(initialMode)"));
  assert.ok(fields.includes('autoComplete="new-password"'));
  assert.ok(fields.includes("fields.confirmed"));
  const members = read(
    "../src/components/platform/PlatformOrganizationAgents.tsx",
  );
  assert.ok(members.includes("expected_updated_at: agent.updated_at"));
  assert.ok(members.includes("delivery_request_id: deliveryId"));
});
void test("recipient setup isolates auth and explicitly verifies native tokens", () => {
  const route = read("../src/routes/onboard/set-password.tsx");
  assert.match(route, /storage: sessionStorage/);
  assert.match(route, /detectSessionInUrl: false/);
  assert.match(route, /verifyOtp/);
  assert.match(route, /history.replaceState/);
  assert.match(route, /existing.user.id !== preview.user_id/);
  assert.doesNotMatch(route, /auth.updateUser/);
  assert.match(route, /active.access_token/);
  assert.match(
    read("../src/supabase/client.ts"),
    /detectSessionInUrl:[\s\S]*!window.location.pathname.startsWith\("\/onboard\/set-password"\)/,
  );
  const request = read("../src/queries/useAccountOnboarding.ts");
  assert.match(request, /runRef.current = null/);
  assert.doesNotMatch(request, /JSON.stringify\(password/);
});
void test("new invitation controls and diagnostics are translated in every supported locale", () => {
  for (const locale of ["en", "fr", "pt", "sw"]) {
    const translations = JSON.parse(
      read(`../public/locales/${locale}.json`),
    ) as Record<string, string>;
    for (const key of [
      "Configurar acceso",
      "Enviar invitación por correo",
      "Crear con correo y contraseña",
      "Establecer contraseña y unirme",
      "El correo electrónico ya está en uso.",
      "La configuración requiere atención",
    ])
      assert.ok(translations[key], `${locale}: ${key}`);
  }
});
