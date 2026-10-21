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
  usePlatformOrganizationAgentCapacity,
  usePlatformRoutingQueuesPage,
  useUpdatePlatformOrganizationAgentCapacity,
} from "@/queries/usePlatformOrganizationManagement";
import {
  type PlatformOrganizationMemberRow as PlatformOrganizationAgentRow,
  usePlatformOrganizationMembersPage,
  usePlatformMemberMutation,
} from "@/queries/usePlatformTeamMembers";
import {
  canManagePlatformMember,
  platformMemberRoleLabel,
  PLATFORM_MEMBER_ROLES,
  platformMemberError,
  type PlatformMemberRole,
} from "@/utils/PlatformTeamMemberUtils";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import { usePlatformTenantSummary } from "@/queries/usePlatformAdmin";
import AccountSetupFields, {
  useAccountSetupFields,
} from "./AccountSetupFields";
import {
  accountOnboardingRequest,
  useAccountOnboarding,
} from "@/queries/useAccountOnboarding";
import {
  accountSetupError,
  accountSetupLabel,
  type AccountSetupStatus,
} from "@/utils/AccountOnboardingUtils";

type DialogState =
  | { type: "capacity" }
  | { type: "invite" }
  | { type: "setup"; agent: PlatformOrganizationAgentRow }
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
  const agents = usePlatformOrganizationMembersPage(organizationId, {
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
          <h2 className="text-xl font-semibold">{t("Miembros del equipo")}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t(
              "Administrá las membresías, roles y acceso a colas de esta organización.",
            )}
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
            disabled={capacity.isPending}
            onClick={() => setDialog({ type: "invite" })}
          >
            <Plus className="h-4 w-4" />
            {t("Agregar miembro")}
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
          placeholder={t("Buscar miembro por nombre o correo")}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {agents.isPending ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : agents.isError ? (
          <State title={t("No se pudieron cargar los miembros")} />
        ) : rows.length === 0 ? (
          <State title={t("No se encontraron miembros")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("Miembro")}</th>
                  <th className="px-4 py-3">{t("Rol")}</th>
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
                    <td className="px-4 py-4">
                      {t(platformMemberRoleLabel(agent.role))}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {agent.email || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={agent.invitation_status} />
                      {agent.setup && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t(accountSetupLabel(agent.setup))}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {agent.invitation_status === "pending" &&
                      agent.role === "agent" ? (
                        <span className="text-muted-foreground">
                          {t("Disponible después de aceptar")}
                        </span>
                      ) : (
                        <QueueNames agent={agent} />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {!canManagePlatformMember(agent.role) ? (
                          <span className="text-xs text-muted-foreground">
                            {t("Solo lectura")}
                          </span>
                        ) : (
                          <>
                            {agent.invitation_status === "pending" &&
                              (!agent.user_id ||
                                (agent.setup &&
                                  !["completed", "revoked"].includes(
                                    agent.setup.status,
                                  ))) && (
                                <button
                                  type="button"
                                  className="rounded-lg border border-border px-2 text-xs hover:bg-muted"
                                  onClick={() =>
                                    setDialog({ type: "setup", agent })
                                  }
                                >
                                  {t("Configurar acceso")}
                                </button>
                              )}
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
                                  : t("Quitar acceso a la organización")
                              }
                              onClick={() =>
                                setDialog({ type: "remove", agent })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
          onClose={() =>
            setDialog((current) => (current === dialog ? null : current))
          }
        />
      )}
      {dialog?.type === "invite" && (
        <InviteDialog
          organizationId={organizationId}
          onClose={() =>
            setDialog((current) => (current === dialog ? null : current))
          }
        />
      )}
      {dialog?.type === "setup" && (
        <SetupDialog
          key={dialog.agent.id}
          organizationId={organizationId}
          agent={dialog.agent}
          onClose={() =>
            setDialog((current) => (current === dialog ? null : current))
          }
        />
      )}
      {dialog?.type === "edit" && (
        <EditDialog
          organizationId={organizationId}
          agent={dialog.agent}
          queues={queueOptions}
          onClose={() =>
            setDialog((current) => (current === dialog ? null : current))
          }
        />
      )}
      {dialog?.type === "remove" && (
        <RemoveDialog
          organizationId={organizationId}
          agent={dialog.agent}
          onClose={() =>
            setDialog((current) => (current === dialog ? null : current))
          }
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

function RoleField({
  role,
  onChange,
}: {
  role: PlatformMemberRole;
  onChange: (role: PlatformMemberRole) => void;
}) {
  const { translate: t } = useTranslation();
  return (
    <label className="block text-sm font-medium">
      {t("Rol")}
      <select
        aria-label={t("Rol")}
        className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground"
        value={role}
        onChange={(event) => onChange(event.target.value as PlatformMemberRole)}
      >
        {PLATFORM_MEMBER_ROLES.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>
    </label>
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
  const mutation = usePlatformMemberMutation(organizationId);
  const onboarding = useAccountOnboarding(organizationId);
  const organization = usePlatformTenantSummary(organizationId);
  const fields = useAccountSetupFields();
  const [requestId] = useState(() => crypto.randomUUID());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PlatformMemberRole>("agent");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      fields.mode === "direct" &&
      (!fields.confirmed || fields.password !== fields.confirmation)
    )
      return;
    try {
      if (fields.mode === "pending")
        await mutation.mutateAsync({
          action: "invite",
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        });
      else
        await onboarding.mutateAsync(() =>
          accountOnboardingRequest<AccountSetupStatus>({
            action: "create",
            organization_id: organizationId,
            request_id: requestId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role,
            mode: fields.mode,
            ...(fields.mode === "direct"
              ? { password: fields.password, confirmed: fields.confirmed }
              : {}),
          }),
        );
      fields.setPassword("");
      fields.setConfirmation("");
      void toast.success(
        t(
          fields.mode === "pending"
            ? "Membresía pendiente creada"
            : fields.mode === "direct"
              ? "Acceso configurado"
              : "Invitación enviada",
        ),
      );
      onClose();
    } catch (error) {
      void toast.error(
        t(
          fields.mode === "pending"
            ? platformMemberError(error)
            : accountSetupError((error as Error).message),
        ),
      );
    }
  };
  return (
    <Dialog title={t("Agregar miembro")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {organization.data?.organization_name} · {email} ·{" "}
          {t(platformMemberRoleLabel(role))}
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
        <RoleField role={role} onChange={setRole} />
        <AccountSetupFields
          fields={fields}
          pending={mutation.isPending || onboarding.isPending}
        />
        {onboarding.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t(accountSetupError(onboarding.error.message))}{" "}
            {t(
              "Si la cuenta ya se creó, usá Configurar acceso en la membresía para reintentar.",
            )}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t(platformMemberError(mutation.error))}
          </p>
        )}
        <Actions
          pending={mutation.isPending || onboarding.isPending}
          disabled={
            !name.trim() ||
            !email.trim() ||
            (fields.mode === "direct" &&
              (!fields.confirmed ||
                !fields.password ||
                fields.password !== fields.confirmation))
          }
          submitLabel={t(
            fields.mode === "pending"
              ? "Crear membresía pendiente"
              : fields.mode === "direct"
                ? "Crear cuenta"
                : "Enviar invitación por correo",
          )}
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function SetupDialog({
  organizationId,
  agent,
  onClose,
}: {
  organizationId: string;
  agent: PlatformOrganizationAgentRow;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const fields = useAccountSetupFields();
  const mutation = useAccountOnboarding(organizationId);
  const organization = usePlatformTenantSummary(organizationId);
  const [requestId] = useState(() => crypto.randomUUID());
  const [deliveryId, setDeliveryId] = useState(() => crypto.randomUUID());
  const [setup, setSetup] = useState(agent.setup);
  const run = async (action: "retry" | "resend" | "status") => {
    try {
      const result = await mutation.mutateAsync(() =>
        accountOnboardingRequest<AccountSetupStatus>(
          setup
            ? {
                action,
                operation_id: setup.operation_id,
                organization_id: organizationId,
                ...(action === "resend"
                  ? { delivery_request_id: deliveryId }
                  : {}),
                ...(action === "retry" && setup.mode === "direct"
                  ? { password: fields.password }
                  : {}),
              }
            : {
                action: "create",
                organization_id: organizationId,
                member_id: agent.id,
                expected_updated_at: agent.updated_at,
                request_id: requestId,
                name: agent.name,
                email: agent.email,
                role: agent.role,
                mode: fields.mode,
                ...(fields.mode === "direct"
                  ? { password: fields.password, confirmed: fields.confirmed }
                  : {}),
              },
        ),
      );
      setSetup(result);
      if (action === "resend" && result.invitation_sent_at)
        setDeliveryId(crypto.randomUUID());
      if (result.status === "completed") {
        fields.setPassword("");
        onClose();
      }
    } catch {
      /* The mutation exposes only a safe error code. */
    }
  };
  return (
    <Dialog title={t("Configurar acceso")} onClose={onClose}>
      <p className="mb-3 text-xs text-muted-foreground">
        {organization.data?.organization_name}
      </p>
      <p className="mb-3 text-sm">
        {agent.name} · {agent.email} · {t(platformMemberRoleLabel(agent.role))}
      </p>
      {setup ? (
        <>
          <p className="mb-3 text-sm" role="status">
            {t(accountSetupLabel(setup))}
          </p>
          {setup.mode === "direct" && (
            <label className="block text-sm">
              {t("Contraseña")}
              <input
                type="password"
                autoComplete="new-password"
                value={fields.password}
                onChange={(e) => fields.setPassword(e.target.value)}
                className="mt-2 h-10 w-full rounded border border-input bg-background px-3"
              />
            </label>
          )}
        </>
      ) : (
        <AccountSetupFields fields={fields} pending={mutation.isPending} />
      )}
      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t(accountSetupError(mutation.error.message))}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {setup && (
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => void run("status")}
            className="rounded border px-3 py-2 text-sm"
          >
            {t("Consultar estado")}
          </button>
        )}
        {setup?.mode === "invitation" && (
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => void run("resend")}
            className="rounded border px-3 py-2 text-sm"
          >
            {t("Reenviar invitación")}
          </button>
        )}
        <button
          type="button"
          disabled={
            mutation.isPending ||
            (!setup &&
              (fields.mode === "pending" ||
                (fields.mode === "direct" &&
                  (!fields.confirmed ||
                    !fields.password ||
                    fields.password !== fields.confirmation))))
          }
          onClick={() => void run("retry")}
          className="primary px-3 py-2 text-sm"
        >
          {t(
            mutation.isPending
              ? "Guardando…"
              : setup
                ? "Reintentar"
                : "Configurar acceso",
          )}
        </button>
      </div>
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
  const mutation = usePlatformMemberMutation(organizationId);
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState<PlatformMemberRole>(agent.role);
  const [confirmedRoleChange, setConfirmedRoleChange] = useState(false);
  const [queueIds, setQueueIds] = useState<string[]>(agent.queue_ids ?? []);
  const accepted = agent.invitation_status === "accepted";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (role !== agent.role && !confirmedRoleChange) return;
    try {
      await mutation.mutateAsync({
        action: "update",
        member: agent,
        name: name.trim(),
        role,
        queueIds: accepted && role === "agent" ? queueIds : [],
      });
      void toast.success(t("Membresía actualizada"));
      onClose();
    } catch (error) {
      void toast.error(t(platformMemberError(error)));
    }
  };
  return (
    <Dialog title={t("Editar miembro")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <TextField
          label={t("Nombre")}
          value={name}
          onChange={setName}
          autoFocus
        />
        <label className="block text-sm font-medium">
          {t("Correo electrónico")}
          <input
            readOnly
            value={agent.email || ""}
            className="mt-2 h-10 w-full rounded-lg border border-input bg-muted px-3 text-muted-foreground"
          />
        </label>
        <RoleField
          role={role}
          onChange={(value) => {
            setRole(value);
            setConfirmedRoleChange(false);
          }}
        />
        {role !== agent.role && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmedRoleChange}
              onChange={(event) => setConfirmedRoleChange(event.target.checked)}
            />
            {t(
              "Confirmo el cambio de rol. Cambiará los permisos y restablecerá la disponibilidad a Ausente.",
            )}
          </label>
        )}
        {accepted && role === "agent" ? (
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
            {t(
              "Solo los agentes aceptados pueden pertenecer a colas activas de esta organización.",
            )}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t(platformMemberError(mutation.error))}
          </p>
        )}
        <Actions
          pending={mutation.isPending}
          disabled={
            !name.trim() || (role !== agent.role && !confirmedRoleChange)
          }
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
  const mutation = usePlatformMemberMutation(organizationId);
  const pending = agent.invitation_status === "pending";
  const remove = async () => {
    try {
      await mutation.mutateAsync({ action: "remove", member: agent });
      void toast.success(
        t(
          pending
            ? "Invitación cancelada"
            : "Acceso a la organización eliminado",
        ),
      );
      onClose();
    } catch (error) {
      void toast.error(t(platformMemberError(error)));
    }
  };
  return (
    <Dialog
      title={t(
        pending ? "Cancelar invitación" : "Quitar acceso a la organización",
      )}
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground">
        {t(
          "Se quitará solo esta membresía. La cuenta de acceso, otras organizaciones y el historial se conservan.",
        )}
      </p>
      <p className="mt-3 text-sm font-medium">
        {agent.name} · {agent.email} · {t(platformMemberRoleLabel(agent.role))}
      </p>
      {mutation.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t(platformMemberError(mutation.error))}
        </p>
      )}
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
          {t(
            mutation.isPending
              ? "Guardando…"
              : pending
                ? "Cancelar invitación"
                : "Quitar acceso a la organización",
          )}
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
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl">
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
