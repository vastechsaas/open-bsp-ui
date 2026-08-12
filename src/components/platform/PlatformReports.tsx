import { message } from "antd";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Megaphone,
  MessageSquareText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  downloadPlatformReport,
  savePlatformReport,
} from "@/queries/usePlatformReports";
import { usePlatformTenantSummary } from "@/queries/usePlatformAdmin";
import {
  getPreviousUtcMonth,
  getUtcMonth,
  type PlatformReportType,
} from "@/utils/PlatformReportUtils";

type PlatformReportsProps = {
  organizationId: string;
};

type DownloadResult = {
  reportType: PlatformReportType;
  rowCount: number;
};

const REPORTS: Array<{
  type: PlatformReportType;
  icon: typeof MessageSquareText;
  title: string;
  description: string;
}> = [
  {
    type: "conversations",
    icon: MessageSquareText,
    title: "Conversaciones",
    description:
      "Una fila por conversación con actividad externa durante el mes.",
  },
  {
    type: "campaigns",
    icon: Megaphone,
    title: "Campañas",
    description: "Una fila por campaña lanzada durante el mes.",
  },
];

export default function PlatformReports({
  organizationId,
}: PlatformReportsProps) {
  const { translate: t } = useTranslation();
  const tenant = usePlatformTenantSummary(organizationId);
  const [month, setMonth] = useState(() => getPreviousUtcMonth());
  const [downloading, setDownloading] = useState<PlatformReportType | null>(
    null,
  );
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeDownload = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => activeDownload.current?.abort();
  }, [organizationId]);

  const download = async (reportType: PlatformReportType) => {
    activeDownload.current?.abort();
    const controller = new AbortController();
    activeDownload.current = controller;
    setDownloading(reportType);
    setError(null);
    setResult(null);

    try {
      const report = await downloadPlatformReport({
        organizationId,
        reportType,
        month,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      savePlatformReport(report.blob, report.filename);
      setResult({ reportType, rowCount: report.rowCount });
      void message.success(t("Reporte CSV descargado"));
    } catch (downloadError) {
      if (controller.signal.aborted) return;
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : t("No se pudo generar el reporte"),
      );
    } finally {
      if (activeDownload.current === controller) {
        activeDownload.current = null;
        setDownloading(null);
      }
    }
  };

  if (tenant.isPending) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <Spinner size={30} className="text-primary" />
      </div>
    );
  }

  if (tenant.isError || !tenant.data) {
    return (
      <div className="flex min-h-[520px] items-center justify-center p-6 text-center text-destructive">
        {t("No se pudo cargar el resumen del tenant.")}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 p-5 sm:p-6">
      <header>
        <div>
          <h2 className="text-xl font-semibold">{t("Reportes mensuales")}</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {tenant.data.organization_name}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label
            htmlFor="platform-report-month"
            className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground"
          >
            <CalendarDays className="h-4 w-4" />
            {t("Mes del reporte (UTC)")}
          </label>
          <input
            id="platform-report-month"
            type="month"
            value={month}
            max={getUtcMonth()}
            onChange={(event) => {
              setMonth(event.target.value);
              setResult(null);
              setError(null);
            }}
            className="mt-2 h-10 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground"
          />
        </div>
        <div className="flex max-w-[620px] items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[12px] text-muted-foreground">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            {t(
              "Los reportes se recalculan con datos actuales. El estado y la asignación reflejan el momento de la descarga.",
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.type;
          const rowCount =
            result?.reportType === report.type ? result.rowCount : null;

          return (
            <article
              key={report.type}
              className="flex min-h-[240px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-[18px] font-semibold">
                {t(report.title)}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t(report.description)}
              </p>
              <div className="mt-auto pt-6">
                {rowCount !== null && (
                  <p className="mb-3 text-[12px] text-muted-foreground">
                    {rowCount === 0
                      ? t("El CSV no contiene filas para este mes.")
                      : `${rowCount.toLocaleString()} ${t("filas exportadas")}`}
                  </p>
                )}
                <button
                  type="button"
                  disabled={!month || downloading !== null}
                  onClick={() => void download(report.type)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isDownloading ? (
                    <Spinner size={16} className="text-primary-foreground" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? t("Generando CSV...") : t("Descargar CSV")}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive">
          {t("No se pudo generar el reporte")}: {error}
        </div>
      )}
    </div>
  );
}
