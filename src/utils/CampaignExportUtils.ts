export type CampaignExportInfo = {
  id: string;
  state: "queued" | "processing" | "ready" | "failed";
  snapshot_at: string;
  expires_at: string;
  timezone: string;
  row_count: number;
  processed_count: number;
};

export function campaignExportInfo(value: unknown): CampaignExportInfo | null {
  if (value == null) return null;
  const info = value as CampaignExportInfo;
  if (
    !info.id ||
    !["queued", "processing", "ready", "failed"].includes(info.state) ||
    !info.timezone ||
    !Number.isFinite(Date.parse(info.snapshot_at)) ||
    !Number.isFinite(Date.parse(info.expires_at)) ||
    !Number.isSafeInteger(info.row_count) ||
    !Number.isSafeInteger(info.processed_count) ||
    info.row_count < 0 ||
    info.processed_count < 0 ||
    info.processed_count > info.row_count
  ) {
    throw new Error("Invalid export response");
  }
  return info;
}

export function canExportCampaign(
  status: string,
  role?: string | null,
  accepted = true,
) {
  return status === "completed" && role === "owner" && accepted;
}

export function isPreparingExport(info: CampaignExportInfo | null | undefined) {
  return info?.state === "queued" || info?.state === "processing";
}
