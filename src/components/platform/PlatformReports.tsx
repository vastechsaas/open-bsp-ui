import { message } from "antd";
import { CalendarDays, Clock3, Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformTenantSummary } from "@/queries/usePlatformAdmin";
import {
  downloadPlatformReport,
  savePlatformReport,
} from "@/queries/usePlatformReports";
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
  title: string;
  includedData: string;
}> = [
  {
    type: "conversations",
    title: "Conversaciones",
    includedData: "Actividad externa de conversaciones y totales de mensajes",
  },
  {
    type: "campaigns",
    title: "Campañas",
    includedData:
      "Campañas lanzadas durante el mes seleccionado y totales de entrega",
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
    <div className="w-full p-4 sm:p-6 lg:p-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Reportes mensuales")}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("Generá exportaciones operativas específicas del tenant.")}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-[12px] text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          {t("UTC · Datos actuales")}
        </span>
      </header>

      <section className="flex flex-col gap-5 border-b border-border py-5 lg:flex-row lg:items-end">
        <div className="shrink-0">
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
        <p className="pb-2 text-[12px] text-muted-foreground lg:ml-8">
          {t(
            "Los reportes se recalculan con datos actuales al momento de la descarga.",
          )}
        </p>
      </section>

      <section className="pt-7">
        <h2 className="text-xl font-semibold">{t("Reportes disponibles")}</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-3 font-medium">{t("Reporte")}</th>
                <th className="px-2 py-3 font-medium">
                  {t("Datos incluidos")}
                </th>
                <th className="px-2 py-3 font-medium">{t("Formato")}</th>
                <th className="px-2 py-3 font-medium">
                  {t("Fuente de datos")}
                </th>
                <th className="px-2 py-3 text-right font-medium">
                  {t("Acción")}
                </th>
              </tr>
            </thead>
            <tbody>
              {REPORTS.map((report) => {
                const isDownloading = downloading === report.type;
                const rowCount =
                  result?.reportType === report.type ? result.rowCount : null;

                return (
                  <tr key={report.type} className="border-b border-border/70">
                    <td className="px-2 py-5">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-[14px] font-medium">
                          {t(report.title)}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[520px] px-2 py-5 text-[13px] text-muted-foreground">
                      {t(report.includedData)}
                    </td>
                    <td className="px-2 py-5 text-[13px]">CSV</td>
                    <td className="px-2 py-5">
                      <span className="text-[13px] text-muted-foreground">
                        {t("Datos actuales")}
                      </span>
                      {rowCount !== null && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {rowCount === 0
                            ? t("El CSV no contiene filas para este mes.")
                            : `${rowCount.toLocaleString()} ${t("filas exportadas")}`}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-5 text-right">
                      <button
                        type="button"
                        disabled={!month || downloading !== null}
                        onClick={() => void download(report.type)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-[13px] font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Spinner size={16} className="text-primary" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {isDownloading
                          ? t("Generando CSV...")
                          : t("Descargar CSV")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[12px] text-muted-foreground">
          {t("Cada descarga se genera para")} {tenant.data.organization_name}{" "}
          {t("y el mes UTC seleccionado.")}
        </p>
      </section>

      {error && (
        <div className="mt-5 border-l-2 border-destructive bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {t("No se pudo generar el reporte")}: {error}
        </div>
      )}
    </div>
  );
}
