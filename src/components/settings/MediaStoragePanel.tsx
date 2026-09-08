import { AlertTriangle, Database, FileStack } from "lucide-react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import type { OrganizationMediaStorage } from "@/queries/useMediaStorage";
import {
  formatStorageBytes,
  mediaStorageStatusClasses,
  mediaStorageStatusLabel,
} from "@/utils/MediaStorageUtils";

type StorageData = OrganizationMediaStorage & { organization_name?: string };

export default function MediaStoragePanel({
  data,
  loading,
  error,
  actions,
}: {
  data?: StorageData;
  loading: boolean;
  error: boolean;
  actions?: React.ReactNode;
}) {
  const { translate: t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-destructive">
        {t("No se pudo cargar el uso de almacenamiento.")}
      </div>
    );
  }

  const percent = Math.min(100, Math.max(0, Number(data.usage_percent)));
  const status = String(data.storage_status);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {t("Administración de medios")}
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            {t(
              "Consulta el espacio utilizado por imágenes, audio, video y documentos de WhatsApp.",
            )}
          </p>
        </div>
        {actions}
      </header>

      <section className="py-6" aria-label={t("Uso de almacenamiento")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("Uso de almacenamiento")}
            </p>
            <p className="mt-2 text-[26px] font-semibold tracking-tight">
              {formatStorageBytes(Number(data.used_bytes))}
              <span className="ml-2 text-[15px] font-normal text-muted-foreground">
                {t("de")} {formatStorageBytes(Number(data.quota_bytes))}
              </span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold ${mediaStorageStatusClasses(status)}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {mediaStorageStatusLabel(status, t)}
          </span>
        </div>

        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] ${status === "critical" ? "bg-red-500" : status === "approaching" ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
          <span>{Number(data.usage_percent).toFixed(2)}%</span>
          <span>
            {formatStorageBytes(Number(data.remaining_bytes))}{" "}
            {t("disponibles")}
          </span>
        </div>
      </section>

      <dl className="grid border-y border-border sm:grid-cols-3">
        <Metric
          icon={<Database />}
          label={t("Cuota asignada")}
          value={formatStorageBytes(Number(data.quota_bytes))}
        />
        <Metric
          icon={<FileStack />}
          label={t("Archivos almacenados")}
          value={Number(data.object_count).toLocaleString()}
        />
        <Metric
          icon={<AlertTriangle />}
          label={t("Última reconciliación")}
          value={
            data.last_reconciled_at
              ? new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(data.last_reconciled_at))
              : "—"
          }
        />
      </dl>

      <p className="mt-5 text-[12px] leading-5 text-muted-foreground">
        {t(
          "Las cargas nuevas se bloquean cuando se alcanza la cuota. Los mensajes de texto y los archivos existentes no se eliminan.",
        )}
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 border-b border-border px-1 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
      <span className="mt-0.5 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 text-[14px] font-semibold">{value}</dd>
      </div>
    </div>
  );
}
