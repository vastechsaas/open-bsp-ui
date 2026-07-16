import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import CampaignFilterSelect from "@/components/campaigns/CampaignFilterSelect";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type CampaignAudienceType,
  type CampaignRow,
  useCampaignAudienceCounts,
  useCampaigns,
} from "@/queries/useCampaigns";
import type { Json, TemplateData } from "@/supabase/client";
import {
  type CampaignReadiness,
  getCampaignReadiness,
} from "@/utils/CampaignUtils";
import { formatPhoneNumber } from "@/utils/FormatUtils";

export const Route = createFileRoute("/_auth/campaigns/")({
  component: CampaignList,
});

type ReadinessFilter = "all" | "ready" | "needs_attention";
type AudienceFilter = "all" | CampaignAudienceType;
type CampaignListItem = CampaignRow & {
  audienceCount: number | null | undefined;
  readiness: CampaignReadiness;
  templateData: TemplateData;
};

const PAGE_SIZE = 10;

function toRecord(value: Json): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value;
}

function CampaignList() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const countQueries = useCampaignAudienceCounts(
    campaigns?.map((campaign) => campaign.id) || [],
  );
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [readinessFilter, setReadinessFilter] =
    useState<ReadinessFilter>("all");
  const [page, setPage] = useState(1);

  const audienceLabels: Record<CampaignAudienceType, string> = {
    all_contacts: t("Todos los contactos"),
    active_24h: t("Activos en las últimas 24 horas"),
    csv_upload: t("Archivo CSV"),
  };

  const items = useMemo<CampaignListItem[]>(
    () =>
      (campaigns || []).map((campaign, index) => {
        const countQuery = countQueries[index];
        const templateData = campaign.template as unknown as TemplateData;
        return {
          ...campaign,
          templateData,
          audienceCount: countQuery?.data,
          readiness: getCampaignReadiness({
            template: templateData,
            mapping: toRecord(campaign.template_variable_mapping),
            audienceCount: countQuery?.data,
            audienceUnavailable: countQuery?.isError,
          }),
        };
      }),
    [campaigns, countQueries],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return items.filter((campaign) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          campaign.name,
          campaign.organization_address,
          campaign.templateData.name,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      const matchesAudience =
        audienceFilter === "all" || campaign.audience_type === audienceFilter;
      const matchesReadiness =
        readinessFilter === "all" || campaign.readiness === readinessFilter;
      return matchesSearch && matchesAudience && matchesReadiness;
    });
  }, [audienceFilter, items, readinessFilter, search]);

  useEffect(() => setPage(1), [search, audienceFilter, readinessFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="h-full min-w-0 overflow-y-auto bg-background text-foreground p-[16px] md:p-[28px]">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-[16px] mb-[22px]">
          <div>
            <h1 className="text-[24px] font-semibold">
              {t("Gestor de campañas")}
            </h1>
            <p className="mt-[4px] text-[13px] text-muted-foreground">
              {t("Creá, revisá y prepará campañas de WhatsApp.")}
            </p>
          </div>
          <button
            className="primary sm:ml-auto px-[18px] py-[10px] flex items-center justify-center gap-[8px]"
            onClick={() => void navigate({ to: "/campaigns/new" })}
          >
            <Plus className="w-[17px] h-[17px]" />
            {t("Crear campaña")}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="p-[14px] border-b border-border flex flex-col lg:flex-row gap-[10px]">
            <label className="flex items-center gap-[9px] rounded-lg border border-input px-[12px] h-[40px] lg:max-w-[360px] lg:flex-1">
              <Search className="w-[16px] h-[16px] text-muted-foreground" />
              <input
                className="bg-transparent border-none outline-none w-full text-[14px] text-foreground placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar campañas")}
              />
            </label>
            <CampaignFilterSelect
              ariaLabel={t("Todas las audiencias")}
              className="lg:w-[220px]"
              value={audienceFilter}
              onChange={setAudienceFilter}
              options={[
                { value: "all", label: t("Todas las audiencias") },
                ...Object.entries(audienceLabels).map(([value, label]) => ({
                  value: value as CampaignAudienceType,
                  label,
                })),
              ]}
            />
            <CampaignFilterSelect
              ariaLabel={t("Todos los estados")}
              className="lg:w-[200px]"
              value={readinessFilter}
              onChange={setReadinessFilter}
              options={[
                { value: "all", label: t("Todos los estados") },
                { value: "ready", label: t("Listas para revisar") },
                {
                  value: "needs_attention",
                  label: t("Requieren atención"),
                },
              ]}
            />
          </div>

          {isLoading ? (
            <div className="h-[260px] flex items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <EmptyState
              title={t("No se pudieron cargar las campañas")}
              description={t("Intentá nuevamente en unos minutos.")}
            />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              title={
                campaigns?.length
                  ? t("No hay campañas que coincidan con los filtros")
                  : t("Todavía no hay campañas")
              }
              description={
                campaigns?.length
                  ? t("Probá cambiando la búsqueda o los filtros.")
                  : t("Creá tu primera campaña para comenzar.")
              }
            />
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-[16px] py-[12px]">{t("Campaña")}</th>
                      <th className="px-[16px] py-[12px]">{t("Cuenta")}</th>
                      <th className="px-[16px] py-[12px]">{t("Plantilla")}</th>
                      <th className="px-[16px] py-[12px]">{t("Audiencia")}</th>
                      <th className="px-[16px] py-[12px]">
                        {t("Destinatarios")}
                      </th>
                      <th className="px-[16px] py-[12px]">
                        {t("Actualizada")}
                      </th>
                      <th className="px-[16px] py-[12px]">{t("Estado")}</th>
                      <th className="px-[16px] py-[12px] text-right">
                        {t("Acciones")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((campaign) => (
                      <CampaignTableRow
                        key={campaign.id}
                        campaign={campaign}
                        audienceLabel={audienceLabels[campaign.audience_type]}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-border">
                {visibleItems.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    audienceLabel={audienceLabels[campaign.audience_type]}
                  />
                ))}
              </div>
            </>
          )}

          <div className="border-t border-border px-[14px] py-[12px] flex items-center justify-between text-[12px] text-muted-foreground">
            <span>
              {filteredItems.length} {t("campañas")}
            </span>
            <div className="flex items-center gap-[8px]">
              <button
                className="p-[7px] border border-border rounded-lg disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="w-[15px] h-[15px]" />
              </button>
              <span className="px-[7px] text-foreground">
                {currentPage} / {pageCount}
              </span>
              <button
                className="p-[7px] border border-border rounded-lg disabled:opacity-40"
                disabled={currentPage >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                <ChevronRight className="w-[15px] h-[15px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignTableRow({
  campaign,
  audienceLabel,
}: {
  campaign: CampaignListItem;
  audienceLabel: string;
}) {
  const { translate: t } = useTranslation();
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-[16px] py-[14px]">
        <div className="font-medium text-[13px]">{campaign.name}</div>
        <div className="text-[11px] text-muted-foreground mt-[2px]">
          {campaign.status === "draft"
            ? t("Borrador")
            : getCampaignStatusLabel(campaign.status, t)}
        </div>
      </td>
      <td className="px-[16px] py-[14px] text-[12px]">
        {formatPhoneNumber(campaign.organization_address)}
      </td>
      <td className="px-[16px] py-[14px] text-[12px]">
        <div>{campaign.templateData.name}</div>
        <div className="text-muted-foreground">
          {campaign.templateData.language}
        </div>
      </td>
      <td className="px-[16px] py-[14px] text-[12px]">{audienceLabel}</td>
      <td className="px-[16px] py-[14px] text-[12px] font-medium">
        {campaign.audienceCount === undefined
          ? "—"
          : campaign.audienceCount?.toLocaleString() || "0"}
      </td>
      <td className="px-[16px] py-[14px] text-[12px] text-muted-foreground">
        {formatUpdatedAt(campaign.updated_at)}
      </td>
      <td className="px-[16px] py-[14px]">
        {campaign.status === "draft" ? (
          <ReadinessBadge readiness={campaign.readiness} />
        ) : (
          <CampaignStatusBadge status={campaign.status} />
        )}
      </td>
      <td className="px-[16px] py-[14px]">
        <CampaignActions campaign={campaign} />
      </td>
    </tr>
  );
}

