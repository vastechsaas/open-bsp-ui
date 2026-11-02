import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canControlCampaign,
  isCampaignManuallyPaused,
} from "../src/utils/CampaignControlUtils.ts";

const campaign = {
  status: "queued",
  dispatch_transport: "cloudamqp",
  queued_count: 4,
  processing_count: 1,
};
const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

void test("controls cover queued/running/uncertain with unfinished work, never terminal/legacy", () => {
  for (const status of ["queued", "running", "needs_review"])
    assert.ok(canControlCampaign({ ...campaign, status }));
  for (const status of ["draft", "completed", "cancelled", "failed", "expired"])
    assert.equal(canControlCampaign({ ...campaign, status }), false);
  assert.equal(
    canControlCampaign({ ...campaign, dispatch_transport: "postgres" }),
    false,
  );
  assert.equal(
    canControlCampaign({ ...campaign, queued_count: 0, processing_count: 0 }),
    false,
  );
  assert.equal(
    canControlCampaign({ ...campaign, cancelled_at: "2026-01-01" }),
    false,
  );
  assert.equal(
    canControlCampaign(
      { ...campaign, expires_at: "2026-01-01" },
      Date.parse("2026-02-01"),
    ),
    false,
  );
});
void test("pause badge derives list state and preserves independent needs-review status", () => {
  assert.equal(isCampaignManuallyPaused(campaign), false);
  assert.ok(isCampaignManuallyPaused({ ...campaign, paused_at: "2026-01-01" }));
  assert.ok(
    isCampaignManuallyPaused({
      ...campaign,
      status: "needs_review",
      sending_state: { paused_at: "2026-01-01" },
    }),
  );
  assert.equal(
    isCampaignManuallyPaused({
      ...campaign,
      status: "completed",
      paused_at: "2026-01-01",
    }),
    false,
  );
  assert.equal(
    isCampaignManuallyPaused({
      ...campaign,
      cancelled_at: "2026-01-01",
      paused_at: "2026-01-01",
    }),
    false,
  );
});
void test("mutations reconcile before retry, keep stable identity and scope stale responses", () => {
  const source = read("src/queries/useCampaignControls.ts");
  assert.match(source, /retry: false/);
  assert.match(source, /p_expected_revision: request.revision/);
  assert.match(source, /p_request_id: request.requestId/);
  assert.match(source, /input.retry && attempt.current/);
  assert.match(source, /current.control_revision !== attempt.current.revision/);
  assert.match(source, /ui.user\?\.id === userId/);
  assert.match(source, /ui.activeOrgId === organizationId/);
  assert.match(source, /AbortSignal.timeout/);
  assert.match(source, /cancelQueries/);
  assert.doesNotMatch(source, /onMutate|paused_at:\s*(?:new Date|Date.now)/);
});
void test("controls keep accessible confirmation, pending/error/retry and separate cancellation", () => {
  const controls = read("src/components/campaigns/CampaignControls.tsx");
  assert.match(controls, /disabled=\{control.isPending\}/);
  assert.match(controls, /<Modal/);
  assert.match(controls, /role="alert"/);
  assert.match(controls, /retryControl/);
  const summary = read("src/components/campaigns/CampaignSendingSummary.tsx");
  assert.match(summary, /justify-between/);
  assert.match(summary, /Pausada por/);
  assert.match(summary, /Cancelar envíos pendientes/);
  assert.match(summary, /key=\{`\$\{userId\}/);
  const list = read("src/routes/_auth/campaigns/index.tsx");
  assert.match(list, /status: readinessFilter === "paused"/);
  assert.match(list, /!paused \|\| status === "needs_review"/);
  assert.match(read("src/queries/useCampaigns.ts"), /p_status: params.status/);
});
void test("pause copy has consistent translations in every supported locale", () => {
  const keys = [
    "Pausar campaña",
    "Reanudar campaña",
    "Confirmando…",
    "¿Pausar esta campaña?",
    "Los mensajes pendientes quedarán en espera. Los mensajes ya en curso pueden llegar. Podés reanudar la campaña más tarde.",
    "Campaña pausada",
    "Campaña reanudada",
    "No se enviarán mensajes nuevos. Los mensajes ya en curso pueden finalizar.",
    "Pausada por",
    "Al reanudar, continuará con los destinatarios pendientes según el horario y los límites.",
    "El estado cambió. Revisá la campaña antes de continuar.",
    "No se pudo confirmar el cambio. Actualizá el estado antes de reintentar.",
    "Pausada",
    "Pausadas",
    "Pausa manual",
    "Responsable",
  ];
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const locale = JSON.parse(read(`public/locales/${lang}.json`)) as Record<
      string,
      string
    >;
    for (const key of keys) assert.ok(locale[key], `${lang}: ${key}`);
  }
});
