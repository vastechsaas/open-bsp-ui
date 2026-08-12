import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { message as toast } from "antd";
import { Archive, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent, useCurrentAgents } from "@/queries/useAgents";
import {
  type RoutingQueueListRow,
  useCreateRoutingQueue,
  useRoutingQueuesPage,
  useUpdateRoutingQueue,
} from "@/queries/useRoutingQueues";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import type { AgentRow } from "@/supabase/client";

export const Route = createFileRoute("/_auth/settings/routing-queues")({
  component: RoutingQueuesSettings,
});

function isAcceptedAgent(
  agent: AgentRow,
): agent is Extract<AgentRow, { ai: false }> {
  if (agent.ai) return false;
  return (
    !!agent.user_id &&
    agent.extra?.role === "agent" &&
    (!agent.extra.invitation || agent.extra.invitation.status === "accepted")
  );
}

function RoutingQueuesSettings() {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [editing, setEditing] = useState<RoutingQueueListRow | "create" | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: currentAgent } = useCurrentAgent();
  const { data: agents = [] } = useCurrentAgents();
  const updateQueue = useUpdateRoutingQueue();
  const canManage = ["owner", "admin", "supervisor"].includes(
    currentAgent?.extra?.role ?? "",
  );
  const query = useRoutingQueuesPage({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const eligibleAgents = agents.filter(isAcceptedAgent);
  const namesById = useMemo(
    () => new Map(eligibleAgents.map((agent) => [agent.id, agent.name])),
    [eligibleAgents],
  );

  useEffect(() => setPage(1), [debouncedSearch]);

  const changeStatus = async (
    queue: RoutingQueueListRow,
    status: "active" | "archived",
  ) => {
    try {
      await updateQueue.mutateAsync({
        id: queue.id,
        name: queue.name,
        status,
        agentIds: queue.member_ids ?? [],
      });
      void toast.success(
        status === "active" ? t("Cola restaurada") : t("Cola archivada"),
      );
    } catch {
      void toast.error(t("No se pudo actualizar la cola"));
    }
  };

  if (!canManage) {
    return (
      <SettingsState
        title={t("No tenés permisos para administrar colas")}
        description={t(
          "Solo propietarios, administradores y supervisores pueden configurar el enrutamiento.",
        )}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="text-xl font-semibold">
            {t("Colas de enrutamiento")}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("Dirigí las entregas humanas a los agentes adecuados.")}
          </p>
        </div>
        <button
          type="button"
          className="primary flex items-center justify-center gap-2 px-4 py-2 sm:ml-auto"
          onClick={() => setEditing("create")}
        >
          <Plus className="h-4 w-4" />
          {t("Nueva cola")}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <label className="flex h-10 max-w-md items-center gap-2 rounded-lg border border-input px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Buscar cola")}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-border">
          {query.isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : query.isError ? (
            <SettingsState
              title={t("No se pudieron cargar las colas")}
              description={t("Intentá nuevamente en unos minutos.")}
            />
          ) : rows.length === 0 ? (
            <SettingsState
              title={t("Todavía no hay colas")}
              description={t(
                "Creá VIP Support para comenzar a enrutar entregas humanas.",
              )}
            />
          ) : (
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Nombre")}</th>
                  <th className="px-4 py-3">{t("Estado")}</th>
                  <th className="px-4 py-3">{t("Agentes")}</th>
                  <th className="px-4 py-3 text-right">{t("Acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((queue) => (
                  <tr key={queue.id} className="border-t border-border">
                    <td className="px-4 py-4 font-semibold">{queue.name}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${queue.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}
                      >
                        {queue.status === "active"
                          ? t("Activa")
                          : t("Archivada")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {(queue.member_ids ?? [])
                        .map((id) => namesById.get(id) ?? id)
                        .join(", ") || t("Sin agentes")}
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
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={query.isLoading}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {editing && (
        <RoutingQueueDialog
          queue={editing === "create" ? undefined : editing}
          agents={eligibleAgents.map(({ id, name }) => ({ id, name }))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function RoutingQueueDialog({
  queue,
  agents,
  onClose,
}: {
  queue?: RoutingQueueListRow;
  agents: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const [name, setName] = useState(queue?.name ?? "");
  const [agentIds, setAgentIds] = useState<string[]>(queue?.member_ids ?? []);
  const createQueue = useCreateRoutingQueue();
  const updateQueue = useUpdateRoutingQueue();
  const saving = createQueue.isPending || updateQueue.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      if (queue) {
        await updateQueue.mutateAsync({
          id: queue.id,
          name,
          status: queue.status as "active" | "archived",
          agentIds,
        });
      } else {
        await createQueue.mutateAsync({ name, agentIds });
      }
      void toast.success(queue ? t("Cola actualizada") : t("Cola creada"));
      onClose();
    } catch {
      void toast.error(t("No se pudo guardar la cola"));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {queue ? t("Editar cola") : t("Nueva cola")}
          </h3>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-5 block text-sm font-medium">
          {t("Nombre")}
          <input
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="VIP Support"
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium">
            {t("Agentes elegibles")}
          </legend>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {agents.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {t("No hay agentes aceptados disponibles.")}
              </p>
            ) : (
              agents.map((agent) => (
                <label
                  key={agent.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={agentIds.includes(agent.id)}
                    onChange={(event) =>
                      setAgentIds((current) =>
                        event.target.checked
                          ? [...current, agent.id]
                          : current.filter((id) => id !== agent.id),
                      )
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm">{agent.name}</span>
                </label>
              ))
            )}
          </div>
        </fieldset>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            disabled={saving}
            onClick={onClose}
          >
            {t("Cancelar")}
          </button>
          <button
            type="submit"
            className="primary px-4 py-2 text-sm disabled:opacity-50"
            disabled={saving || !name.trim()}
          >
            {saving ? t("Guardando…") : t("Guardar")}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
