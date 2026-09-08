import { useEffect, useState, type FormEvent } from "react";
import { message } from "antd";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  CircleDot,
  Clock3,
  Copy,
  GitBranch,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import CampaignFilterSelect from "@/components/campaigns/CampaignFilterSelect";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import {
  type ChatbotFlowListRow,
  useArchiveChatbotFlow,
  useChatbotFlows,
  useCreateChatbotFlow,
  useDuplicateChatbotFlow,
  useRestoreChatbotFlow,
} from "@/queries/useChatbotFlows";
import {
  getChatbotFlowDuplicateName,
  getChatbotFlowStatusLabel,
  getChatbotFlowVersionSummary,
  type ChatbotFlowStatus,
} from "@/utils/ChatbotFlowUtils";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";

export const Route = createFileRoute("/_auth/chatbots/")({
  component: ChatbotFlowList,
});

type StatusFilter = "all" | ChatbotFlowStatus;
type NameDialogState =
  | { mode: "create" }
  | { mode: "duplicate"; flow: ChatbotFlowListRow };
type LifecycleDialogState = {
  action: "archive" | "restore";
  flow: ChatbotFlowListRow;
};

function ChatbotFlowList() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null);
  const [lifecycleDialog, setLifecycleDialog] =
    useState<LifecycleDialogState | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: currentAgent } = useCurrentAgent();
  const canManage =
    currentAgent?.extra?.role === "owner" ||
    currentAgent?.extra?.role === "admin";
  const {
    data: flowPage,
    isLoading,
    isError,
    refetch,
  } = useChatbotFlows({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const createFlow = useCreateChatbotFlow();
  const duplicateFlow = useDuplicateChatbotFlow();
  const archiveFlow = useArchiveChatbotFlow();
  const restoreFlow = useRestoreChatbotFlow();
  const flows = flowPage?.rows || [];
  const total = flowPage?.total || 0;
  const hasFilters = !!search.trim() || statusFilter !== "all";
  const nameMutationPending = createFlow.isPending || duplicateFlow.isPending;
  const lifecycleMutationPending =
    archiveFlow.isPending || restoreFlow.isPending;

  useEffect(() => setPage(1), [debouncedSearch, statusFilter]);

  async function submitName(name: string) {
    if (!nameDialog) return;

    try {
      if (nameDialog.mode === "create") {
        const created = await createFlow.mutateAsync({ name });
        void message.success(t("Chatbot creado"));
        setNameDialog(null);
        await navigate({
          to: "/chatbots/$flowId",
          params: { flowId: created.flow_id },
        });
        return;
      } else {
        await duplicateFlow.mutateAsync({
          flowId: nameDialog.flow.id,
          name,
        });
        void message.success(t("Chatbot duplicado"));
      }
      setNameDialog(null);
    } catch {
      void message.error(
        nameDialog.mode === "create"
          ? t("No se pudo crear el chatbot")
          : t("No se pudo duplicar el chatbot"),
      );
    }
  }

  async function submitLifecycleAction() {
    if (!lifecycleDialog) return;

    try {
      if (lifecycleDialog.action === "archive") {
        await archiveFlow.mutateAsync(lifecycleDialog.flow.id);
        void message.success(t("Chatbot archivado"));
      } else {
        await restoreFlow.mutateAsync(lifecycleDialog.flow.id);
        void message.success(t("Chatbot restaurado"));
      }
      setLifecycleDialog(null);
    } catch {
      void message.error(
        lifecycleDialog.action === "archive"
          ? t("No se pudo archivar el chatbot")
          : t("No se pudo restaurar el chatbot"),
      );
    }
  }

  return (
    <div className="h-full min-w-0 overflow-y-auto bg-background p-[16px] text-foreground md:p-[28px]">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-[22px] flex flex-col gap-[16px] sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[24px] font-semibold">
              {t("Flujos de chatbot")}
            </h1>
            <p className="mt-[4px] text-[13px] text-muted-foreground">
              {t(
                "Diseñá, organizá y prepará los recorridos automatizados de tus conversaciones.",
              )}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="primary flex items-center justify-center gap-[8px] px-[18px] py-[10px] sm:ml-auto"
              onClick={() => setNameDialog({ mode: "create" })}
            >
              <Plus className="h-[17px] w-[17px]" />
              {t("Nuevo chatbot")}
            </button>
          )}
        </header>

        <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col gap-[10px] border-b border-border p-[14px] lg:flex-row">
            <label className="flex h-[42px] items-center gap-[9px] rounded-lg border border-input bg-background px-[12px] lg:max-w-[420px] lg:flex-1">
              <Search className="h-[16px] w-[16px] text-muted-foreground" />
              <input
                value={search}
                className="w-full border-none bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                placeholder={t("Buscar chatbots")}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <CampaignFilterSelect
              ariaLabel={t("Filtrar por estado")}
              className="lg:w-[210px]"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: t("Todos los estados") },
                { value: "active", label: t("Activos") },
                { value: "archived", label: t("Archivados") },
              ]}
            />
          </div>

          {!canManage && (
            <div className="flex items-start gap-[9px] border-b border-border bg-muted/35 px-[14px] py-[10px] text-[12px] text-muted-foreground">
              <ShieldCheck className="mt-[1px] h-[15px] w-[15px] shrink-0 text-primary" />
              {t(
                "Tenés acceso de solo lectura. Un administrador puede crear o modificar chatbots.",
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <EmptyState
              title={t("No se pudieron cargar los chatbots")}
              description={t("Revisá la conexión e intentá nuevamente.")}
              actionLabel={t("Reintentar")}
              onAction={() => void refetch()}
            />
          ) : flows.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? t("No hay chatbots que coincidan con los filtros")
                  : t("Todavía no hay chatbots")
              }
              description={
                hasFilters
                  ? t("Probá cambiando la búsqueda o el estado.")
                  : canManage
                    ? t("Creá tu primer flujo para empezar a diseñar.")
                    : t(
                        "Cuando un administrador cree un flujo, aparecerá aquí.",
                      )
              }
              actionLabel={
                !hasFilters && canManage ? t("Crear chatbot") : undefined
              }
              onAction={
                !hasFilters && canManage
                  ? () => setNameDialog({ mode: "create" })
                  : undefined
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-muted/45 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-[18px] py-[12px]">{t("Flujo")}</th>
                      <th className="px-[16px] py-[12px]">{t("Estado")}</th>
                      <th className="px-[16px] py-[12px]">{t("Versiones")}</th>
                      <th className="px-[16px] py-[12px]">{t("Creado por")}</th>
                      <th className="px-[16px] py-[12px]">
                        {t("Actualizado")}
                      </th>
                      <th className="px-[18px] py-[12px] text-right">
                        {t("Acciones")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flows.map((flow) => (
                      <FlowTableRow
                        key={flow.id}
                        flow={flow}
                        canManage={canManage}
                        disabled={
                          nameMutationPending || lifecycleMutationPending
                        }
                        onOpen={() =>
                          void navigate({
                            to: "/chatbots/$flowId",
                            params: { flowId: flow.id },
                          })
                        }
                        onDuplicate={() =>
                          setNameDialog({ mode: "duplicate", flow })
                        }
                        onLifecycle={(action) =>
                          setLifecycleDialog({ action, flow })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border lg:hidden">
                {flows.map((flow) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    canManage={canManage}
                    disabled={nameMutationPending || lifecycleMutationPending}
                    onOpen={() =>
                      void navigate({
                        to: "/chatbots/$flowId",
                        params: { flowId: flow.id },
                      })
                    }
                    onDuplicate={() =>
                      setNameDialog({ mode: "duplicate", flow })
                    }
                    onLifecycle={(action) =>
                      setLifecycleDialog({ action, flow })
                    }
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col justify-between gap-[10px] border-t border-border px-[14px] py-[12px] text-[12px] text-muted-foreground sm:flex-row sm:items-center">
            <span>
              {total} {total === 1 ? t("chatbot") : t("chatbots")}
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
        </section>
      </div>

      <FlowNameDialog
        open={!!nameDialog}
        title={
          nameDialog?.mode === "duplicate"
            ? t("Duplicar chatbot")
            : t("Crear chatbot")
        }
        description={
          nameDialog?.mode === "duplicate"
            ? t("La copia se crea como un nuevo borrador independiente.")
            : t(
                "Dale un nombre claro. Podrás construir el flujo a continuación.",
              )
        }
        confirmLabel={
          nameDialog?.mode === "duplicate" ? t("Duplicar") : t("Crear")
        }
        initialName={
          nameDialog?.mode === "duplicate"
            ? getChatbotFlowDuplicateName(nameDialog.flow.name)
            : ""
        }
        loading={nameMutationPending}
        onClose={() => setNameDialog(null)}
        onSubmit={submitName}
      />

      <ConfirmDialog
        open={!!lifecycleDialog}
        title={
          lifecycleDialog?.action === "archive"
            ? t("Archivar chatbot")
            : t("Restaurar chatbot")
        }
        description={
          lifecycleDialog?.action === "archive"
            ? t(
                "El flujo dejará de aparecer entre los activos, pero conservará sus versiones.",
              )
            : t(
                "El flujo volverá a estar disponible entre los chatbots activos.",
              )
        }
        confirmLabel={
          lifecycleDialog?.action === "archive" ? t("Archivar") : t("Restaurar")
        }
        destructive={lifecycleDialog?.action === "archive"}
        loading={lifecycleMutationPending}
        onClose={() => setLifecycleDialog(null)}
        onConfirm={submitLifecycleAction}
      />
    </div>
  );
}

function FlowTableRow({
  flow,
  canManage,
  disabled,
  onOpen,
  onDuplicate,
  onLifecycle,
}: FlowActionsProps & { flow: ChatbotFlowListRow }) {
  const { translate: t } = useTranslation();

  return (
    <tr className="border-t border-border transition-colors hover:bg-muted/20">
      <td className="px-[18px] py-[15px]">
        <div className="flex items-center gap-[11px]">
          <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Workflow className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="min-w-0">
            {canManage ? (
              <button
                type="button"
                className="block max-w-[320px] truncate text-left text-[13px] font-medium hover:text-primary"
                onClick={onOpen}
              >
                {flow.name}
              </button>
            ) : (
              <div className="max-w-[320px] truncate text-[13px] font-medium">
                {flow.name}
              </div>
            )}
            <div className="mt-[2px] flex items-center gap-[5px] text-[11px] text-muted-foreground">
              <GitBranch className="h-[12px] w-[12px]" />
              {flow.has_unpublished_changes
                ? t("Cambios sin publicar")
                : t("Sin cambios pendientes")}
            </div>
          </div>
        </div>
      </td>
      <td className="px-[16px] py-[15px]">
        <FlowStatusBadge status={flow.status} />
      </td>
      <td className="px-[16px] py-[15px]">
        <FlowVersions flow={flow} />
      </td>
      <td className="px-[16px] py-[15px] text-[12px]">
        <div className="flex items-center gap-[6px]">
          <UserRound className="h-[14px] w-[14px] text-muted-foreground" />
          <span className="max-w-[160px] truncate">
            {flow.created_by_name || t("Usuario")}
          </span>
        </div>
      </td>
      <td className="px-[16px] py-[15px] text-[12px] text-muted-foreground">
        <div className="flex items-center gap-[6px] whitespace-nowrap">
          <Clock3 className="h-[14px] w-[14px]" />
          {formatUpdatedAt(flow.updated_at)}
        </div>
      </td>
      <td className="px-[18px] py-[15px]">
        <FlowActionButtons
          flow={flow}
          canManage={canManage}
          disabled={disabled}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onLifecycle={onLifecycle}
        />
      </td>
    </tr>
  );
}

function FlowCard({
  flow,
  canManage,
  disabled,
  onOpen,
  onDuplicate,
  onLifecycle,
}: FlowActionsProps & { flow: ChatbotFlowListRow }) {
  const { translate: t } = useTranslation();

  return (
    <article className="p-[16px]">
      <div className="flex items-start gap-[11px]">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <Workflow className="h-[19px] w-[19px] text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          {canManage ? (
            <button
              type="button"
              className="block max-w-full truncate text-left text-[14px] font-medium hover:text-primary"
              onClick={onOpen}
            >
              {flow.name}
            </button>
          ) : (
            <div className="truncate text-[14px] font-medium">{flow.name}</div>
          )}
          <div className="mt-[3px] text-[11px] text-muted-foreground">
            {flow.has_unpublished_changes
              ? t("Cambios sin publicar")
              : t("Sin cambios pendientes")}
          </div>
        </div>
        <FlowStatusBadge status={flow.status} />
      </div>
      <div className="mt-[16px] grid grid-cols-2 gap-[12px] rounded-lg bg-muted/35 p-[12px]">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("Versiones")}
          </div>
          <div className="mt-[5px]">
            <FlowVersions flow={flow} />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("Actualizado")}
          </div>
          <div className="mt-[5px] text-[12px]">
            {formatUpdatedAt(flow.updated_at)}
          </div>
        </div>
      </div>
      <div className="mt-[12px] flex items-center justify-between gap-[10px]">
        <span className="truncate text-[11px] text-muted-foreground">
          {flow.created_by_name || t("Usuario")}
        </span>
        <FlowActionButtons
          flow={flow}
          canManage={canManage}
          disabled={disabled}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onLifecycle={onLifecycle}
        />
      </div>
    </article>
  );
}

type FlowActionsProps = {
  canManage: boolean;
  disabled: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onLifecycle: (action: "archive" | "restore") => void;
};

function FlowActionButtons({
  flow,
  canManage,
  disabled,
  onOpen,
  onDuplicate,
  onLifecycle,
}: FlowActionsProps & { flow: ChatbotFlowListRow }) {
  const { translate: t } = useTranslation();

  if (!canManage) {
    return (
      <div className="text-right text-[11px] text-muted-foreground">
        {t("Solo lectura")}
      </div>
    );
  }

  const isArchived = flow.status === "archived";
  return (
    <div className="flex justify-end gap-[7px]">
      <button
        type="button"
        title={t("Abrir editor")}
        aria-label={`${t("Abrir editor")} ${flow.name}`}
        className="flex h-[34px] items-center gap-[6px] rounded-lg border border-primary/35 px-[9px] text-[11px] text-primary hover:bg-primary/10"
        onClick={onOpen}
      >
        <PencilLine className="h-[14px] w-[14px]" />
        <span className="hidden 2xl:inline">{t("Abrir")}</span>
      </button>
      <button
        type="button"
        title={t("Duplicar")}
        aria-label={`${t("Duplicar")} ${flow.name}`}
        disabled={disabled}
        className="flex h-[34px] items-center gap-[6px] rounded-lg border border-border px-[9px] text-[11px] hover:bg-muted disabled:opacity-50"
        onClick={onDuplicate}
      >
        <Copy className="h-[14px] w-[14px]" />
        <span className="hidden 2xl:inline">{t("Duplicar")}</span>
      </button>
      <button
        type="button"
        title={isArchived ? t("Restaurar") : t("Archivar")}
        aria-label={`${isArchived ? t("Restaurar") : t("Archivar")} ${flow.name}`}
        disabled={disabled}
        className={`flex h-[34px] items-center gap-[6px] rounded-lg border px-[9px] text-[11px] disabled:opacity-50 ${
          isArchived
            ? "border-primary/40 text-primary hover:bg-primary/10"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        onClick={() => onLifecycle(isArchived ? "restore" : "archive")}
      >
        {isArchived ? (
          <ArchiveRestore className="h-[14px] w-[14px]" />
        ) : (
          <Archive className="h-[14px] w-[14px]" />
        )}
        <span className="hidden 2xl:inline">
          {isArchived ? t("Restaurar") : t("Archivar")}
        </span>
      </button>
    </div>
  );
}

function FlowStatusBadge({ status }: { status: string }) {
  const { translate: t } = useTranslation();
  const active = status === "active";

  return (
    <span
      className={`inline-flex items-center gap-[6px] whitespace-nowrap rounded-full px-[9px] py-[4px] text-[11px] font-medium ${
        active
          ? "bg-green-500/12 text-green-600 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <CircleDot className="h-[11px] w-[11px]" />
      {t(getChatbotFlowStatusLabel(status))}
    </span>
  );
}

function FlowVersions({ flow }: { flow: ChatbotFlowListRow }) {
  const { translate: t } = useTranslation();
  const versions = getChatbotFlowVersionSummary({
    draftVersion: flow.draft_version,
    publishedVersion: flow.published_version,
  });

  return (
    <div className="space-y-[2px] text-[11px]">
      <div className="flex items-center gap-[5px]">
        <span className="text-muted-foreground">{t("Borrador")}</span>
        <span className="font-medium text-foreground">{versions.draft}</span>
      </div>
      <div className="flex items-center gap-[5px]">
        <span className="text-muted-foreground">{t("Publicado")}</span>
        <span className="font-medium text-foreground">
          {versions.published === "Sin publicar"
            ? t(versions.published)
            : versions.published}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-[20px] text-center">
      <div className="mb-[13px] flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-border bg-muted/50">
        <Workflow className="h-[25px] w-[25px] text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-[5px] max-w-[420px] text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="primary mt-[16px] px-[17px] py-[8px] text-[13px]"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function FlowNameDialog({
  open,
  title,
  description,
  confirmLabel,
  initialName,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  initialName: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const { translate: t } = useTranslation();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [loading, onClose, open]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (normalizedName) void onSubmit(normalizedName);
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-[16px] backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-name-dialog-title"
        className="w-full max-w-[460px] rounded-2xl border border-border bg-popover p-[20px] text-popover-foreground shadow-2xl"
      >
        <div className="flex items-start gap-[12px]">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-primary/12">
            <Workflow className="h-[19px] w-[19px] text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="chatbot-name-dialog-title" className="font-semibold">
              {title}
            </h2>
            <p className="mt-[4px] text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("Cerrar")}
            disabled={loading}
            className="rounded-md p-[5px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-[17px] w-[17px]" />
          </button>
        </div>
        <form className="mt-[20px] grow-0 gap-[16px] pl-0" onSubmit={submit}>
          <label>
            <span className="mb-[7px] block text-[12px] font-medium">
              {t("Nombre del chatbot")}
            </span>
            <input
              autoFocus
              value={name}
              maxLength={120}
              className="h-[42px] w-full rounded-lg border border-input bg-background px-[12px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder={t("Ej. Calificación de prospectos")}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-[8px]">
            <button
              type="button"
              disabled={loading}
              className="rounded-full border border-border px-[16px] py-[8px] text-[13px] hover:bg-muted disabled:opacity-50"
              onClick={onClose}
            >
              {t("Cancelar")}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="primary min-w-[92px] px-[16px] py-[8px] text-[13px]"
            >
              {loading ? t("Guardando…") : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { translate: t } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-[16px] backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-confirm-dialog-title"
        className="w-full max-w-[430px] rounded-2xl border border-border bg-popover p-[20px] text-popover-foreground shadow-2xl"
      >
        <h2 id="chatbot-confirm-dialog-title" className="font-semibold">
          {title}
        </h2>
        <p className="mt-[6px] text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-[20px] flex justify-end gap-[8px]">
          <button
            type="button"
            disabled={loading}
            className="rounded-full border border-border px-[16px] py-[8px] text-[13px] hover:bg-muted disabled:opacity-50"
            onClick={onClose}
          >
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={loading}
            className={
              destructive
                ? "destructive min-w-[92px] px-[16px] py-[8px] text-[13px]"
                : "primary min-w-[92px] px-[16px] py-[8px] text-[13px]"
            }
            onClick={() => void onConfirm()}
          >
            {loading ? t("Guardando…") : confirmLabel}
          </button>
        </div>
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
