import { useEffect, useState } from "react";
import { message as toast } from "antd";
import { Archive, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import DataTablePagination from "@/components/DataTablePagination";
import RoutingQueueEditorDialog from "@/components/routing-queues/RoutingQueueEditorDialog";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type PlatformRoutingQueueRow,
  useCreatePlatformRoutingQueue,
  usePlatformOrganizationAgentsPage,
  usePlatformRoutingQueuesPage,
  useUpdatePlatformRoutingQueue,
} from "@/queries/usePlatformOrganizationManagement";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";

export default function PlatformOrganizationQueues({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [editing, setEditing] = useState<
    PlatformRoutingQueueRow | "create" | null
  >(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const queues = usePlatformRoutingQueuesPage(organizationId, {
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const agents = usePlatformOrganizationAgentsPage(organizationId, {
    page: 1,
    pageSize: 50,
  });
  const createQueue = useCreatePlatformRoutingQueue(organizationId);
  const updateQueue = useUpdatePlatformRoutingQueue(organizationId);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const rows = queues.data?.rows ?? [];
  const total = queues.data?.total ?? 0;
  const agentOptions = (agents.data?.rows ?? []).map((agent) => ({
    id: agent.id,
    name: agent.name,
  }));

  const changeStatus = async (
    queue: PlatformRoutingQueueRow,
    nextStatus: "active" | "archived",
  ) => {
    try {
      await updateQueue.mutateAsync({
        id: queue.id,
        name: queue.name,
        status: nextStatus,
        agentIds: queue.member_ids ?? [],
      });
      void toast.success(
        nextStatus === "active" ? t("Cola restaurada") : t("Cola archivada"),
      );
    } catch {
      void toast.error(t("No se pudo actualizar la cola"));
    }
  };

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-semibold">{t("Colas de negocio")}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t(
              "Administrá el enrutamiento y los agentes elegibles de esta organización.",
            )}
          </p>
        </div>
        <button
          type="button"
          className="primary inline-flex items-center justify-center gap-2 px-4 py-2 sm:ml-auto"
          onClick={() => setEditing("create")}
        >
          <Plus className="h-4 w-4" />
          {t("Nueva cola")}
        </button>
      </header>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 sm:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Buscar cola")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("Todos los estados")}</option>
          <option value="active">{t("Activas")}</option>
          <option value="archived">{t("Archivadas")}</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {queues.isPending ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : queues.isError ? (
          <State title={t("No se pudieron cargar las colas")} />
        ) : rows.length === 0 ? (
          <State title={t("No se encontraron colas")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Nombre")}</th>
                  <th className="px-4 py-3">{t("Agentes")}</th>
                  <th className="px-4 py-3">{t("Estrategia de asignación")}</th>
                  <th className="px-4 py-3">{t("Estado")}</th>
                  <th className="px-4 py-3 text-right">{t("Acciones")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((queue) => (
                  <tr key={queue.id} className="text-[13px]">
                    <td className="px-4 py-4 font-semibold">{queue.name}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {(queue.member_names ?? []).slice(0, 3).map((name) => (
                          <span
                            key={`${queue.id}-${name}`}
                            title={name}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold"
                          >
                            {initials(name)}
                          </span>
                        ))}
                        <span className="text-muted-foreground">
                          {queue.member_count === 0
                            ? t("Sin agentes")
                            : `${queue.member_count} ${t("agentes")}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {t("Manual")}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${queue.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}
                      >
                        {queue.status === "active"
                          ? t("Activa")
                          : t("Archivada")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-border p-2 hover:bg-muted"
                          title={t("Editar")}
                          onClick={() => setEditing(queue)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50"
                          disabled={updateQueue.isPending}
                          title={
                            queue.status === "active"
                              ? t("Archivar")
                              : t("Restaurar")
                          }
                          onClick={() =>
                            void changeStatus(
                              queue,
                              queue.status === "active" ? "archived" : "active",
                            )
                          }
                        >
                          {queue.status === "active" ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={queues.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>

      {editing && (
        <RoutingQueueEditorDialog
          title={editing === "create" ? t("Nueva cola") : t("Editar cola")}
          initialName={editing === "create" ? undefined : editing.name}
          initialAgentIds={
            editing === "create" ? undefined : (editing.member_ids ?? [])
          }
          agents={agentOptions}
          saving={createQueue.isPending || updateQueue.isPending}
          onSave={async ({ name, agentIds }) => {
            try {
              if (editing === "create") {
                await createQueue.mutateAsync({ name, agentIds });
              } else {
                await updateQueue.mutateAsync({
                  id: editing.id,
                  name,
                  status: editing.status as "active" | "archived",
                  agentIds,
                });
              }
              void toast.success(
                editing === "create" ? t("Cola creada") : t("Cola actualizada"),
              );
              setEditing(null);
            } catch {
              void toast.error(t("No se pudo guardar la cola"));
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function State({ title }: { title: string }) {
  return (
    <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}
