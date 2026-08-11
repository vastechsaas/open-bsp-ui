import { supabase } from "@/supabase/client";
import {
  buildPlatformReportRequest,
  getFilenameFromContentDisposition,
  type PlatformReportType,
} from "@/utils/PlatformReportUtils";

type DownloadPlatformReportInput = {
  organizationId: string;
  reportType: PlatformReportType;
  month: string;
  signal: AbortSignal;
};

export async function downloadPlatformReport({
  organizationId,
  reportType,
  month,
  signal,
}: DownloadPlatformReportInput) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Authentication required");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-report-export`,
    {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: String(import.meta.env.VITE_SUPABASE_ANON_KEY),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildPlatformReportRequest(organizationId, reportType, month),
      ),
    },
  );

  if (!response.ok) {
    throw new Error(`Report generation failed (${response.status})`);
  }

  return {
    blob: await response.blob(),
    filename: getFilenameFromContentDisposition(
      response.headers.get("Content-Disposition"),
      `${reportType}-${month}.csv`,
    ),
    rowCount: Number(response.headers.get("X-Report-Row-Count") || 0),
  };
}

export function savePlatformReport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
