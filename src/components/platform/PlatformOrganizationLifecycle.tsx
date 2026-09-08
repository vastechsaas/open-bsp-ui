import { useState } from "react";
import type { ReactNode } from "react";
import { Select, message as toast } from "antd";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import Spinner from "@/components/Spinner";
import { useTranslation } from "@/hooks/useTranslation";
import {
  type PlatformOrganizationLifecycle,
  usePlatformArchiveOrganization,
  usePlatformOrganizationLifecycle,
  usePlatformPurgeOrganization,
  usePlatformRestoreOrganization,
} from "@/queries/usePlatformAdmin";

type Action =
  | { type: "archive"; organization: PlatformOrganizationLifecycle }
  | { type: "restore"; organization: PlatformOrganizationLifecycle }
  | { type: "purge"; organization: PlatformOrganizationLifecycle }
  | null;

export default function PlatformOrganizationLifecycleScreen() {
  const { translate: t } = useTranslation();
  const [status, setStatus] = useState<"active" | "archived">("archived");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [confirmedName, setConfirmedName] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const lifecycle = usePlatformOrganizationLifecycle({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    status,
  });
  const archive = usePlatformArchiveOrganization();
  const restore = usePlatformRestoreOrganization();
  const purge = usePlatformPurgeOrganization();
  const selected = action?.organization;
  const requiresName = action?.type === "archive" || action?.type === "purge";
  const valid =
    !!selected &&
    reason.trim().length > 0 &&
    (!requiresName || confirmedName === selected.organization_name) &&
    (action?.type !== "purge" || password.length > 0);
  const saving = archive.isPending || restore.isPending || purge.isPending;

  const openAction = (next: NonNullable<Action>) => {
    setConfirmedName("");
    setReason("");
    setPassword("");
    setAction(next);
  };

  const submit = () => {
    if (!action || !selected || !valid) return;
    const options = {
      onSuccess: () => {
        toast.success(t("Estado de la organización actualizado"));
        setAction(null);
      },
      onError: (error: Error) => toast.error(error.message),
    };
    if (action.type === "archive") {
      archive.mutate(
        { id: selected.organization_id, name: confirmedName, reason },
        options,
      );
    } else if (action.type === "restore") {
      restore.mutate({ id: selected.organization_id, reason }, options);
    } else {
      purge.mutate(
        {
          id: selected.organization_id,
          name: confirmedName,
          password,
          reason,
        },
        options,
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-7">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight">
          {t("Ciclo de vida de organizaciones")}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t(
            "Archivá, restaurá o eliminá definitivamente tenants con protección de 30 días.",
          )}
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={status}
          onChange={setStatus}
          className="w-full sm:w-48"
          options={[
            { value: "archived", label: t("Archivadas") },
            { value: "active", label: t("Activas") },
          ]}
        />
        <input
          className="text w-full sm:max-w-md"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Buscar organización")}
        />
      </div>

      {lifecycle.isPending ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : lifecycle.isError ? (
        <div className="rounded-xl border border-destructive/30 p-5 text-destructive">
          {t("No se pudo cargar el ciclo de vida de organizaciones.")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("Organización")}</th>
                <th className="px-4 py-3">{t("Estado")}</th>
                <th className="px-4 py-3">{t("Archivada")}</th>
                <th className="px-4 py-3">{t("Elegible para eliminar")}</th>
                <th className="px-4 py-3 text-right">{t("Acciones")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(lifecycle.data?.rows || []).map((organization) => {
                const purgeEligible =
                  organization.purge_eligible_at != null &&
                  new Date(organization.purge_eligible_at).getTime() <=
                    Date.now();
                return (
                  <tr key={organization.organization_id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {organization.organization_name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {organization.organization_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {organization.lifecycle_status}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(organization.archived_at)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(organization.purge_eligible_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {organization.lifecycle_status === "active" ? (
                          <ActionButton
                            onClick={() =>
                              openAction({ type: "archive", organization })
                            }
                          >
                            {t("Archivar")}
                          </ActionButton>
                        ) : (
                          <>
                            <ActionButton
                              onClick={() =>
                                openAction({ type: "restore", organization })
                              }
                            >
                              {t("Restaurar")}
                            </ActionButton>
                            <ActionButton
                              danger
                              disabled={!purgeEligible}
                              onClick={() =>
                                openAction({ type: "purge", organization })
                              }
                            >
                              {t("Eliminar definitivamente")}
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="organization-lifecycle-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className={`rounded-lg p-2 ${
                  action.type === "restore"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {action.type === "restore" ? (
                  <RotateCcw className="h-5 w-5" aria-hidden />
                ) : (
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                )}
              </span>
              <div>
                <h3
                  id="organization-lifecycle-dialog-title"
                  className="text-lg font-semibold"
                >
                  {action.type === "archive"
                    ? t("Archivar organización")
                    : action.type === "restore"
                      ? t("Restaurar organización")
                      : t("Eliminar organización definitivamente")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected?.organization_name}
                </p>
              </div>
              <button
                type="button"
                className="ml-auto rounded-lg p-1.5 hover:bg-muted"
                onClick={() => setAction(null)}
                aria-label={t("Cerrar")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {requiresName && (
              <label className="mt-5 block text-sm font-medium">
                {t("Escribí el nombre exacto")}
                <input
                  autoFocus
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                  value={confirmedName}
                  onChange={(event) => setConfirmedName(event.target.value)}
                />
              </label>
            )}
            {action.type === "purge" && (
              <label className="mt-5 block text-sm font-medium">
                {t("Tu contraseña")}
                <input
                  type="password"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
            <label className="mt-5 block text-sm font-medium">
              {t("Motivo")}
              <textarea
                autoFocus={!requiresName}
                className="mt-2 min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                disabled={saving}
                onClick={() => setAction(null)}
              >
                {t("Cancelar")}
              </button>
              <button
                type="submit"
                className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                  action.type === "restore"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
                disabled={saving || !valid}
              >
                {saving
                  ? t("Guardando…")
                  : action.type === "purge"
                    ? t("Eliminar definitivamente")
                    : t("Confirmar")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  danger = false,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 font-medium disabled:opacity-35 ${
        danger
          ? "border-destructive/40 text-destructive"
          : "border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
