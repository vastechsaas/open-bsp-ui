import { useState } from "react";
import type { ReactNode } from "react";
import { Modal, Select, message as toast } from "antd";
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

      <Modal
        open={!!action}
        title={
          action?.type === "archive"
            ? t("Archivar organización")
            : action?.type === "restore"
              ? t("Restaurar organización")
              : t("Eliminar organización definitivamente")
        }
        okText={
          action?.type === "purge"
            ? t("Eliminar definitivamente")
            : t("Confirmar")
        }
        okButtonProps={{ danger: action?.type !== "restore", disabled: !valid }}
        confirmLoading={
          archive.isPending || restore.isPending || purge.isPending
        }
        onCancel={() => setAction(null)}
        onOk={submit}
      >
        <p className="mb-4 text-[13px] text-muted-foreground">
          {selected?.organization_name}
        </p>
        {requiresName && (
          <label className="mb-4 block">
            <span className="label">{t("Escribí el nombre exacto")}</span>
            <input
              className="text w-full"
              value={confirmedName}
              onChange={(event) => setConfirmedName(event.target.value)}
            />
          </label>
        )}
        {action?.type === "purge" && (
          <label className="mb-4 block">
            <span className="label">{t("Tu contraseña")}</span>
            <input
              type="password"
              className="text w-full"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        )}
        <label className="block">
          <span className="label">{t("Motivo")}</span>
          <textarea
            className="text min-h-24 w-full"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </Modal>
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
