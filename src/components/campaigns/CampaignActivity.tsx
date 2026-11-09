import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCampaignActivity } from "@/queries/useCampaignActivity";
import DataTablePagination from "@/components/DataTablePagination";
import CampaignLogExport from "./CampaignLogExport";
import {
  activityLabels,
  activityReasons,
  safeActivityCode,
} from "@/utils/CampaignActivityUtils";

export default function CampaignActivity({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const { translate: t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { summary, activity } = useCampaignActivity(campaignId, page, pageSize);
  const counts = [
    ["sent", "Enviados"],
    ["delivered", "Entregados (incluye leídos)"],
    ["read", "Leídos"],
    ["delivery_failed", "Errores de entrega"],
  ] as const;
  return (
    <section
      className="campaign-review-card min-w-0"
      aria-label={t("Actividad de la campaña")}
    >
      <h2 className="font-medium">{t("Entrega y actividad")}</h2>
      <p className="text-xs text-muted-foreground mt-2">
        {t(
          "Finalizar los envíos no significa que todos fueron entregados o leídos. Sin confirmación de lectura no implica un error.",
        )}
      </p>
      {summary.isPending ? (
        <p role="status" className="mt-3">
          {t("Cargando…")}
        </p>
      ) : summary.isError ? (
        <p role="alert" className="mt-3">
          {t("No se pudo cargar el seguimiento.")}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void summary.refetch()}
          >
            {t("Reintentar")}
          </button>
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 my-4">
          {counts.map(([key, label]) => (
            <div key={key} className="rounded-lg bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">{t(label)}</dt>
              <dd className="text-xl font-semibold">
                {summary.data[key].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4">
        <h3 className="font-medium">{t("Actividad")}</h3>
        <CampaignLogExport campaignId={campaignId} status={status} />
      </div>
      {activity.isPending ? (
        <p role="status" className="py-3">
          {t("Cargando…")}
        </p>
      ) : activity.isError ? (
        <p role="alert" className="py-3">
          {t("No se pudo cargar la actividad.")}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void activity.refetch()}
          >
            {t("Reintentar")}
          </button>
        </p>
      ) : activity.data.rows.length === 0 ? (
        <p className="py-3 text-muted-foreground">
          {t("Todavía no hay actividad registrada.")}
        </p>
      ) : (
        <ol className="divide-y divide-border" aria-busy={activity.isFetching}>
          {activity.data.rows.map((event) => (
            <li key={event.id} className="py-3 text-xs break-words">
              <div className="font-medium">
                {t(activityLabels[event.event_type] ?? "Evento de campaña")}
              </div>
              <time dateTime={event.recorded_at}>
                {new Date(event.recorded_at).toLocaleString()}
              </time>
              {event.actor_name && (
                <div className="text-muted-foreground">
                  {t("Responsable")}: {event.actor_name}
                </div>
              )}
              {event.provider_at && event.provider_at !== event.recorded_at && (
                <div className="text-muted-foreground">
                  {t("Hora del proveedor")}:{" "}
                  <time dateTime={event.provider_at}>
                    {new Date(event.provider_at).toLocaleString()}
                  </time>
                </div>
              )}
              {event.delivery_id && (
                <div className="text-muted-foreground break-all">
                  {t("Referencia")}: {event.delivery_id}
                  {event.attempt_no
                    ? ` · ${t("Intento")} ${event.attempt_no}`
                    : ""}
                </div>
              )}
              {event.job_id && (
                <div className="text-muted-foreground break-all">
                  {t("Trabajo")}: {event.job_id}
                </div>
              )}
              {safeActivityCode(event.reason_code) && (
                <div className="text-muted-foreground">
                  {activityReasons[event.reason_code!]
                    ? t(activityReasons[event.reason_code!])
                    : `${t("Código")}: ${event.reason_code}`}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {!activity.isError && !activity.isPending && (
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={activity.data.total}
          disabled={activity.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}
