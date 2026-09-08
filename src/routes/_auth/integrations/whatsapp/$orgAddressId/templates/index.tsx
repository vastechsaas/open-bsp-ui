import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { message, Modal } from "antd";
import {
  Eye,
  LayoutTemplate,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import CampaignFilterSelect from "@/components/campaigns/CampaignFilterSelect";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import {
  type TemplateListRow,
  useDeleteSubmittedTemplate,
  useDeleteTemplateDraft,
  useSyncTemplates,
  useTemplateRecordsPage,
} from "@/queries/useTemplates";
import {
  clampDataTablePage,
  DEFAULT_DATA_TABLE_PAGE_SIZE,
} from "@/utils/DataTableUtils";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import { getTemplateActions } from "@/utils/TemplateDraftUtils";

export const Route = createFileRoute(
  "/_auth/integrations/whatsapp/$orgAddressId/templates/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/templates",
      search: { account: params.orgAddressId },
    });
  },
});

export function TemplatesIndex({
  initialAccount,
}: {
  initialAccount?: string;
}) {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(initialAccount || "all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: addresses } = useOrganizationsAddresses();
  const syncTemplates = useSyncTemplates();
  const deleteDraft = useDeleteTemplateDraft();
  const deleteSubmitted = useDeleteSubmittedTemplate();
  const whatsappAccounts = useMemo(
    () => addresses?.filter((address) => address.service === "whatsapp") || [],
    [addresses],
  );
  const accountLabels = useMemo(
    () =>
      new Map(
        whatsappAccounts.map((item) => [
          item.address,
          getAccountLabel(item.address, item.extra),
        ]),
      ),
    [whatsappAccounts],
  );
  const { data, isLoading, isError } = useTemplateRecordsPage({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    organizationAddress: account === "all" ? undefined : account,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
  });
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const hasFilters =
    !!search.trim() ||
    account !== "all" ||
    category !== "all" ||
    status !== "all";

  useEffect(() => setPage(1), [search, account, category, status]);

  useEffect(() => {
    if (isLoading) return;
    const correctedPage = clampDataTablePage(page, total, pageSize);
    if (page !== correctedPage) setPage(correctedPage);
  }, [isLoading, page, pageSize, total]);

  const syncVisibleAccounts = async () => {
    const accountAddresses =
      account === "all"
        ? whatsappAccounts.map((item) => item.address)
        : [account];
    if (!accountAddresses.length) {
      void message.error(t("No se pudieron sincronizar las plantillas"));
      return;
    }

    try {
      let synced = 0;
      for (const address of accountAddresses) {
        const result = await syncTemplates.mutateAsync(address);
        synced += result.synced;
      }
      void message.success(`${t("Plantillas sincronizadas")}: ${synced}`);
    } catch {
      void message.error(t("No se pudieron sincronizar las plantillas"));
    }
  };

  const viewTemplate = (template: TemplateListRow) =>
    void navigate({
      to: "/templates/$templateId",
      params: { templateId: template.id },
    });

  const editTemplate = (template: TemplateListRow) =>
    void navigate(
      template.status === "draft"
        ? {
            to: "/templates/$templateId",
            params: { templateId: template.id },
          }
        : {
            to: "/templates/$templateId/edit",
            params: { templateId: template.id },
          },
    );

  const confirmDelete = (template: TemplateListRow) => {
    Modal.confirm({
      title: t("Eliminar plantilla permanentemente"),
      content: `${t("Esta acción eliminará permanentemente la plantilla")}: ${template.name}`,
      okText: t("Eliminar"),
      cancelText: t("Cancelar"),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          if (template.status === "draft") {
            await deleteDraft.mutateAsync(template.id);
          } else {
            await deleteSubmitted.mutateAsync(template.id);
          }
          void message.success(t("Plantilla eliminada"));
        } catch {
          void message.error(
            t("No se pudo eliminar la plantilla. No se realizaron cambios."),
          );
          throw new Error("Template deletion failed");
        }
      },
    });
  };

  const isDeleting = deleteDraft.isPending || deleteSubmitted.isPending;

  return (
    <div className="h-full min-w-0 overflow-y-auto bg-background p-[16px] text-foreground md:p-[28px]">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-[22px] flex flex-col gap-[16px] sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[24px] font-semibold">
              {t("Gestor de plantillas")}
            </h1>
            <p className="mt-[4px] text-[13px] text-muted-foreground">
              {t("Creá, revisá y administrá plantillas de WhatsApp.")}
            </p>
          </div>
          <div className="flex gap-[9px] sm:ml-auto">
            <button
              type="button"
              className="flex items-center justify-center gap-[7px] rounded-lg border border-border px-[13px] py-[9px] text-[13px] hover:bg-muted disabled:opacity-50"
              disabled={syncTemplates.isPending || !whatsappAccounts.length}
              onClick={() => void syncVisibleAccounts()}
            >
              <RefreshCw
                className={`h-[16px] w-[16px] ${syncTemplates.isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden md:inline">{t("Sincronizar")}</span>
            </button>
            <button
              className="primary flex items-center justify-center gap-[8px] px-[18px] py-[10px]"
              onClick={() =>
                void navigate({
                  to: "/templates/new",
                  search: {
                    account: account === "all" ? undefined : account,
                  },
                })
              }
            >
              <Plus className="h-[17px] w-[17px]" />
              {t("Crear plantilla")}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-col gap-[10px] border-b border-border p-[14px] xl:flex-row">
            <label className="flex h-[40px] items-center gap-[9px] rounded-lg border border-input px-[12px] xl:max-w-[360px] xl:flex-1">
              <Search className="h-[16px] w-[16px] text-muted-foreground" />
              <input
                className="w-full border-none bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar plantillas")}
              />
            </label>
            <CampaignFilterSelect
              ariaLabel={t("Todas las cuentas")}
              className="xl:w-[240px]"
              value={account}
              onChange={setAccount}
              options={[
                { value: "all", label: t("Todas las cuentas") },
                ...whatsappAccounts.map((item) => ({
                  value: item.address,
                  label: accountLabels.get(item.address) || item.address,
                })),
              ]}
            />
            <CampaignFilterSelect
              ariaLabel={t("Todas las categorías")}
              className="xl:w-[190px]"
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: t("Todas las categorías") },
                { value: "utility", label: t("Utilidad") },
                { value: "marketing", label: t("Marketing") },
                { value: "authentication", label: t("Autenticación") },
              ]}
            />
            <CampaignFilterSelect
              ariaLabel={t("Todos los estados")}
              className="xl:w-[190px]"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: t("Todos los estados") },
                { value: "draft", label: t("Borrador") },
                { value: "pending", label: t("Pendiente") },
                { value: "approved", label: t("Aprobada") },
                { value: "rejected", label: t("Rechazada") },
                { value: "paused", label: t("Pausada") },
                { value: "disabled", label: t("Deshabilitada") },
              ]}
            />
          </div>

          {isLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <EmptyState
              title={t("No se pudieron cargar las plantillas")}
              description={t("Intentá nuevamente en unos minutos.")}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? t("No hay plantillas que coincidan con los filtros")
                  : t("Todavía no hay plantillas")
              }
              description={
                hasFilters
                  ? t("Probá cambiando la búsqueda o los filtros.")
                  : t("Creá tu primera plantilla para comenzar.")
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-[16px] py-[12px]">{t("Plantilla")}</th>
                      <th className="px-[16px] py-[12px]">{t("Cuenta")}</th>
                      <th className="px-[16px] py-[12px]">{t("Categoría")}</th>
                      <th className="px-[16px] py-[12px]">{t("Estado")}</th>
                      <th className="px-[16px] py-[12px]">
                        {t("Actualizada")}
                      </th>
                      <th className="px-[16px] py-[12px] text-right">
                        {t("Acciones")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((template) => (
                      <tr
                        key={template.id}
                        className="border-t border-border hover:bg-muted/20"
                      >
                        <td className="px-[16px] py-[14px]">
                          <div className="font-medium text-[13px]">
                            {template.name}
                          </div>
                          {template.rejection_reason && (
                            <div className="mt-[2px] max-w-[300px] truncate text-[11px] text-destructive">
                              {template.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-[16px] py-[14px] text-[12px]">
                          {accountLabels.get(template.organization_address) ||
                            template.organization_address}
                        </td>
                        <td className="px-[16px] py-[14px] text-[12px] capitalize">
                          {getCategoryLabel(template.category, t)}
                        </td>
                        <td className="px-[16px] py-[14px]">
                          <StatusBadge status={template.status} />
                        </td>
                        <td className="px-[16px] py-[14px] text-[12px] text-muted-foreground">
                          {formatUpdatedAt(template.updated_at)}
                        </td>
                        <td className="px-[16px] py-[14px]">
                          <RowAction
                            template={template}
                            disabled={isDeleting}
                            onView={() => viewTemplate(template)}
                            onEdit={() => editTemplate(template)}
                            onDelete={() => confirmDelete(template)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-border lg:hidden">
                {rows.map((template) => (
                  <article key={template.id} className="p-[16px]">
                    <div className="flex items-start gap-[12px]">
                      <div className="rounded-full bg-primary/10 p-[9px]">
                        <LayoutTemplate className="h-[18px] w-[18px] text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {template.name}
                        </div>
                        <div className="mt-[3px] text-[12px] text-muted-foreground">
                          {accountLabels.get(template.organization_address) ||
                            template.organization_address}
                        </div>
                      </div>
                      <StatusBadge status={template.status} />
                    </div>
                    <div className="mt-[14px] flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">
                        {getCategoryLabel(template.category, t)} ·{" "}
                        {formatUpdatedAt(template.updated_at)}
                      </span>
                      <RowAction
                        template={template}
                        disabled={isDeleting}
                        onView={() => viewTemplate(template)}
                        onEdit={() => editTemplate(template)}
                        onDelete={() => confirmDelete(template)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col justify-between gap-[10px] border-t border-border px-[14px] py-[12px] text-[12px] text-muted-foreground sm:flex-row sm:items-center">
            <span>
              {total} {t("plantillas")}
            </span>
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              disabled={isLoading}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RowAction({
  template,
  disabled,
  onView,
  onEdit,
  onDelete,
}: {
  template: TemplateListRow;
  disabled: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { translate: t } = useTranslation();
  const actions = getTemplateActions(template.status);
  return (
    <div className="flex flex-wrap justify-end gap-[6px]">
      {actions.includes("view") && (
        <ActionButton
          label={t("Ver")}
          icon={<Eye className="h-[13px] w-[13px]" />}
          disabled={disabled}
          onClick={onView}
        />
      )}
      {actions.includes("edit") && (
        <ActionButton
          label={t("Editar")}
          icon={<Pencil className="h-[13px] w-[13px]" />}
          disabled={disabled}
          onClick={onEdit}
        />
      )}
      {actions.includes("delete") && (
        <ActionButton
          label={t("Eliminar")}
          icon={<Trash2 className="h-[13px] w-[13px]" />}
          disabled={disabled}
          destructive
          onClick={onDelete}
        />
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled,
  destructive = false,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex items-center gap-[6px] rounded-lg border border-border px-[9px] py-[7px] text-[12px] hover:bg-muted disabled:opacity-50 ${destructive ? "text-destructive" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { translate: t } = useTranslation();
  const labels: Record<string, string> = {
    draft: t("Borrador"),
    pending: t("Pendiente"),
    approved: t("Aprobada"),
    rejected: t("Rechazada"),
    paused: t("Pausada"),
    disabled: t("Deshabilitada"),
  };
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-500/15 text-amber-500",
    approved: "bg-green-500/15 text-green-500",
    rejected: "bg-destructive/15 text-destructive",
    paused: "bg-amber-500/15 text-amber-500",
    disabled: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-[9px] py-[4px] text-[11px] ${styles[status] || "bg-muted text-muted-foreground"}`}
    >
      {labels[status] || status.replaceAll("_", " ")}
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
    <div className="flex h-[280px] flex-col items-center justify-center px-[20px] text-center">
      <div className="mb-[12px] rounded-full bg-muted p-[12px]">
        <LayoutTemplate className="h-[24px] w-[24px] text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-[5px] text-[13px] text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

function getAccountLabel(address: string, extra: unknown) {
  const details =
    extra && typeof extra === "object" && !Array.isArray(extra)
      ? (extra as Record<string, unknown>)
      : {};
  const name =
    typeof details.verified_name === "string" ? details.verified_name : "";
  const phone =
    typeof details.phone_number === "string"
      ? formatPhoneNumber(details.phone_number)
      : formatPhoneNumber(address);
  return name ? `${name} · ${phone}` : phone;
}

function getCategoryLabel(category: string, t: (value: string) => string) {
  return (
    {
      utility: t("Utilidad"),
      marketing: t("Marketing"),
      authentication: t("Autenticación"),
    }[category] || category
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
