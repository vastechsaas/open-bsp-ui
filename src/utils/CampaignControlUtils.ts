export type CampaignControlState = {
  status: string;
  dispatch_transport?: string;
  paused_at?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  queued_count: number;
  processing_count: number;
  sending_state?: unknown;
};

export function canControlCampaign(c: CampaignControlState, now = Date.now()) {
  return (
    c.dispatch_transport === "cloudamqp" &&
    ["queued", "running", "needs_review"].includes(c.status) &&
    !c.cancelled_at &&
    (!c.expires_at || Date.parse(c.expires_at) > now) &&
    c.queued_count + c.processing_count > 0
  );
}

export function isCampaignManuallyPaused(c: CampaignControlState) {
  const sending = c.sending_state as { paused_at?: string } | null | undefined;
  // List rows already enforce transport and lifecycle validity in their state.
  return (
    ["queued", "running", "needs_review"].includes(c.status) &&
    !c.cancelled_at &&
    (!c.expires_at || Date.parse(c.expires_at) > Date.now()) &&
    c.queued_count + c.processing_count > 0 &&
    !!(c.paused_at ?? sending?.paused_at)
  );
}
