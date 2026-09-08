export type PlatformReportType = "conversations" | "campaigns";

export function getUtcMonth(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousUtcMonth(date = new Date()): string {
  return getUtcMonth(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
  );
}

export function buildPlatformReportRequest(
  organizationId: string,
  reportType: PlatformReportType,
  month: string,
) {
  return {
    organization_id: organizationId,
    report_type: reportType,
    month,
    request_id: crypto.randomUUID(),
  } as const;
}

export function getFilenameFromContentDisposition(
  contentDisposition: string | null,
  fallback: string,
): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);
  return match?.[1] || fallback;
}
