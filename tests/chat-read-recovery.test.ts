import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import {
  recoverRead,
  retryTransientRead,
  messageSenderLabel,
} from "../src/utils/ReadRecoveryUtils.ts";
import { canAccessNavigation } from "../src/utils/RoleAccess.ts";

void test("dashboard eligibility matches backend roles and denies unresolved identity", () => {
  for (const role of ["owner", "admin", "supervisor", "member"] as const)
    assert.equal(canAccessNavigation(role, "dashboard"), true);
  assert.equal(canAccessNavigation("agent", "dashboard"), false);
  assert.equal(canAccessNavigation(undefined, "dashboard"), false);
});

void test("transient reads retry independently, with a bounded delay", async () => {
  const waits: number[] = [];
  let calls = 0;
  const result = await recoverRead(
    () => {
      if (++calls < 3) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve("closed");
    },
    new AbortController().signal,
    (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  );
  assert.equal(result, "closed");
  assert.equal(calls, 3);
  assert.deepEqual(waits, [500, 1500]);
});

void test("read exhaustion never retries indefinitely", async () => {
  let calls = 0;
  await assert.rejects(
    recoverRead(
      () => {
        calls++;
        return Promise.reject(
          Object.assign(new Error("unavailable"), { status: 503 }),
        );
      },
      new AbortController().signal,
      () => Promise.resolve(),
    ),
  );
  assert.equal(calls, 3);
});

void test("authorization, singular row and cancellation failures are not retried", () => {
  for (const error of [
    { status: 401 },
    { status: 403 },
    { code: "42501" },
    { code: "PGRST116" },
    { name: "AbortError" },
  ]) {
    assert.equal(retryTransientRead(0, error), false);
  }
  assert.equal(retryTransientRead(0, { status: 429 }), true);
  assert.equal(retryTransientRead(0, { status: 502 }), true);
  assert.equal(retryTransientRead(2, new TypeError()), false);
});

void test("scope cancellation prevents old account/organization reads from returning", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    recoverRead(
      () => {
        calls++;
        return Promise.reject(new TypeError("network"));
      },
      controller.signal,
      () => {
        controller.abort();
        return Promise.resolve();
      },
    ),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);

  const second = new AbortController();
  await assert.rejects(
    recoverRead(() => {
      second.abort();
      return Promise.resolve("old-scope-result");
    }, second.signal),
    { name: "AbortError" },
  );
});

void test("hidden/deleted sender has a neutral translated label, not a guessed identity", () => {
  assert.equal(messageSenderLabel(null, "Agent"), "Agent");
  assert.equal(messageSenderLabel(undefined, "Agente"), "Agente");
  assert.equal(messageSenderLabel({ name: " " }, "Agent"), "Agent");
  assert.equal(messageSenderLabel({ name: " Arslan " }, "Agent"), "Arslan");
});

void test("failed follow-up reads cannot reject a successful close or replay its POST", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let posts = 0;
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => {
      posts++;
      return Promise.resolve({ status: "succeeded" });
    },
    onSettled: async () => {
      await Promise.allSettled([
        client.fetchQuery({
          queryKey: ["lifecycle"],
          queryFn: () => Promise.reject(new TypeError("network")),
        }),
        client.fetchQuery({
          queryKey: ["notifications"],
          queryFn: () => Promise.reject(new TypeError("network")),
        }),
      ]);
    },
  });
  assert.deepEqual(await mutation.execute(undefined), { status: "succeeded" });
  assert.equal(mutation.state.status, "success");
  assert.equal(posts, 1);
  client.clear();
});

void test("production wiring keeps presentation and read recovery separate from actions", () => {
  const source = (path: string) =>
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
  const sender = source("queries/useAgents.ts").split(
    "export function useAgent<",
  )[0];
  assert.match(sender, /select\("id,name,picture"\)/);
  assert.match(sender, /eq\("organization_id", orgId!\)/);
  assert.match(sender, /maybeSingle\(\)/);
  assert.doesNotMatch(sender, /\.single\(\)/);
  assert.match(sender, /"message-sender", userId, id/);
  const dashboard = source("queries/useDashboard.ts");
  assert.match(dashboard, /currentAgent\.isSuccess && allowed/);
  const lifecycle = source("queries/useChatbotFlows.ts");
  assert.match(lifecycle, /await Promise\.allSettled\(/);
  assert.match(lifecycle, /confirmed\.state === "closed"/);
  const controls = source("components/ResumeChatbotButton.tsx");
  assert.match(
    controls,
    /if \(lifecycle\.status\.isError\) \{\s*void lifecycle\.status\.refetch\(\);\s*return;/,
  );
  const realtime = source("hooks/useRealtimeSubscription.ts");
  assert.match(realtime, /recoveryController\.abort\(\)/);
  assert.match(realtime, /recoverRead\(/);
});

void test("refresh warning is translated in every supported non-source language", () => {
  const key =
    "No se pudo actualizar el estado del chat. La acción puede haberse completado; actualizá antes de reintentar.";
  for (const locale of ["en", "pt", "fr", "sw"]) {
    const labels = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    assert.ok(labels[key], locale);
  }
});
