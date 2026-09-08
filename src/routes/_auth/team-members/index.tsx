import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import CampaignFilterSelect from "@/components/campaigns/CampaignFilterSelect";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import { queryKeys } from "@/queries/queryKeys";
import {
  useCreateAgent,
  useCurrentAgent,
  useDeleteAgent,
} from "@/queries/useAgents";
import {
  type TeamMemberListRow,
  useMembersPage,
  useUpdateTeamMember,
} from "@/queries/useMembers";
import { useCurrentOrganization } from "@/queries/useOrganizations";
import useBoundStore from "@/stores/useBoundStore";
import { DEFAULT_DATA_TABLE_PAGE_SIZE } from "@/utils/DataTableUtils";
import {
  getInvitableTeamMemberRoles,
  getTeamMemberPermissions,
  type TeamMemberRole,
  type TeamMemberStatus,
} from "@/utils/TeamMembersUtils";

export const Route = createFileRoute("/_auth/team-members/")({
  component: TeamMembersWorkspace,
});

type RoleFilter = "all" | TeamMemberRole;
type StatusFilter = "all" | TeamMemberStatus;

function TeamMembersWorkspace() {
  const { translate: t } = useTranslation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_DATA_TABLE_PAGE_SIZE);
  const [dialog, setDialog] = useState<
    | { type: "invite" }
    | { type: "edit"; member: TeamMemberListRow }
    | { type: "remove"; member: TeamMemberListRow }
    | null
  >(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: currentMember } = useCurrentAgent();
  const currentRole = (currentMember?.extra?.role ||
    null) as TeamMemberRole | null;
  const invitableRoles = getInvitableTeamMemberRoles(currentRole);
  const canInvite = invitableRoles.length > 0;
  const { data, isLoading, isError } = useMembersPage({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  useEffect(() => setPage(1), [search, roleFilter, statusFilter]);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const hasFilters =
    !!search.trim() || roleFilter !== "all" || statusFilter !== "all";

  return (
    <div className="h-full min-w-0 overflow-y-auto bg-background text-foreground p-[16px] md:p-[28px]">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-[22px] flex flex-col gap-[16px] sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[24px] font-semibold">
              {t("Miembros del equipo")}
            </h1>
            <p className="mt-[4px] text-[13px] text-muted-foreground">
              {t("Administrá quién puede acceder a esta organización.")}
            </p>
          </div>
          <button
            type="button"
            className="primary flex items-center justify-center gap-[8px] px-[18px] py-[10px] sm:ml-auto disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canInvite}
            onClick={() => setDialog({ type: "invite" })}
          >
            <Plus className="h-[17px] w-[17px]" />
            {t("Invitar miembro")}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-col gap-[10px] border-b border-border p-[14px] lg:flex-row">
            <label className="flex h-[40px] items-center gap-[9px] rounded-lg border border-input px-[12px] lg:max-w-[360px] lg:flex-1">
              <Search className="h-[16px] w-[16px] text-muted-foreground" />
              <input
                className="w-full border-none bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar por nombre o correo")}
              />
            </label>
            <CampaignFilterSelect
              ariaLabel={t("Todos los roles")}
              className="lg:w-[200px]"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: "all", label: t("Todos los roles") },
                { value: "agent", label: t("Agente") },
                { value: "owner", label: t("Propietario") },
                { value: "admin", label: t("Administrador") },
                { value: "supervisor", label: t("Supervisor") },
                { value: "member", label: t("Miembro") },
              ]}
            />
            <CampaignFilterSelect
              ariaLabel={t("Todos los estados")}
              className="lg:w-[200px]"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: t("Todos los estados") },
                { value: "active", label: t("Activo") },
                { value: "pending", label: t("Pendiente") },
                { value: "rejected", label: t("Rechazado") },
              ]}
            />
          </div>

          {isLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <Spinner />
            </div>
          ) : isError ? (
            <MembersEmptyState
              icon={<UserRoundX className="h-[24px] w-[24px]" />}
              title={t("No se pudieron cargar los miembros")}
              description={t("Intentá nuevamente en unos minutos.")}
            />
          ) : rows.length === 0 ? (
            <MembersEmptyState
              icon={<UsersRound className="h-[24px] w-[24px]" />}
              title={
                hasFilters
                  ? t("No hay miembros que coincidan con los filtros")
                  : t("Todavía no hay miembros")
              }
              description={
                hasFilters
                  ? t("Probá cambiando la búsqueda o los filtros.")
                  : t("Invitá al primer miembro de tu equipo.")
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[940px] text-left">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-[16px] py-[12px]">{t("Miembro")}</th>
                      <th className="px-[16px] py-[12px]">
                        {t("Correo electrónico")}
                      </th>
                      <th className="px-[16px] py-[12px]">{t("Rol")}</th>
                      <th className="px-[16px] py-[12px]">{t("Estado")}</th>
                      <th className="px-[16px] py-[12px]">{t("Agregado")}</th>
                      <th className="px-[16px] py-[12px] text-right">
                        {t("Acciones")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((member) => (
                      <MemberTableRow
                        key={member.id}
                        member={member}
                        currentMemberId={currentMember?.id}
                        currentRole={currentRole}
                        onEdit={() => setDialog({ type: "edit", member })}
                        onRemove={() => setDialog({ type: "remove", member })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border lg:hidden">
                {rows.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    currentMemberId={currentMember?.id}
                    currentRole={currentRole}
                    onEdit={() => setDialog({ type: "edit", member })}
                    onRemove={() => setDialog({ type: "remove", member })}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col justify-between gap-[10px] border-t border-border px-[14px] py-[12px] text-[12px] text-muted-foreground sm:flex-row sm:items-center">
            <span>
              {total} {t("miembros")}
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

      {dialog?.type === "invite" && (
        <InviteMemberDialog
          allowedRoles={invitableRoles}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "edit" && (
        <EditMemberDialog
          member={dialog.member}
          currentMemberId={currentMember?.id}
          currentRole={currentRole}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "remove" && (
        <RemoveMemberDialog
          member={dialog.member}
          currentMemberId={currentMember?.id}
          currentRole={currentRole}
          onClose={() => setDialog(null)}
          onRemoved={() => {
            if (rows.length === 1 && page > 1) setPage(page - 1);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function MemberTableRow({
  member,
  currentMemberId,
  currentRole,
  onEdit,
  onRemove,
}: MemberRowProps) {
  const { translate: t } = useTranslation();
  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-[16px] py-[14px]">
        <MemberIdentity member={member} currentMemberId={currentMemberId} />
      </td>
      <td className="px-[16px] py-[14px] text-[12px] text-muted-foreground">
        {member.email || t("Sin correo")}
      </td>
      <td className="px-[16px] py-[14px] text-[12px]">
        {getRoleLabel(member.role, t)}
      </td>
      <td className="px-[16px] py-[14px]">
        <MemberStatusBadge status={member.status as TeamMemberStatus} />
      </td>
      <td className="px-[16px] py-[14px] text-[12px] text-muted-foreground">
        {formatAddedAt(member.created_at)}
      </td>
      <td className="px-[16px] py-[14px]">
        <MemberActions
          member={member}
          currentMemberId={currentMemberId}
          currentRole={currentRole}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </td>
    </tr>
  );
}

type MemberRowProps = {
  member: TeamMemberListRow;
  currentMemberId?: string;
  currentRole: TeamMemberRole | null;
  onEdit: () => void;
  onRemove: () => void;
};

function MemberCard(props: MemberRowProps) {
  const { member, currentMemberId } = props;
  const { translate: t } = useTranslation();
  return (
    <article className="p-[16px]">
      <div className="flex items-start gap-[12px]">
        <MemberIdentity member={member} currentMemberId={currentMemberId} />
        <MemberStatusBadge status={member.status as TeamMemberStatus} />
      </div>
      <div className="mt-[16px] grid grid-cols-2 gap-[12px] text-[12px]">
        <div>
          <div className="text-muted-foreground">{t("Correo electrónico")}</div>
          <div className="mt-[3px] break-all">
            {member.email || t("Sin correo")}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">{t("Rol")}</div>
          <div className="mt-[3px]">{getRoleLabel(member.role, t)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t("Agregado")}</div>
          <div className="mt-[3px]">{formatAddedAt(member.created_at)}</div>
        </div>
      </div>
      <div className="mt-[16px]">
        <MemberActions {...props} />
      </div>
    </article>
  );
}

function MemberIdentity({
  member,
  currentMemberId,
}: {
  member: TeamMemberListRow;
  currentMemberId?: string;
}) {
  const { translate: t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-[10px]">
      <Avatar
        src={member.picture}
        fallback={member.name.slice(0, 2).toUpperCase()}
        size={36}
        className="shrink-0 bg-muted text-[12px] text-muted-foreground"
      />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">
          {member.name}
          {member.id === currentMemberId ? ` (${t("tú")})` : ""}
        </div>
        {member.is_last_owner && (
          <div className="mt-[2px] text-[11px] text-muted-foreground">
            {t("Último propietario")}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberActions({
  member,
  currentMemberId,
  currentRole,
  onEdit,
  onRemove,
}: MemberRowProps) {
  const { translate: t } = useTranslation();
  const permissions = getTeamMemberPermissions({
    currentMemberId,
    currentRole,
    memberId: member.id,
    memberRole: member.role,
    isLastOwner: member.is_last_owner,
  });

  if (!permissions.canEditName && !permissions.canRemove) {
    return (
      <div className="text-right text-[12px] text-muted-foreground">—</div>
    );
  }

  const removeLabel =
    member.status === "pending"
      ? t("Cancelar")
      : permissions.isSelf
        ? t("Salir")
        : t("Eliminar");

  return (
    <div className="flex justify-end gap-[8px]">
      {permissions.canEditName && (
        <button
          type="button"
          className="flex items-center gap-[6px] rounded-lg border border-border px-[10px] py-[7px] text-[12px] hover:bg-muted"
          onClick={onEdit}
        >
          <Pencil className="h-[13px] w-[13px]" />
          {t("Editar")}
        </button>
      )}
      {permissions.canShowRemove && (
        <button
          type="button"
          className="flex items-center gap-[6px] rounded-lg border border-destructive/50 px-[10px] py-[7px] text-[12px] text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!permissions.canRemove}
          title={
            !permissions.canRemove
              ? t("No se puede eliminar al único propietario")
              : undefined
          }
          onClick={onRemove}
        >
          {permissions.isSelf ? (
            <LogOut className="h-[13px] w-[13px]" />
          ) : (
            <Trash2 className="h-[13px] w-[13px]" />
          )}
          {removeLabel}
        </button>
      )}
    </div>
  );
}

function MemberStatusBadge({ status }: { status: TeamMemberStatus }) {
  const { translate: t } = useTranslation();
  const styles: Record<TeamMemberStatus, string> = {
    active: "bg-green-500/15 text-green-500",
    pending: "bg-amber-500/15 text-amber-500",
    rejected: "bg-destructive/15 text-destructive",
  };
  const labels: Record<TeamMemberStatus, string> = {
    active: t("Activo"),
    pending: t("Pendiente"),
    rejected: t("Rechazado"),
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-[9px] py-[4px] text-[11px] ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function InviteMemberDialog({
  allowedRoles,
  onClose,
}: {
  allowedRoles: TeamMemberRole[];
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const organizationId = useBoundStore((state) => state.ui.activeOrgId);
  const { data: organization } = useCurrentOrganization();
  const createMember = useCreateAgent();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMemberRole>("member");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    createMember.mutate(
      {
        organization_id: organizationId!,
        name: name.trim(),
        ai: false,
        extra: {
          role,
          invitation: {
            organization_name: organization?.name || "",
            email: email.trim().toLowerCase(),
            status: "pending",
          },
        },
      },
      {
        onSuccess: onClose,
        onError: (cause) => setError(getMutationError(cause, t)),
      },
    );
  };

  return (
    <Dialog title={t("Invitar miembro")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-[16px]">
        <p className="text-[13px] text-muted-foreground">
          {t(
            "La invitación aparecerá cuando la persona inicie sesión con este correo.",
          )}
        </p>
        <TextField
          label={t("Nombre")}
          value={name}
          onChange={setName}
          required
        />
        <TextField
          label={t("Correo electrónico")}
          value={email}
          onChange={setEmail}
          type="email"
          required
        />
        <RoleField role={role} onChange={setRole} roles={allowedRoles} />
        {error && <DialogError>{error}</DialogError>}
        <DialogActions
          cancelLabel={t("Cancelar")}
          submitLabel={t("Invitar")}
          pending={createMember.isPending}
          disabled={!name.trim() || !email.trim()}
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function EditMemberDialog({
  member,
  currentMemberId,
  currentRole,
  onClose,
}: {
  member: TeamMemberListRow;
  currentMemberId?: string;
  currentRole: TeamMemberRole | null;
  onClose: () => void;
}) {
  const { translate: t } = useTranslation();
  const updateMember = useUpdateTeamMember();
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState<TeamMemberRole>(member.role);
  const [error, setError] = useState("");
  const permissions = getTeamMemberPermissions({
    currentMemberId,
    currentRole,
    memberId: member.id,
    memberRole: member.role,
    isLastOwner: member.is_last_owner,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    updateMember.mutate(
      {
        id: member.id,
        name: name.trim(),
        role: permissions.canEditRole ? role : undefined,
      },
      {
        onSuccess: onClose,
        onError: (cause) => setError(getMutationError(cause, t)),
      },
    );
  };

  return (
    <Dialog title={t("Editar miembro")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-[16px]">
        <TextField
          label={t("Nombre")}
          value={name}
          onChange={setName}
          required
        />
        <TextField
          label={t("Correo electrónico")}
          value={member.email || ""}
          onChange={() => undefined}
          type="email"
          disabled
        />
        <RoleField
          role={role}
          onChange={setRole}
          disabled={!permissions.canEditRole}
        />
        {member.is_last_owner && (
          <p className="text-[12px] text-amber-500">
            {t("Asigná otro propietario antes de cambiar este rol.")}
          </p>
        )}
        {error && <DialogError>{error}</DialogError>}
        <DialogActions
          cancelLabel={t("Cancelar")}
          submitLabel={t("Guardar cambios")}
          pending={updateMember.isPending}
          disabled={
            !name.trim() || (name === member.name && role === member.role)
          }
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}

function RemoveMemberDialog({
  member,
  currentMemberId,
  currentRole,
  onClose,
  onRemoved,
}: {
  member: TeamMemberListRow;
  currentMemberId?: string;
  currentRole: TeamMemberRole | null;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const { translate: t } = useTranslation();
  const deleteMember = useDeleteAgent();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const [error, setError] = useState("");
  const permissions = getTeamMemberPermissions({
    currentMemberId,
    currentRole,
    memberId: member.id,
    memberRole: member.role,
    isLastOwner: member.is_last_owner,
  });
  const isPending = member.status === "pending";
  const title = isPending
    ? t("Cancelar invitación")
    : permissions.isSelf
      ? t("Salir de la organización")
      : t("Eliminar miembro");

  const remove = () => {
    setError("");
    deleteMember.mutate(member.id, {
      onSuccess: () => {
        onRemoved();
        if (permissions.isSelf) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.organizations.all(),
          });
          setActiveOrg(null);
          void navigate({ to: "/conversations" });
        }
      },
      onError: (cause) => setError(getMutationError(cause, t)),
    });
  };

  return (
    <Dialog title={title} onClose={onClose}>
      <p className="text-[14px] text-muted-foreground">
        {isPending
          ? t("¿Querés cancelar la invitación de {{name}}?").replace(
              "{{name}}",
              member.name,
            )
          : permissions.isSelf
            ? t(
                "¿Querés salir de esta organización? Perderás el acceso inmediatamente.",
              )
            : t("¿Querés eliminar a {{name}} de esta organización?").replace(
                "{{name}}",
                member.name,
              )}
      </p>
      <p className="mt-[10px] text-[12px] text-muted-foreground">
        {t("La cuenta de autenticación de la persona no será eliminada.")}
      </p>
      {error && (
        <div className="mt-[16px]">
          <DialogError>{error}</DialogError>
        </div>
      )}
      <div className="mt-[22px] flex justify-end gap-[10px]">
        <button
          type="button"
          className="rounded-lg border border-border px-[16px] py-[9px] text-[13px] hover:bg-muted"
          onClick={onClose}
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          className="flex items-center gap-[8px] rounded-lg bg-destructive px-[16px] py-[9px] text-[13px] text-destructive-foreground disabled:opacity-50"
          disabled={deleteMember.isPending}
          onClick={remove}
        >
          {deleteMember.isPending && <Spinner />}
          {title}
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-[16px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[520px] rounded-xl border border-border bg-background p-[20px] text-foreground shadow-2xl"
      >
        <div className="mb-[18px] flex items-center gap-[12px]">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button
            type="button"
            className="ml-auto rounded-lg p-[7px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-[6px] block text-[12px] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        className="h-[42px] w-full rounded-lg border border-input bg-background px-[12px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function RoleField({
  role,
  onChange,
  roles = ["agent", "member", "supervisor", "admin", "owner"],
  disabled = false,
}: {
  role: TeamMemberRole;
  onChange: (role: TeamMemberRole) => void;
  roles?: TeamMemberRole[];
  disabled?: boolean;
}) {
  const { translate: t } = useTranslation();
  const labels: Record<TeamMemberRole, string> = {
    agent: t("Agente"),
    member: t("Miembro"),
    supervisor: t("Supervisor"),
    admin: t("Administrador"),
    owner: t("Propietario"),
  };
  return (
    <label className="block">
      <span className="mb-[6px] block text-[12px] text-muted-foreground">
        {t("Rol")}
      </span>
      <CampaignFilterSelect
        ariaLabel={t("Rol")}
        value={role}
        onChange={onChange}
        disabled={disabled}
        options={roles.map((value) => ({ value, label: labels[value] }))}
      />
    </label>
  );
}

function DialogActions({
  cancelLabel,
  submitLabel,
  pending,
  disabled,
  onCancel,
}: {
  cancelLabel: string;
  submitLabel: string;
  pending: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-[10px] pt-[6px]">
      <button
        type="button"
        className="rounded-lg border border-border px-[16px] py-[9px] text-[13px] hover:bg-muted"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className="primary flex items-center gap-[8px] px-[16px] py-[9px] text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || pending}
      >
        {pending && <Spinner />}
        {submitLabel}
      </button>
    </div>
  );
}

function DialogError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-[12px] py-[10px] text-[12px] text-destructive">
      {children}
    </div>
  );
}

function MembersEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center px-[20px] text-center">
      <div className="mb-[12px] rounded-full bg-muted p-[12px] text-muted-foreground">
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-[5px] text-[13px] text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

function getRoleLabel(role: TeamMemberRole, t: (value: string) => string) {
  return {
    agent: t("Agente"),
    owner: t("Propietario"),
    admin: t("Administrador"),
    supervisor: t("Supervisor"),
    member: t("Miembro"),
  }[role];
}

function formatAddedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function getMutationError(error: unknown, t: (value: string) => string) {
  const message = error instanceof Error ? error.message : String(error);
  if (/duplicate|unique/i.test(message)) {
    return t("Ya existe un miembro o una invitación para este correo.");
  }
  if (/last owner|único propietario/i.test(message)) {
    return t("Asigná otro propietario antes de realizar esta acción.");
  }
  return message || t("No se pudo completar la acción.");
}
