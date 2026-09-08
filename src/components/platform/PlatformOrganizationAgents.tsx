import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { message as toast } from "antd";
import {
  AlertTriangle,
  Gauge,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type PlatformOrganizationAgentRow,
  useInvitePlatformOrganizationAgent,
  usePlatformOrganizationAgentCapacity,
  usePlatformOrganizationAgentsPage,
  usePlatformRoutingQueuesPage,
  useRemovePlatformOrganizationAgent,
  useUpdatePlatformOrganizationAgent,
  useUpdatePlatformOrganizationAgentCapacity,
} from "@/queries/usePlatformOrganizationManagement";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";

type DialogState =
  | { type: "capacity" }
  | { type: "invite" }
  | { type: "edit"; agent: PlatformOrganizationAgentRow }
  | { type: "remove"; agent: PlatformOrganizationAgentRow }
  | null;

export default function PlatformOrganizationAgents({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [dialog, setDialog] = useState<DialogState>(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const agents = usePlatformOrganizationAgentsPage(organizationId, {
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });
  const capacity = usePlatformOrganizationAgentCapacity(organizationId);
  const queues = usePlatformRoutingQueuesPage(organizationId, {
    page: 1,
    pageSize: 50,
    status: "active",
  });

  useEffect(() => setPage(1), [debouncedSearch]);
  useEffect(() => setDialog(null), [organizationId]);

  const rows = agents.data?.rows ?? [];
  const total = agents.data?.total ?? 0;
  const used = Number(capacity.data?.used_agent_seats ?? 0);
  const limit = capacity.data?.max_agent_seats ?? null;
  const atLimit = limit !== null && used >= limit;
  const overLimit = capacity.data?.over_limit ?? false;
  const queueOptions = (queues.data?.rows ?? []).map((queue) => ({
    id: queue.id,
    name: queue.name,
  }));

  return (
    <div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-xl font-semibold">{t("Agentes")}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("Administrá los agentes, invitaciones y acceso a colas.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            onClick={() => setDialog({ type: "capacity" })}
          >
            <Gauge className="h-4 w-4" />
            {t("Configurar límite")}
          </button>
          <button
            type="button"
            className="primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={capacity.isPending || atLimit}
            title={atLimit ? t("La capacidad de agentes está completa") : ""}
            onClick={() => setDialog({ type: "invite" })}
          >
            <Plus className="h-4 w-4" />
            {t("Invitar agente")}
          </button>
        </div>
      </header>

      <section className="mt-5 border-y border-border py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Capacidad de agentes")}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {capacity.isPending
                ? t("Cargando…")
                : limit === null
                  ? `${used} · ${t("Ilimitado")}`
                  : `${used} ${t("de")} ${limit}`}
            </div>
          </div>
          {overLimit && (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 sm:ml-auto">
              <AlertTriangle className="h-4 w-4" />
              {used} {t("de")} {limit} — {t("límite superado")}
            </div>
          )}
          {!overLimit && atLimit && (
            <div className="text-sm text-muted-foreground sm:ml-auto">
              {t("No hay puestos disponibles para nuevas invitaciones.")}
            </div>
          )}
        </div>
      </section>

      <label className="mt-5 flex h-10 max-w-md items-center gap-2 rounded-lg border border-input bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Buscar agente por nombre o correo")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {agents.isPending ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : agents.isError ? (
          <State title={t("No se pudieron cargar los agentes")} />
        ) : rows.length === 0 ? (
          <State title={t("No se encontraron agentes")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Agente")}</th>
                  <th className="px-4 py-3">{t("Correo electrónico")}</th>
                  <th className="px-4 py-3">{t("Estado")}</th>
                  <th className="px-4 py-3">{t("Colas")}</th>
                  <th className="px-4 py-3 text-right">{t("Acciones")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((agent) => (
                  <tr key={agent.id} className="text-[13px]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {agent.email || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={agent.invitation_status} />
                    </td>
                    <td className="px-4 py-4">
                      {agent.invitation_status === "pending" ? (
                        <span className="text-muted-foreground">
                          {t("Disponible después de aceptar")}
                        </span>
                      ) : (
                        <QueueNames agent={agent} />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-border p-2 hover:bg-muted"
                          title={t("Editar")}
                          onClick={() => setDialog({ type: "edit", agent })}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border p-2 text-destructive hover:bg-destructive/10"
                          title={
                            agent.invitation_status === "pending"
                              ? t("Cancelar invitación")
                              : t("Eliminar agente")
                          }
                          onClick={() => setDialog({ type: "remove", agent })}
                        >
                          <Trash2 className="h-4 w-4" />
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
          disabled={agents.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>
      {dialog?.type === "capacity" && (
        <CapacityDialog
          organizationId={organizationId}
          current={limit}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "invite" && (
        <InviteDialog
          organizationId={organizationId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "edit" && (
        <EditDialog
          organizationId={organizationId}
          agent={dialog.agent}
          queues={queueOptions}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "remove" && (
        <RemoveDialog
          organizationId={organizationId}
          agent={dialog.agent}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function CapacityDialog({
  organizationId,
  current,
  onClose,
}: {
  organizationId: string;
  current: number | null;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const mutation = useUpdatePlatformOrganizationAgentCapacity(organizationId);
  const [unlimited, setUnlimited] = useState(current === null);
  const [value, setValue] = useState(current?.toString() ?? "");
  const valid =
    unlimited || (Number.isInteger(Number(value)) && Number(value) > 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    try {
      await mutation.mutateAsync(unlimited ? null : Number(value));
      void toast.success(t("Límite actualizado"));
      onClose();
    } catch {
      void toast.error(t("No se pudo actualizar el límite"));
    }
  };
  return (
    <Dialog title={t("Configurar límite de agentes")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t(
            "Agentes y supervisores aceptados o pendientes utilizan un puesto.",
          )}
        </p>
        <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(event) => setUnlimited(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t("Capacidad ilimitada")}
        </label>
        {!unlimited && (
          <TextField
            label={t("Máximo de puestos")}
            value={value}
            onChange={setValue}
            type="number"
            min="1"
          />
        )}
        <Actions
          pending={mutation.isPending}
          disabled={!valid}
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function InviteDialog({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const mutation = useInvitePlatformOrganizationAgent(organizationId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      void toast.success(t("Invitación creada"));
      onClose();
    } catch {
      void toast.error(t("No se pudo invitar al agente"));
    }
  };
  return (
    <Dialog title={t("Invitar agente")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t(
            "La invitación quedará pendiente hasta que la persona inicie sesión con este correo.",
          )}
        </p>
        <TextField
          label={t("Nombre")}
          value={name}
          onChange={setName}
          autoFocus
        />
        <TextField
          label={t("Correo electrónico")}
          value={email}
          onChange={setEmail}
          type="email"
        />
        <Actions
          pending={mutation.isPending}
          disabled={!name.trim() || !email.trim()}
          submitLabel={t("Invitar")}
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function EditDialog({
  organizationId,
  agent,
  queues,
  onClose,
}: {
  organizationId: string;
  agent: PlatformOrganizationAgentRow;
  queues: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const mutation = useUpdatePlatformOrganizationAgent(organizationId);
  const [name, setName] = useState(agent.name);
  const [queueIds, setQueueIds] = useState<string[]>(agent.queue_ids ?? []);
  const accepted = agent.invitation_status === "accepted";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync({
        id: agent.id,
        name: name.trim(),
        routingQueueIds: accepted ? queueIds : [],
      });
      void toast.success(t("Agente actualizado"));
      onClose();
    } catch {
      void toast.error(t("No se pudo actualizar el agente"));
    }
  };
  return (
    <Dialog title={t("Editar agente")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <TextField
          label={t("Nombre")}
          value={name}
          onChange={setName}
          autoFocus
        />
        {accepted ? (
          <fieldset>
            <legend className="text-sm font-medium">
              {t("Colas asignadas")}
            </legend>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {queues.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  {t("No hay colas activas disponibles.")}
                </p>
              ) : (
                queues.map((queue) => (
                  <label
                    key={queue.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={queueIds.includes(queue.id)}
                      onChange={(event) =>
                        setQueueIds((ids) =>
                          event.target.checked
                            ? [...ids, queue.id]
                            : ids.filter((id) => id !== queue.id),
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">{queue.name}</span>
                  </label>
                ))
              )}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("Las colas se pueden asignar después de aceptar la invitación.")}
          </p>
        )}
        <Actions
          pending={mutation.isPending}
          disabled={!name.trim()}
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function RemoveDialog({
  organizationId,
  agent,
  onClose,
}: {
  organizationId: string;
  agent: PlatformOrganizationAgentRow;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const mutation = useRemovePlatformOrganizationAgent(organizationId);
  const pending = agent.invitation_status === "pending";
  const remove = async () => {
    try {
      await mutation.mutateAsync(agent.id);
      void toast.success(
        pending ? t("Invitación cancelada") : t("Agente eliminado"),
      );
      onClose();
    } catch {
      void toast.error(
        pending
          ? t("No se pudo cancelar la invitación")
          : t("No se pudo eliminar el agente"),
      );
    }
  };
  return (
    <Dialog
      title={pending ? t("Cancelar invitación") : t("Eliminar agente")}
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground">
        {pending
          ? t("La invitación pendiente se eliminará y liberará un puesto.")
          : t(
              "Se eliminará la membresía del agente. Su historial de conversaciones y mensajes se conservará.",
            )}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          disabled={mutation.isPending}
          onClick={() => void remove()}
        >
          {mutation.isPending
            ? t("Guardando…")
            : pending
              ? t("Cancelar invitación")
              : t("Eliminar")}
        </button>
      </div>
    </Dialog>
  );
}

function QueueNames({ agent }: { agent: PlatformOrganizationAgentRow }) {
  const { translate: t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {(agent.queue_names ?? []).length === 0 ? (
        <span className="text-muted-foreground">{t("Sin colas")}</span>
      ) : (
        (agent.queue_names ?? []).map((queue) => (
          <span
            key={`${agent.id}-${queue}`}
            className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
          >
            {queue}
          </span>
        ))
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { translate: t } = useTranslation();
  const pending = status === "pending";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${pending ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}
    >
      {pending ? t("Pendiente") : t("Aceptado")}
    </span>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { translate: t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 hover:bg-muted"
            onClick={onClose}
            aria-label={t("Cerrar")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoFocus = false,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoFocus?: boolean;
  min?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        autoFocus={autoFocus}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
      />
    </label>
  );
}

function Actions({
  pending,
  disabled,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  disabled: boolean;
  submitLabel?: string;
  onCancel: () => void;
}) {
  const { translate: t } = useTranslation();
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
        disabled={pending}
        onClick={onCancel}
      >
        {t("Cancelar")}
      </button>
      <button
        type="submit"
        className="primary px-4 py-2 text-sm disabled:opacity-50"
        disabled={pending || disabled}
      >
        {pending ? t("Guardando…") : (submitLabel ?? t("Guardar"))}
      </button>
    </div>
  );
}

function State({ title }: { title: string }) {
  return (
    <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}
