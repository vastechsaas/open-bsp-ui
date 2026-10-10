import { useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import { isVisibleMemberRole } from "@/utils/UiVisibility";
import {
  usePlatformModulePermissions,
  useSavePlatformModulePermissions,
} from "@/queries/useModulePermissions";
import {
  changeModulePermission,
  type ModuleMatrix,
} from "@/utils/ModulePermissionUtils";

export default function PlatformModulePermissions({
  organizationId,
}: {
  organizationId: string;
}) {
  const { translate: t } = useTranslation();
  const query = usePlatformModulePermissions(organizationId);
  if (query.isPending) return <p className="p-6">{t("Cargando permisos…")}</p>;
  if (query.isError || !query.data)
    return (
      <div className="p-6">
        <p>{t("No se pudieron cargar los permisos.")}</p>
        <button onClick={() => void query.refetch()}>{t("Reintentar")}</button>
      </div>
    );
  return (
    <MatrixForm
      key={`${organizationId}:${query.data.revision}`}
      organizationId={organizationId}
      initial={query.data}
      onReload={() => void query.refetch()}
    />
  );
}

function MatrixForm({
  organizationId,
  initial,
  onReload,
}: {
  organizationId: string;
  initial: ModuleMatrix;
  onReload: () => void;
}) {
  const { translate: t } = useTranslation();
  const [rows, setRows] = useState(initial.permissions);
  const visibleRows = rows.filter((row) => isVisibleMemberRole(row.role));
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const save = useSavePlatformModulePermissions(organizationId);
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial.permissions);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: dirty,
    disabled: !dirty,
    withResolver: true,
  });
  const conflict = (save.error as { code?: string } | null)?.code === "40001";
  const labels = {
    owner: t("Propietario"),
    admin: t("Administrador"),
    supervisor: t("Supervisor"),
    member: t("Miembro"),
    agent: t("Agente"),
  };
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <h2 className="text-lg font-semibold">{t("Permisos de módulos")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Definí quién puede ver o administrar el constructor de chatbots en esta organización.",
          )}
        </p>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <h3 className="border-b border-border p-4 font-medium">
          {t("Constructor de chatbots")}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-4">{t("Rol")}</th>
              <th className="p-4 text-center">{t("Ver")}</th>
              <th className="p-4 text-center">{t("Administrar")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.role}
                className="border-b border-border last:border-0"
              >
                <th scope="row" className="p-4 text-left font-normal">
                  {labels[row.role]}
                </th>
                {(["can_view", "can_manage"] as const).map((permission) => (
                  <td key={permission} className="p-4 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={row[permission]}
                      disabled={save.isPending || conflict}
                      aria-label={`${labels[row.role]}: ${permission === "can_view" ? t("Ver") : t("Administrar")}`}
                      onChange={(event) => {
                        setRows((current) =>
                          changeModulePermission(
                            current,
                            row.role,
                            permission,
                            event.target.checked,
                          ),
                        );
                        setRequestId(crypto.randomUUID());
                        save.reset();
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          "Administrar requiere Ver. Los cambios no detienen los chatbots activos.",
        )}
      </p>
      {save.isError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
        >
          {conflict
            ? t("Los permisos cambiaron. Recargá antes de guardar.")
            : t("No se pudieron guardar los permisos. Reintentá.")}
          {conflict && (
            <button className="ml-3 underline" onClick={onReload}>
              {t("Recargar")}
            </button>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!dirty || save.isPending || conflict}
          onClick={() =>
            save.mutate({
              permissions: rows,
              revision: initial.revision,
              requestId,
            })
          }
        >
          {save.isPending
            ? t("Guardando…")
            : save.isError
              ? t("Reintentar")
              : t("Guardar cambios")}
        </button>
      </div>
      {blocker.status === "blocked" && (
        <div
          role="alertdialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="max-w-md rounded-xl border bg-background p-6">
            <p>{t("Tenés cambios sin guardar. ¿Querés salir?")}</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => blocker.reset()}>{t("Cancelar")}</button>
              <button onClick={() => blocker.proceed()}>
                {t("Descartar cambios")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
