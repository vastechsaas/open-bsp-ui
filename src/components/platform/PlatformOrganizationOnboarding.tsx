import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { message as toast } from "antd";
import {
  Building2,
  CheckCircle2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import DataTablePagination from "@/components/DataTablePagination";
import Spinner from "@/components/Spinner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type OrganizationProvisioningStatus,
  usePlatformOrganizationProvisioning,
  useProvisionPlatformOrganization,
  useRetryPlatformOrganizationProvisioning,
} from "@/queries/usePlatformOrganizationProvisioning";
import {
  buildOrganizationProvisioningPayload,
  createOrganizationProvisioningDraft,
  createOrganizationProvisioningMember,
  getOrganizationProvisioningFingerprint,
  ORGANIZATION_PROVISIONING_ROLES,
  type OrganizationProvisioningDraft,
  type OrganizationProvisioningMember,
  validateOrganizationProvisioningDraft,
} from "@/utils/OrganizationProvisioningUtils";

type ProvisioningResult = {
  organization_id: string | null;
  organization_name: string;
};

export default function PlatformOrganizationOnboarding() {
  const { translate: t } = useTranslation();
  const [draft, setDraft] = useState(createOrganizationProvisioningDraft);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const requestRef = useRef<{ id: string; fingerprint: string } | null>(null);
  const provision = useProvisionPlatformOrganization();

  const updateDraft = <Key extends keyof OrganizationProvisioningDraft>(
    key: Key,
    value: OrganizationProvisioningDraft[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const addMember = () => {
    if (draft.members.length >= 50) return;
    updateDraft("members", [
      ...draft.members,
      createOrganizationProvisioningMember(),
    ]);
  };

  const updateMember = (
    memberId: string,
    updates: Partial<OrganizationProvisioningMember>,
  ) =>
    updateDraft(
      "members",
      draft.members.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateOrganizationProvisioningDraft(draft);
    setFormErrors(errors);
    if (errors.length > 0) {
      toast.error(t("Revisá los datos de incorporación antes de continuar"));
      return;
    }

    const candidate = buildOrganizationProvisioningPayload(
      draft,
      "00000000-0000-4000-8000-000000000000",
    );
    const fingerprint = getOrganizationProvisioningFingerprint(candidate);
    const requestId =
      requestRef.current?.fingerprint === fingerprint
        ? requestRef.current.id
        : crypto.randomUUID();
    requestRef.current = { id: requestId, fingerprint };

    provision.mutate(buildOrganizationProvisioningPayload(draft, requestId), {
      onSuccess: (data) => {
        setResult({
          organization_id: data.organization_id,
          organization_name: data.organization_name,
        });
        setDraft(createOrganizationProvisioningDraft());
        setFormErrors([]);
        requestRef.current = null;
        toast.success(t("Organización incorporada e invitaciones enviadas"));
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 p-4 sm:p-6 lg:p-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">
            {t("Incorporar organización")}
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
            {t(
              "Creá el tenant, configurá sus límites e invitá al propietario y al equipo inicial desde un solo lugar.",
            )}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
          <UserPlus className="h-4 w-4" />
          {t("Solo Super Admin")}
        </div>
      </header>

      {result && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm sm:flex-row sm:items-center">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {result.organization_name}
            </p>
            <p className="text-muted-foreground">
              {t("El tenant está listo y las invitaciones fueron solicitadas.")}
            </p>
          </div>
          {result.organization_id && (
            <Link
              to="/platform/$organizationId"
              params={{ organizationId: result.organization_id }}
              className="rounded-lg border border-emerald-600/30 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              {t("Abrir organización")}
            </Link>
          )}
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => setResult(null)}
          >
            {t("Cerrar")}
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.82fr)]">
        <form
          className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
          onSubmit={submit}
        >
          <FormSection
            icon={<Building2 />}
            title={t("Organización y propietario")}
            description={t(
              "El propietario recibirá una invitación por correo electrónico.",
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Nombre de la organización")} wide>
                <input
                  className="text"
                  maxLength={250}
                  value={draft.organizationName}
                  onChange={(event) =>
                    updateDraft("organizationName", event.target.value)
                  }
                  aria-invalid={formErrors.includes("organization_name")}
                  required
                />
              </Field>
              <Field label={t("Nombre del propietario")}>
                <input
                  className="text"
                  maxLength={120}
                  value={draft.ownerName}
                  onChange={(event) =>
                    updateDraft("ownerName", event.target.value)
                  }
                  aria-invalid={formErrors.includes("owner_name")}
                  required
                />
              </Field>
              <Field label={t("Correo del propietario")}>
                <input
                  className="text"
                  type="email"
                  maxLength={320}
                  value={draft.ownerEmail}
                  onChange={(event) =>
                    updateDraft("ownerEmail", event.target.value)
                  }
                  aria-invalid={formErrors.includes("owner_email")}
                  required
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            icon={<UserPlus />}
            title={t("Equipo inicial")}
            description={t(
              "Agregá administradores, supervisores, miembros o agentes. También podés hacerlo después.",
            )}
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                onClick={addMember}
                disabled={draft.members.length >= 50}
              >
                <Plus className="h-4 w-4" />
                {t("Agregar persona")}
              </button>
            }
          >
            {draft.members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                {t("No hay integrantes adicionales todavía.")}
              </div>
            ) : (
              <div className="space-y-3">
                {draft.members.map((member, index) => (
                  <div
                    key={member.id}
                    className="grid gap-3 rounded-xl border border-border bg-background/50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_160px_40px] sm:items-end"
                  >
                    <Field label={`${t("Nombre")} ${index + 1}`}>
                      <input
                        className="text"
                        maxLength={120}
                        value={member.name}
                        onChange={(event) =>
                          updateMember(member.id, { name: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field label={t("Correo electrónico")}>
                      <input
                        className="text"
                        type="email"
                        maxLength={320}
                        value={member.email}
                        onChange={(event) =>
                          updateMember(member.id, { email: event.target.value })
                        }
                        required
                      />
                    </Field>
                    <Field label={t("Rol")}>
                      <select
                        className="text"
                        value={member.role}
                        onChange={(event) =>
                          updateMember(member.id, {
                            role: event.target
                              .value as OrganizationProvisioningMember["role"],
                          })
                        }
                      >
                        {ORGANIZATION_PROVISIONING_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {t(role.label)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
                      aria-label={t("Quitar persona")}
                      onClick={() =>
                        updateDraft(
                          "members",
                          draft.members.filter((item) => item.id !== member.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection
            icon={<RefreshCw />}
            title={t("Configuración inicial")}
            description={t(
              "Estos valores pueden ajustarse más adelante desde la administración del tenant.",
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("Capacidad de agentes")}
                hint={t("Dejá vacío para no establecer un límite.")}
              >
                <input
                  className="text"
                  type="number"
                  min={1}
                  step={1}
                  value={draft.maxAgentSeats}
                  onChange={(event) =>
                    updateDraft("maxAgentSeats", event.target.value)
                  }
                  aria-invalid={
                    formErrors.includes("agent_capacity") ||
                    formErrors.includes("agent_capacity_exceeded")
                  }
                />
              </Field>
              <Field label={t("Cuota de almacenamiento")}>
                <select
                  className="text"
                  value={draft.storageQuotaGb}
                  onChange={(event) =>
                    updateDraft(
                      "storageQuotaGb",
                      Number(event.target.value) as 25 | 50 | 75 | 100,
                    )
                  }
                >
                  {[25, 50, 75, 100].map((quota) => (
                    <option key={quota} value={quota}>
                      {quota} GB
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={draft.autoAssign}
                onChange={(event) =>
                  updateDraft("autoAssign", event.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-medium">
                  {t("Activar asignación automática")}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t(
                    "Las conversaciones usarán las reglas de asignación configuradas para la organización.",
                  )}
                </span>
              </span>
            </label>
          </FormSection>

          {formErrors.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {t(
                "Hay datos incompletos, correos duplicados o la capacidad es menor que el equipo inicial.",
              )}
            </div>
          )}
          {provision.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {provision.error.message}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              {t(
                "La organización se crea una sola vez. Si una invitación falla, podés reintentar la misma solicitud desde el historial.",
              )}
            </p>
            <button
              type="submit"
              className="inline-flex min-w-48 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={provision.isPending}
            >
              {provision.isPending ? (
                <Spinner size={18} />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {provision.isPending
                ? t("Creando organización…")
                : t("Crear e invitar")}
            </button>
          </div>
        </form>

        <ProvisioningHistory />
      </div>
    </div>
  );
}

function ProvisioningHistory() {
  const { translate: t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrganizationProvisioningStatus | "">("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const provisioning = usePlatformOrganizationProvisioning({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const retry = useRetryPlatformOrganizationProvisioning();

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {t("Historial de incorporación")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Consultá el estado y reintentá solicitudes fallidas.")}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-border p-2 hover:bg-muted"
            aria-label={t("Actualizar")}
            disabled={provisioning.isFetching}
            onClick={() => void provisioning.refetch()}
          >
            <RefreshCw
              className={`h-4 w-4 ${provisioning.isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <input
            className="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("Buscar organización, propietario o correo")}
          />
          <select
            className="text"
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as OrganizationProvisioningStatus | "",
              );
              setPage(1);
            }}
          >
            <option value="">{t("Todos los estados")}</option>
            <option value="pending_invitation">
              {t("Enviando invitaciones")}
            </option>
            <option value="completed">{t("Completada")}</option>
            <option value="failed">{t("Fallida")}</option>
          </select>
        </div>
      </div>

      {provisioning.isPending ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : provisioning.isError ? (
        <div className="m-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
          {t("No se pudo cargar el historial de incorporación.")}
        </div>
      ) : (provisioning.data?.rows.length || 0) === 0 ? (
        <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {t("Todavía no hay solicitudes de incorporación.")}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {provisioning.data?.rows.map((item) => (
            <article key={item.id} className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.organization_name}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.owner_name} · {item.owner_email}
                  </p>
                </div>
                <ProvisioningStatus status={item.status} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>{formatDate(item.updated_at)}</span>
                <span>
                  {t("Intentos")}: {item.attempt_count}
                </span>
              </div>
              {item.last_error && (
                <p className="rounded-lg bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
                  {item.last_error}
                </p>
              )}
              {item.status === "failed" && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  disabled={retry.isPending}
                  onClick={() =>
                    retry.mutate(item.id, {
                      onSuccess: () =>
                        toast.success(t("Solicitud reintentada correctamente")),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("Reintentar")}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="border-t border-border p-4">
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={provisioning.data?.total || 0}
          disabled={provisioning.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </div>
    </section>
  );
}

function FormSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-lg bg-primary/10 p-2 text-primary [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : undefined}>
      <span className="text-xs font-medium">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && (
        <span className="mt-1 block text-[11px] text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

function ProvisioningStatus({ status }: { status: string }) {
  const { translate: t } = useTranslation();
  const label =
    status === "completed"
      ? t("Completada")
      : status === "failed"
        ? t("Fallida")
        : t("Enviando invitaciones");
  const tone =
    status === "completed"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "failed"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