function CampaignCard({
  campaign,
  audienceLabel,
}: {
  campaign: CampaignListItem;
  audienceLabel: string;
}) {
  const { translate: t } = useTranslation();
  return (
    <article className="p-[16px]">
      <div className="flex items-start gap-[12px]">
        <div className="p-[9px] rounded-full bg-primary/10">
          <Megaphone className="w-[18px] h-[18px] text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{campaign.name}</div>
          <div className="text-[12px] text-muted-foreground mt-[3px]">
            {campaign.templateData.name} · {audienceLabel}
          </div>
        </div>
        {campaign.status === "draft" ? (
          <ReadinessBadge readiness={campaign.readiness} />
        ) : (
          <CampaignStatusBadge status={campaign.status} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-[12px] mt-[16px] text-[12px]">
        <div>
          <div className="text-muted-foreground">{t("Destinatarios")}</div>
          <div className="mt-[3px]">
            {campaign.audienceCount === undefined
              ? "—"
              : campaign.audienceCount?.toLocaleString() || "0"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">{t("Actualizada")}</div>
          <div className="mt-[3px]">{formatUpdatedAt(campaign.updated_at)}</div>
        </div>
      </div>
      <div className="mt-[16px]">
        <CampaignActions campaign={campaign} />
      </div>
    </article>
  );
}

function CampaignActions({ campaign }: { campaign: CampaignListItem }) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const edit = () =>
    void navigate({
      to: "/campaigns/$campaignId",
      params: { campaignId: campaign.id },
    });

  if (campaign.status !== "draft") {
    return (
      <div className="flex justify-end">
        <button
          className="primary px-[12px] py-[8px] text-[12px]"
          onClick={() =>
            void navigate({
              to: "/campaigns/$campaignId/review",
              params: { campaignId: campaign.id },
            })
          }
        >
          {t("Ver ejecución")}
        </button>
      </div>
    );
  }

  if (campaign.readiness !== "ready") {
    return (
      <div className="flex justify-end">
        <button
          className="primary px-[12px] py-[8px] text-[12px]"
          onClick={edit}
        >
          {t("Continuar configuración")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-[8px]">
      <button
        className="px-[10px] py-[7px] border border-border rounded-lg text-[12px] flex items-center gap-[6px] hover:bg-muted"
        onClick={edit}
      >
        <Pencil className="w-[13px] h-[13px]" />
        {t("Editar")}
      </button>
      <button
        className="primary px-[12px] py-[8px] text-[12px]"
        onClick={() =>
          void navigate({
            to: "/campaigns/$campaignId/review",
            params: { campaignId: campaign.id },
          })
        }
      >
        {t("Revisar y ejecutar")}
      </button>
    </div>
  );
}

function getCampaignStatusLabel(status: string, t: (value: string) => string) {
  const labels: Record<string, string> = {
    queued: t("En cola"),
    running: t("En ejecución"),
    completed: t("Completada"),
    failed: t("Fallida"),
  };
  return labels[status] || status;
}

function CampaignStatusBadge({ status }: { status: string }) {
  const { translate: t } = useTranslation();
  const styles: Record<string, string> = {
    queued: "bg-primary/15 text-primary",
    running: "bg-primary/15 text-primary",
    completed: "bg-green-500/15 text-green-500",
    failed: "bg-destructive/15 text-destructive",
  };

  return (
    <span
      className={`inline-flex px-[9px] py-[4px] rounded-full text-[11px] whitespace-nowrap ${styles[status] || "bg-muted text-muted-foreground"}`}
    >
      {getCampaignStatusLabel(status, t)}
    </span>
  );
}

function ReadinessBadge({ readiness }: { readiness: CampaignReadiness }) {
  const { translate: t } = useTranslation();
  const styles: Record<CampaignReadiness, string> = {
    loading: "bg-muted text-muted-foreground",
    ready: "bg-green-500/15 text-green-500",
    needs_attention: "bg-amber-500/15 text-amber-500",
    unavailable: "bg-destructive/15 text-destructive",
  };
  const labels: Record<CampaignReadiness, string> = {
    loading: t("Validando"),
    ready: t("Lista"),
    needs_attention: t("Requiere atención"),
    unavailable: t("No disponible"),
  };
  return (
    <span
      className={`inline-flex px-[9px] py-[4px] rounded-full text-[11px] whitespace-nowrap ${styles[readiness]}`}
    >
      {labels[readiness]}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center text-center px-[20px]">
      <div className="p-[12px] rounded-full bg-muted mb-[12px]">
        <Megaphone className="w-[24px] h-[24px] text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      <div className="text-[13px] text-muted-foreground mt-[5px]">
        {description}
      </div>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
